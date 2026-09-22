-- ============================================================
-- La Femme — Correção estrutural: data explícita de finalização
--
-- Adiciona public.pedidos.finalizado_em (timestamptz, nullable) para
-- registrar de forma explícita e confiável QUANDO o pedido foi
-- finalizado, e passa a preenchê-lo em admin_finalizar_pedido.
--
-- Motivação (auditoria): pedidos não possuíam timestamp de finalização;
-- apenas created_at/updated_at (genéricos). Usar updated_at como data
-- de venda seria um acoplamento implícito e frágil.
--
-- ESCOPO: SOMENTE a coluna, o backfill de legado e o ajuste mínimo da
-- RPC de finalização. NÃO altera tabelas, triggers, estoque, itens,
-- preços, checkout, criação de pedido nem outras RPCs.
--
-- IMPORTANTE (backfill de legado): para pedidos JÁ finalizados antes
-- desta coluna, `updated_at` é usado como APROXIMAÇÃO da data de
-- finalização. Isso é necessário porque o histórico anterior não
-- armazenava timestamp específico de finalização. Nenhum outro status
-- é tocado.
--
-- Constraint: NÃO adicionada nesta fase. A coerência
-- (status='finalizado' -> finalizado_em preenchido) é garantida pela
-- RPC. Uma constraint poderia bloquear fluxos/status legados; optou-se
-- por consistência via RPC, conforme decisão da fase.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) Coluna finalizado_em
-- ============================================================
alter table public.pedidos
  add column if not exists finalizado_em timestamptz null;

-- ============================================================
-- 2) Backfill de pedidos legados já finalizados
-- ============================================================
-- Aproximação histórica: usa updated_at apenas para pedidos finalizados
-- que ainda não possuem finalizado_em. Idempotente.
update public.pedidos
   set finalizado_em = updated_at
 where status = 'finalizado'
   and finalizado_em is null;

-- ============================================================
-- 3) RPC — admin_finalizar_pedido (ajuste mínimo)
-- ============================================================
-- Lógica PRESERVADA integralmente: guarda admin/service_role, lock do
-- pedido (FOR UPDATE), rejeição de inexistente/cancelado/já finalizado,
-- exigência de 'aguardando_atendimento', lock das variantes (FOR UPDATE),
-- validação de estoque de TODAS antes de qualquer baixa, baixa única de
-- estoque e retorno. Única mudança funcional: gravar finalizado_em na
-- mesma transação, usando um único timestamp (v_agora) para
-- finalizado_em e updated_at.
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
-- 4) Permissões (padrão das RPCs admin existentes)
-- ============================================================
revoke all on function public.admin_finalizar_pedido(bigint) from public;
revoke execute on function public.admin_finalizar_pedido(bigint) from anon;
grant execute on function public.admin_finalizar_pedido(bigint) to authenticated, service_role;
