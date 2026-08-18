-- ============================================================
-- La Femme — Fase 8B: gestão administrativa de pedidos
--
-- Adiciona o status 'finalizado' ao CHECK de pedidos (preservando
-- todos os valores existentes) e cria 4 RPCs SECURITY DEFINER:
--   GET   -> public.admin_listar_pedidos(p_filtros jsonb)
--   GET   -> public.admin_obter_pedido(p_id bigint)
--   PATCH -> public.admin_atualizar_status_pedido(p_id bigint, p_status text)
--   PATCH -> public.admin_finalizar_pedido(p_id bigint)
--
-- Arquitetura (igual às RPCs admin de produtos):
--   Frontend -> Server API -> requireAdmin() -> Service Role ->
--   RPC SECURITY DEFINER -> Banco.
--
-- Autorização em dupla camada:
--   1) requireAdmin() no endpoint;
--   2) dentro da RPC: public.is_admin() (baseada em auth.uid()) OU
--      auth.role() = 'service_role' (chave do servidor).
--   GRANTs: EXECUTE apenas para authenticated e service_role;
--   anon/PUBLIC revogado -> RPCs não ficam abertas.
--
-- Concorrência:
--   - admin_finalizar_pedido trava o pedido e as variantes com
--     SELECT ... FOR UPDATE, serializando finalizações simultâneas
--     e impedindo duas vendas consumirem o mesmo estoque.
--   - Transações PL/pgSQL têm rollback implícito em EXCEPTION não
--     tratada: qualquer falha desfaz todas as baixas de estoque.
--
-- Estoque NÃO é baixado na criação do pedido; apenas nesta RPC de
-- finalização (admin confirma a venda). Nunca há baixa parcial.
--
-- Histórico preservado: pedido, itens_pedido e snapshots não são
-- apagados; a finalização apenas muda status e baixa o estoque.
--
-- IMPORTANTE: NÃO executar automaticamente. Revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) STATUS — adicionar 'finalizado' preservando estados antigos
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
      'em_atendimento',
      'aguardando_pagamento',
      'pago',
      'enviado',
      'entregue',
      'cancelado',
      'finalizado'
    )
  );

-- ============================================================
-- 2) RPC — admin_listar_pedidos
-- ============================================================
-- Filtros opcionais (jsonb): status, busca (id/nome/telefone),
-- dataInicio/dataFim (YYYY-MM-DD). Ordena por created_at desc.
create or replace function public.admin_listar_pedidos(p_filtros jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_busca text;
  v_data_inicio date;
  v_data_fim date;
  v_pedidos jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_status := nullif(p_filtros->>'status', '');
  v_busca := nullif(p_filtros->>'busca', '');
  if p_filtros->>'dataInicio' is not null and p_filtros->>'dataInicio' <> '' then
    v_data_inicio := (p_filtros->>'dataInicio')::date;
  end if;
  if p_filtros->>'dataFim' is not null and p_filtros->>'dataFim' <> '' then
    v_data_fim := (p_filtros->>'dataFim')::date;
  end if;

  select coalesce(jsonb_agg(t order by t.created_at desc), '[]'::jsonb)
    into v_pedidos
    from (
      select
        p.id,
        p.cliente_id,
        p.status,
        p.subtotal,
        p.frete,
        p.total,
        p.nome_cliente,
        p.telefone_cliente,
        p.observacoes,
        p.created_at,
        p.updated_at,
        (select count(*)::int from public.itens_pedido ip where ip.pedido_id = p.id) as quantidade_itens
      from public.pedidos p
      where (v_status is null or p.status = v_status)
        and (
          v_busca is null
          or p.id::text = v_busca
          or lower(p.nome_cliente) like '%' || lower(v_busca) || '%'
          or p.telefone_cliente like '%' || v_busca || '%'
        )
        and (v_data_inicio is null or p.created_at::date >= v_data_inicio)
        and (v_data_fim is null or p.created_at::date <= v_data_fim)
    ) t;

  return jsonb_build_object('ok', true, 'pedidos', v_pedidos);
end;
$$;

-- ============================================================
-- 3) RPC — admin_obter_pedido
-- ============================================================
create or replace function public.admin_obter_pedido(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido record;
  v_itens jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select id, cliente_id, status, subtotal, frete, total,
         nome_cliente, telefone_cliente, observacoes, created_at, updated_at
    into v_pedido
    from public.pedidos
   where id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Pedido não encontrado.');
  end if;

  select coalesce(jsonb_agg(t order by t.id), '[]'::jsonb)
    into v_itens
    from (
      select id, pedido_id, produto_variante_id, nome_produto, cor, tamanho,
             sku, foto, quantidade, valor_unitario, subtotal
        from public.itens_pedido
       where pedido_id = p_id
    ) t;

  return jsonb_build_object(
    'ok', true,
    'pedido', jsonb_build_object(
      'id', v_pedido.id,
      'cliente_id', v_pedido.cliente_id,
      'status', v_pedido.status,
      'subtotal', v_pedido.subtotal,
      'frete', v_pedido.frete,
      'total', v_pedido.total,
      'nome_cliente', v_pedido.nome_cliente,
      'telefone_cliente', v_pedido.telefone_cliente,
      'observacoes', v_pedido.observacoes,
      'created_at', v_pedido.created_at,
      'updated_at', v_pedido.updated_at
    ),
    'itens', v_itens
  );
end;
$$;

-- ============================================================
-- 4) RPC — admin_atualizar_status_pedido
-- ============================================================
-- Transições permitidas (validadas no banco, nunca arbitrárias):
--   aguardando_atendimento -> em_atendimento | cancelado
--   em_atendimento         -> cancelado
--   finalizado/cancelado   -> nenhuma transição
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

  if not (
    (v_status_atual = 'aguardando_atendimento' and p_status in ('em_atendimento', 'cancelado'))
    or (v_status_atual = 'em_atendimento' and p_status = 'cancelado')
  ) then
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
-- 5) RPC — admin_finalizar_pedido
-- ============================================================
-- Confirmação transacional de venda com baixa de estoque:
--   1. valida admin;
--   2. lock do pedido (FOR UPDATE);
--   3. rejeita inexistente / cancelado / já finalizado;
--   4. lê os itens do pedido (snapshots);
--   5. lock das variantes envolvidas (FOR UPDATE);
--   6. valida estoque de TODAS as variantes ANTES de qualquer baixa;
--   7. se alguma insuficiente -> ESTOQUE_INSUFICIENTE, NADA muda;
--   8. baixa a quantidade de todas as variantes;
--   9. status -> finalizado + updated_at.
create or replace function public.admin_finalizar_pedido(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status_atual text;
  v_item record;
  v_variante record;
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

  if v_status_atual <> 'em_atendimento' then
    return jsonb_build_object('ok', false, 'codigo', 'TRANSICAO_INVALIDA', 'erro', 'Apenas pedidos em atendimento podem ser finalizados.');
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
-- 6) Permissões (padrão das RPCs admin existentes)
-- ============================================================
revoke all on function public.admin_listar_pedidos(jsonb) from public;
revoke all on function public.admin_obter_pedido(bigint) from public;
revoke all on function public.admin_atualizar_status_pedido(bigint, text) from public;
revoke all on function public.admin_finalizar_pedido(bigint) from public;

revoke execute on function public.admin_listar_pedidos(jsonb) from anon;
revoke execute on function public.admin_obter_pedido(bigint) from anon;
revoke execute on function public.admin_atualizar_status_pedido(bigint, text) from anon;
revoke execute on function public.admin_finalizar_pedido(bigint) from anon;

grant execute on function public.admin_listar_pedidos(jsonb) to authenticated, service_role;
grant execute on function public.admin_obter_pedido(bigint) to authenticated, service_role;
grant execute on function public.admin_atualizar_status_pedido(bigint, text) to authenticated, service_role;
grant execute on function public.admin_finalizar_pedido(bigint) to authenticated, service_role;