-- ============================================================
-- La Femme — função transacional: criar pedido
-- Executa em UMA transação (validação + INSERT pedidos + itens_pedido)
-- SECURITY DEFINER => roda como owner (postgres), ignora RLS.
-- Sem baixar estoque; bloqueia linhas com FOR UPDATE.
-- ============================================================

create or replace function public.criar_pedido(
  p_itens jsonb,
  p_nome text,
  p_telefone text,
  p_observacoes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_variante_id bigint;
  v_quantidade integer;
  v_ids bigint[] := '{}'::bigint[];
  v_erros jsonb := '[]'::jsonb;
  v_registros record;
  v_pedido_id bigint;
  v_subtotal numeric(10,2) := 0;
  v_frete numeric(10,2) := 0;
  v_total numeric(10,2) := 0;
begin
  -- Guarda: payload de itens precisa ser array
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' then
    return jsonb_build_object('ok', false, 'erros', jsonb_build_array(
      jsonb_build_object('varianteId', null, 'motivo', 'QUANTIDADE_INVALIDA')
    ));
  end if;

  -- 1) Parse e validação de forma (defesa extra, além do endpoint)
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_variante_id := (v_item->>'varianteId')::bigint;
    v_quantidade := (v_item->>'quantidade')::integer;

    if coalesce(jsonb_typeof(v_item->'varianteId'), '') = 'number'
       and coalesce(jsonb_typeof(v_item->'quantidade'), '') = 'number'
       and v_variante_id is not null
       and v_quantidade is not null
       and v_variante_id > 0
       and v_quantidade > 0
    then
      if v_variante_id = any(v_ids) then
        v_erros := v_erros || jsonb_build_object('varianteId', v_variante_id, 'motivo', 'QUANTIDADE_INVALIDA');
      else
        v_ids := v_ids || v_variante_id;
      end if;
    else
      v_erros := v_erros || jsonb_build_object(
        'varianteId', v_item->'varianteId',
        'motivo', 'QUANTIDADE_INVALIDA'
      );
    end if;
  end loop;

  if v_erros <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'erros', v_erros);
  end if;

  -- 2) Bloqueia as variantes (FOR UPDATE) e carrega os dados ATUAIS com snapshot
  create temp table _var_tmp on commit drop as
  select
    pv.id,
    pv.produto_id,
    p.nome as nome_produto,
    pv.cor,
    pv.tamanho,
    pv.sku,
    pv.foto,
    pv.valor,
    pv.quantidade,
    pv.ativo
  from public.produto_variante pv
  join public.produtos p on p.id = pv.produto_id
  where pv.id = any(v_ids)
  for update of pv;

  -- 3) Valida existência, ativo e estoque
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_variante_id := (v_item->>'varianteId')::bigint;
    v_quantidade := (v_item->>'quantidade')::integer;

    select * into v_registros from _var_tmp where id = v_variante_id;

    if not found then
      v_erros := v_erros || jsonb_build_object('varianteId', v_variante_id, 'motivo', 'VARIANTE_NAO_ENCONTRADA');
      continue;
    end if;

    if not v_registros.ativo then
      v_erros := v_erros || jsonb_build_object('varianteId', v_variante_id, 'motivo', 'VARIANTE_INATIVA');
      continue;
    end if;

    if v_quantidade > v_registros.quantidade then
      v_erros := v_erros || jsonb_build_object(
        'varianteId', v_variante_id,
        'motivo', 'ESTOQUE_INSUFICIENTE',
        'disponivel', v_registros.quantidade,
        'solicitado', v_quantidade
      );
      continue;
    end if;
  end loop;

  if v_erros <> '[]'::jsonb then
    return jsonb_build_object('ok', false, 'erros', v_erros);
  end if;

  -- 4) Cálcula subtotais no servidor (preço do banco, snapshot)
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_variante_id := (v_item->>'varianteId')::bigint;
    v_quantidade := (v_item->>'quantidade')::integer;
    select * into v_registros from _var_tmp where id = v_variante_id;
    v_subtotal := v_subtotal + round((v_registros.valor * v_quantidade)::numeric, 2);
  end loop;
  v_total := v_subtotal + v_frete;

  -- 5) Cria o pedido (uma transação só)
  insert into public.pedidos (
    cliente_id, status, subtotal, frete, total,
    nome_cliente, telefone_cliente, observacoes
  )
  values (
    null, 'aguardando_atendimento', v_subtotal, v_frete, v_total,
    p_nome, p_telefone, p_observacoes
  )
  returning id into v_pedido_id;

  -- 6) Cria os itens (snapshot dos dados atuais)
  for v_item in select value from jsonb_array_elements(p_itens) loop
    v_variante_id := (v_item->>'varianteId')::bigint;
    v_quantidade := (v_item->>'quantidade')::integer;
    select * into v_registros from _var_tmp where id = v_variante_id;

    insert into public.itens_pedido (
      pedido_id, produto_variante_id, nome_produto, cor, tamanho, sku, foto,
      quantidade, valor_unitario, subtotal
    )
    values (
      v_pedido_id, v_variante_id, v_registros.nome_produto, v_registros.cor,
      v_registros.tamanho, v_registros.sku, v_registros.foto,
      v_quantidade, v_registros.valor,
      round((v_registros.valor * v_quantidade)::numeric, 2)
    );
  end loop;

  return jsonb_build_object(
    'ok', true,
    'pedido', jsonb_build_object(
      'id', v_pedido_id,
      'status', 'aguardando_atendimento',
      'subtotal', v_subtotal,
      'frete', v_frete,
      'total', v_total,
      'nome', p_nome,
      'telefone', p_telefone
    )
  );
end;
$$;

-- Permissões: anon pode executar (visitante anônimo), sem expor tables
grant execute on function public.criar_pedido(jsonb, text, text, text) to anon, authenticated, service_role;