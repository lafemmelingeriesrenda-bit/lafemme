-- ============================================================
-- La Femme — Simplificação do fluxo de status dos pedidos
--
-- Remove o status 'em_atendimento'. O fluxo passa a ser direto:
--   aguardando_atendimento -> finalizado
--   aguardando_atendimento -> cancelado
--
-- Escopo (apenas a remoção de 'em_atendimento'):
--   1) converte eventuais pedidos em 'em_atendimento' para
--      'aguardando_atendimento' ANTES de ajustar a constraint;
--   2) recria a constraint pedidos_status_check sem 'em_atendimento',
--      preservando todos os demais status;
--   3) atualiza public.admin_atualizar_status_pedido;
--   4) atualiza public.admin_finalizar_pedido.
--
-- Preserva integralmente:
--   * baixa de estoque apenas em admin_finalizar_pedido;
--   * lock do pedido e das variantes (FOR UPDATE);
--   * validação de estoque antes de qualquer baixa;
--   * proteção contra finalização duplicada;
--   * cancelamento.
--
-- Idempotente. IMPORTANTE: NÃO executar automaticamente. Revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) Converte eventuais registros em 'em_atendimento'
-- ============================================================
update public.pedidos
   set status = 'aguardando_atendimento',
       updated_at = now()
 where status = 'em_atendimento';

-- ============================================================
-- 2) Recria a constraint de status sem 'em_atendimento'
-- ============================================================
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'pedidos_status_check') then
    alter table public.pedidos drop constraint pedidos_status_check;
  end if;
end $$;

alter table public.pedidos
  add constraint pedidos_status_check check (
    status in (
      'aguardando_atendimento',
      'aguardando_pagamento',
      'pago',
      'enviado',
      'entregue',
      'cancelado',
      'finalizado'
    )
  );

-- ============================================================
-- 3) RPC — admin_atualizar_status_pedido
-- ============================================================
-- Transições permitidas (validadas no banco, nunca arbitrárias):
--   aguardando_atendimento -> cancelado
--   finalizado/cancelado   -> nenhuma transição
-- A finalização NÃO passa por aqui: usa admin_finalizar_pedido.
create or replace function public.admin_atualizar_status_pedido(p_id bigint, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status_atual text;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select status into v_status_atual
    from public.pedidos
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Pedido não encontrado.');
  end if;

  if v_status_atual = 'finalizado' then
    return jsonb_build_object('ok', false, 'codigo', 'PEDIDO_JA_FINALIZADO', 'erro', 'Pedido já finalizado.');
  end if;

  if v_status_atual = 'cancelado' then
    return jsonb_build_object('ok', false, 'codigo', 'PEDIDO_CANCELADO', 'erro', 'Pedido já cancelado.');
  end if;

  if not (v_status_atual = 'aguardando_atendimento' and p_status = 'cancelado') then
    return jsonb_build_object('ok', false, 'codigo', 'TRANSICAO_INVALIDA', 'erro', 'Transição de status inválida.');
  end if;

  update public.pedidos
     set status = p_status,
         updated_at = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'pedido', jsonb_build_object(
    'id', p_id,
    'status', p_status,
    'updated_at', now()
  ));
end;
$$;

-- ============================================================
-- 4) RPC — admin_finalizar_pedido
-- ============================================================
-- Confirmação transacional de venda com baixa de estoque:
--   1. valida admin;
--   2. lock do pedido (FOR UPDATE);
--   3. rejeita inexistente / cancelado / já finalizado;
--   4. exige status 'aguardando_atendimento';
--   5. lê os itens do pedido (snapshots);
--   6. lock das variantes envolvidas (FOR UPDATE);
--   7. valida estoque de TODAS as variantes ANTES de qualquer baixa;
--   8. se alguma insuficiente -> ESTOQUE_INSUFICIENTE, NADA muda;
--   9. baixa a quantidade de todas as variantes;
--  10. status -> finalizado + updated_at.
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

  -- Baixa de estoque (todas as variantes já validadas; sem baixa parcial).
  for v_item in
    select ip.produto_variante_id, ip.quantidade
      from public.itens_pedido ip
     where ip.pedido_id = p_id
  loop
    update public.produto_variante
       set quantidade = quantidade - v_item.quantidade
     where id = v_item.produto_variante_id;
  end loop;

  update public.pedidos
     set status = 'finalizado',
         updated_at = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'pedido', jsonb_build_object(
    'id', p_id,
    'status', 'finalizado',
    'updated_at', now()
  ));
end;
$$;

-- ============================================================
-- 5) Permissões (padrão das RPCs admin existentes)
-- ============================================================
revoke all on function public.admin_atualizar_status_pedido(bigint, text) from public;
revoke all on function public.admin_finalizar_pedido(bigint) from public;

revoke execute on function public.admin_atualizar_status_pedido(bigint, text) from anon;
revoke execute on function public.admin_finalizar_pedido(bigint) from anon;

grant execute on function public.admin_atualizar_status_pedido(bigint, text) to authenticated, service_role;
grant execute on function public.admin_finalizar_pedido(bigint) to authenticated, service_role;
