-- ============================================================
-- La Femme — Movimentos de saída de estoque por venda
--
-- Ao finalizar um pedido, além da baixa atual de produto_variante,
-- registra um movimento `saida_venda` por item em movimentos_estoque,
-- tudo na mesma transação.
--
-- Mudanças:
--   * coluna movimentos_estoque.item_pedido_id (FK itens_pedido, sem cascade);
--   * índice único parcial (item_pedido_id) WHERE tipo='saida_venda'
--     -> idempotência: cada item do pedido gera no máximo uma saída;
--   * redefinição MÍNIMA de admin_finalizar_pedido para gravar os
--     movimentos logo após cada baixa.
--
-- NÃO altera a lógica de finalização (locks, validações, ordem de baixa,
-- finalizado_em). NÃO altera admin_confirmar_recebimento_compra.
-- NÃO implementa custo médio/CMV.
--
-- LIMITAÇÃO (documentada): ajustes manuais de produto_variante.quantidade
-- ainda não geram movimento; logo, a soma dos movimentos NÃO deve ser
-- usada para reconstruir o estoque histórico com 100% de confiança.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) Coluna item_pedido_id
-- ============================================================
alter table public.movimentos_estoque
  add column if not exists item_pedido_id bigint null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movimentos_estoque_item_pedido_id_fkey') then
    alter table public.movimentos_estoque
      add constraint movimentos_estoque_item_pedido_id_fkey
      foreign key (item_pedido_id) references public.itens_pedido (id);
  end if;
end $$;

-- Idempotência: no máximo UMA saida_venda por item_pedido.
create unique index if not exists movimentos_estoque_saida_item_uidx
  on public.movimentos_estoque (item_pedido_id)
  where tipo = 'saida_venda';

-- ============================================================
-- 2) RPC — admin_finalizar_pedido (alteração mínima)
-- ============================================================
-- Preserva integralmente: guarda admin/service_role, lock do pedido
-- (FOR UPDATE), rejeição de inexistente/cancelado/já finalizado,
-- exigência de 'aguardando_atendimento', lock das variantes, validação
-- de estoque de TODAS antes de qualquer baixa, baixa única, finalizado_em
-- e updated_at (v_agora) e retorno. Única adição funcional: registrar
-- um movimento saida_venda por item, imediatamente após a baixa.
create or replace function public.admin_finalizar_pedido(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status_atual text;
  v_item record;
  v_erros jsonb := '[]'::jsonb;
  v_quantidade_atual integer;
  v_agora timestamptz := now();
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  -- Lock do pedido: serializa finalizações simultâneas do MESMO pedido.
  select status into v_status_atual
    from public.pedidos
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Pedido não encontrado.');
  end if;

  if v_status_atual = 'cancelado' then
    return jsonb_build_object('ok', false, 'codigo', 'PEDIDO_CANCELADO', 'erro', 'Pedido cancelado não pode ser finalizado.');
  end if;

  if v_status_atual = 'finalizado' then
    return jsonb_build_object('ok', false, 'codigo', 'PEDIDO_JA_FINALIZADO', 'erro', 'Pedido já finalizado.');
  end if;

  if v_status_atual <> 'aguardando_atendimento' then
    return jsonb_build_object('ok', false, 'codigo', 'TRANSICAO_INVALIDA', 'erro', 'Apenas pedidos aguardando atendimento podem ser finalizados.');
  end if;

  -- Lock das variantes + validação de estoque (TODAS antes de qualquer baixa).
  for v_item in
    select ip.produto_variante_id, ip.quantidade, ip.nome_produto
      from public.itens_pedido ip
     where ip.pedido_id = p_id
     order by ip.id
  loop
    v_quantidade_atual := 0;

    select pv.quantidade
      into v_quantidade_atual
      from public.produto_variante pv
     where pv.id = v_item.produto_variante_id
       for update;

    if not found or v_quantidade_atual < v_item.quantidade then
      v_erros := v_erros || jsonb_build_object(
        'varianteId', v_item.produto_variante_id,
        'nomeProduto', v_item.nome_produto,
        'disponivel', coalesce(v_quantidade_atual, 0),
        'solicitado', v_item.quantidade
      );
    end if;
  end loop;

  if v_erros <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'codigo', 'ESTOQUE_INSUFICIENTE', 'erros', v_erros);
  end if;

  -- Baixa de estoque + movimento de saída (por item), na mesma transação.
  -- O bloco garante que uma eventual colisão de idempotência desfaça
  -- TODAS as baixas/movimentos deste lote (rollback ao savepoint).
  begin
    for v_item in
      select ip.id, ip.produto_variante_id, ip.quantidade
        from public.itens_pedido ip
       where ip.pedido_id = p_id
       order by ip.id
    loop
      update public.produto_variante
         set quantidade = quantidade - v_item.quantidade
       where id = v_item.produto_variante_id;

      insert into public.movimentos_estoque (
        produto_variante_id, tipo, quantidade, pedido_id, item_pedido_id, observacao
      )
      values (
        v_item.produto_variante_id,
        'saida_venda',
        v_item.quantidade,
        p_id,
        v_item.id,
        'Saída automática por finalização de pedido'
      );
    end loop;
  exception
    when unique_violation then
      return jsonb_build_object('ok', false, 'codigo', 'SAIDA_ESTOQUE_DUPLICADA', 'erro', 'Já existe saída de estoque para este pedido.');
  end;

  update public.pedidos
     set status = 'finalizado',
         finalizado_em = v_agora,
         updated_at = v_agora
   where id = p_id;

  return jsonb_build_object('ok', true, 'pedido', jsonb_build_object(
    'id', p_id,
    'status', 'finalizado',
    'updated_at', v_agora
  ));
end;
$$;

-- ============================================================
-- 3) Permissões (padrão das RPCs admin existentes)
-- ============================================================
revoke all on function public.admin_finalizar_pedido(bigint) from public;
revoke execute on function public.admin_finalizar_pedido(bigint) from anon;
grant execute on function public.admin_finalizar_pedido(bigint) to authenticated, service_role;
