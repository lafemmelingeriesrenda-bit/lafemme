-- ============================================================
-- La Femme — Compras (Fase 3): CRUD administrativo de compras
--
-- Cria RPCs SECURITY DEFINER + helpers internos para o CRUD de
-- public.compras e public.itens_compra. NÃO cria/alterar tabelas.
--
--   GET   -> public.admin_listar_compras(p_filtros jsonb)
--   GET   -> public.admin_obter_compra(p_id bigint)
--   POST  -> public.admin_criar_compra(p_dados jsonb)
--   PATCH -> public.admin_atualizar_compra(p_id bigint, p_dados jsonb)
--   PATCH -> public.admin_alterar_status_compra(p_id bigint, p_status text)
--
-- Helpers internos (não expostos):
--   public.admin_validar_cabecalho_compra(p_dados jsonb, p_tipo text, p_exigir_fornecedor_ativo boolean)
--   public.admin_validar_itens_compra(p_itens jsonb)
--
-- ESCOPO (deliberadamente SEM estoque):
--   * NÃO altera produto_variante.quantidade;
--   * NÃO cria movimentos_estoque;
--   * NÃO implementa custo médio, CMV, rateio de frete/desconto;
--   * NÃO altera admin_finalizar_pedido nem pedidos/itens_pedido.
--   'recebida' é apenas um estado administrativo.
--
-- Regras financeiras (a RPC é a fonte da verdade):
--   despesa   -> subtotal = valor-base informado; sem itens.
--   mercadoria-> itens >= 1; item.subtotal = quantidade * valor_unitario;
--                subtotal = soma(item.subtotal).
--   total = subtotal + frete - desconto (>= 0).
--
-- Snapshots: quando produto_variante_id é informado, descrição/cor/
-- tamanho são obtidos do banco (produtos.nome + produto_variante),
-- não confiando no frontend. Sem variante, valem os valores enviados.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 0) HELPER — admin_validar_cabecalho_compra
-- ============================================================
-- Normaliza/valida os campos comuns do cabeçalho. Devolve:
--   { ok: true, dados: {...} } | { ok: false, codigo, erro }
create or replace function public.admin_validar_cabecalho_compra(
  p_dados jsonb,
  p_tipo text,
  p_exigir_fornecedor_ativo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fornecedor_id bigint;
  v_categoria text;
  v_descricao text;
  v_data_compra date;
  v_frete numeric(10,2) := 0;
  v_desconto numeric(10,2) := 0;
  v_forma_pagamento text;
  v_status_pagamento text;
  v_vencimento date;
  v_pago_em timestamptz;
  v_observacao text;
  v_comprovante_url text;
begin
  if p_tipo is null or p_tipo not in ('mercadoria', 'despesa') then
    return jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'erro', 'Tipo de compra inválido.');
  end if;

  if jsonb_typeof(p_dados->'fornecedor_id') = 'number' then
    v_fornecedor_id := (p_dados->>'fornecedor_id')::bigint;
  else
    v_fornecedor_id := null;
  end if;

  if v_fornecedor_id is not null then
    if not exists (select 1 from public.fornecedores where id = v_fornecedor_id) then
      return jsonb_build_object('ok', false, 'codigo', 'FORNECEDOR_INEXISTENTE', 'erro', 'Fornecedor informado não encontrado.');
    end if;

    if p_exigir_fornecedor_ativo
       and not exists (select 1 from public.fornecedores where id = v_fornecedor_id and ativo) then
      return jsonb_build_object('ok', false, 'codigo', 'FORNECEDOR_INVALIDO', 'erro', 'Selecione um fornecedor ativo.');
    end if;
  end if;

  if p_tipo = 'despesa' then
    v_categoria := nullif(btrim(p_dados->>'categoria'), '');

    if v_categoria is null
       or v_categoria not in ('embalagem', 'marketing', 'logistica', 'taxas', 'materiais', 'combustivel', 'outros') then
      return jsonb_build_object('ok', false, 'codigo', 'CATEGORIA_INVALIDA', 'erro', 'Categoria de despesa inválida.');
    end if;
  else
    v_categoria := null;
  end if;

  v_descricao := nullif(btrim(regexp_replace(coalesce(p_dados->>'descricao', ''), '\s+', ' ', 'g')), '');

  if v_descricao is not null and char_length(v_descricao) > 300 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Descrição deve ter no máximo 300 caracteres.');
  end if;

  if p_tipo = 'despesa' and v_descricao is null then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Descrição é obrigatória para despesa.');
  end if;

  if p_dados->>'data_compra' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_data_compra := (p_dados->>'data_compra')::date;
  else
    v_data_compra := current_date;
  end if;

  if jsonb_typeof(p_dados->'frete') = 'number' then
    v_frete := (p_dados->>'frete')::numeric(10,2);
  end if;

  if jsonb_typeof(p_dados->'desconto') = 'number' then
    v_desconto := (p_dados->>'desconto')::numeric(10,2);
  end if;

  if v_frete < 0 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Frete não pode ser negativo.');
  end if;

  if v_desconto < 0 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Desconto não pode ser negativo.');
  end if;

  v_forma_pagamento := nullif(btrim(coalesce(p_dados->>'forma_pagamento', '')), '');

  if v_forma_pagamento is not null and char_length(v_forma_pagamento) > 40 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Forma de pagamento deve ter no máximo 40 caracteres.');
  end if;

  v_status_pagamento := coalesce(nullif(btrim(p_dados->>'status_pagamento'), ''), 'pendente');

  if v_status_pagamento not in ('pendente', 'pago') then
    return jsonb_build_object('ok', false, 'codigo', 'PAGAMENTO_INVALIDO', 'erro', 'Status de pagamento inválido.');
  end if;

  if v_status_pagamento = 'pago' then
    if p_dados->>'pago_em' ~ '^\d{4}-\d{2}-\d{2}' then
      v_pago_em := (p_dados->>'pago_em')::timestamptz;
    else
      v_pago_em := now();
    end if;
  else
    v_pago_em := null;
  end if;

  if p_dados->>'vencimento' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_vencimento := (p_dados->>'vencimento')::date;
  else
    v_vencimento := null;
  end if;

  v_observacao := nullif(btrim(coalesce(p_dados->>'observacao', '')), '');

  if v_observacao is not null and char_length(v_observacao) > 1000 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Observação deve ter no máximo 1000 caracteres.');
  end if;

  v_comprovante_url := nullif(btrim(coalesce(p_dados->>'comprovante_url', '')), '');

  if v_comprovante_url is not null and char_length(v_comprovante_url) > 500 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Comprovante inválido.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dados', jsonb_build_object(
      'fornecedor_id', v_fornecedor_id,
      'categoria', v_categoria,
      'descricao', v_descricao,
      'data_compra', v_data_compra,
      'frete', v_frete,
      'desconto', v_desconto,
      'forma_pagamento', v_forma_pagamento,
      'status_pagamento', v_status_pagamento,
      'vencimento', v_vencimento,
      'pago_em', v_pago_em,
      'observacao', v_observacao,
      'comprovante_url', v_comprovante_url
    )
  );
end;
$$;

-- ============================================================
-- 1) HELPER — admin_validar_itens_compra
-- ============================================================
-- Valida e normaliza os itens de mercadoria, buscando snapshots reais
-- do banco quando há variante. Devolve:
--   { ok: true, subtotal, itens: [...] } | { ok: false, codigo, erro }
create or replace function public.admin_validar_itens_compra(p_itens jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item jsonb;
  v_descricao text;
  v_cor text;
  v_tamanho text;
  v_quantidade numeric;
  v_valor numeric(10,2);
  v_subtotal numeric(10,2);
  v_total numeric(10,2) := 0;
  v_pv_id bigint;
  v_variante record;
  v_normalizados jsonb := '[]'::jsonb;
begin
  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) < 1 then
    return jsonb_build_object('ok', false, 'codigo', 'MERCADORIA_SEM_ITENS', 'erro', 'Informe ao menos um item de mercadoria.');
  end if;

  for v_item in select value from jsonb_array_elements(p_itens)
  loop
    if v_item is null or jsonb_typeof(v_item) <> 'object' then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Item de compra inválido.');
    end if;

    v_descricao := btrim(regexp_replace(coalesce(v_item->>'descricao', ''), '\s+', ' ', 'g'));
    v_cor := nullif(btrim(coalesce(v_item->>'cor', '')), '');
    v_tamanho := nullif(btrim(coalesce(v_item->>'tamanho', '')), '');

    if v_descricao = '' or char_length(v_descricao) > 300 then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Descrição do item é obrigatória (até 300 caracteres).');
    end if;

    if v_cor is not null and char_length(v_cor) > 60 then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Cor do item deve ter no máximo 60 caracteres.');
    end if;

    if v_tamanho is not null and char_length(v_tamanho) > 30 then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Tamanho do item deve ter no máximo 30 caracteres.');
    end if;

    if v_item->'quantidade' is null or jsonb_typeof(v_item->'quantidade') <> 'number' then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Quantidade do item é obrigatória.');
    end if;

    v_quantidade := (v_item->>'quantidade')::numeric;

    if v_quantidade <= 0 or v_quantidade <> floor(v_quantidade) then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Quantidade do item deve ser um inteiro maior que zero.');
    end if;

    if v_item->'valor_unitario' is null or jsonb_typeof(v_item->'valor_unitario') <> 'number' then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Valor unitário do item é obrigatório.');
    end if;

    v_valor := (v_item->>'valor_unitario')::numeric(10,2);

    if v_valor < 0 then
      return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Valor unitário não pode ser negativo.');
    end if;

    if v_item ? 'produto_variante_id' and jsonb_typeof(v_item->'produto_variante_id') = 'number' then
      v_pv_id := (v_item->>'produto_variante_id')::bigint;
    else
      v_pv_id := null;
    end if;

    if v_pv_id is not null then
      select pv.cor, pv.tamanho, p.nome
        into v_variante
        from public.produto_variante pv
        join public.produtos p on p.id = pv.produto_id
       where pv.id = v_pv_id;

      if not found then
        return jsonb_build_object('ok', false, 'codigo', 'VARIANTE_INEXISTENTE', 'erro', 'Variante informada não encontrada.');
      end if;

      v_descricao := btrim(v_variante.nome);
      v_cor := v_variante.cor;
      v_tamanho := v_variante.tamanho;

      if char_length(v_descricao) > 300
         or (v_cor is not null and char_length(v_cor) > 60)
         or (v_tamanho is not null and char_length(v_tamanho) > 30) then
        return jsonb_build_object('ok', false, 'codigo', 'ITEM_INVALIDO', 'erro', 'Dados da variante excedem os limites permitidos.');
      end if;
    end if;

    v_subtotal := (v_quantidade::int) * v_valor;
    v_total := v_total + v_subtotal;

    v_normalizados := v_normalizados || jsonb_build_array(jsonb_build_object(
      'produto_variante_id', v_pv_id,
      'descricao', v_descricao,
      'cor', v_cor,
      'tamanho', v_tamanho,
      'quantidade', v_quantidade::int,
      'valor_unitario', v_valor,
      'subtotal', v_subtotal
    ));
  end loop;

  return jsonb_build_object('ok', true, 'subtotal', v_total, 'itens', v_normalizados);
end;
$$;

-- ============================================================
-- 2) RPC — admin_listar_compras
-- ============================================================
create or replace function public.admin_listar_compras(p_filtros jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_busca text;
  v_data_inicio date;
  v_data_fim date;
  v_fornecedor_id bigint;
  v_tipo text;
  v_categoria text;
  v_status text;
  v_status_pagamento text;
  v_compras jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_busca := nullif(btrim(p_filtros->>'busca'), '');

  if p_filtros->>'dataInicio' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_data_inicio := (p_filtros->>'dataInicio')::date;
  end if;

  if p_filtros->>'dataFim' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_data_fim := (p_filtros->>'dataFim')::date;
  end if;

  if jsonb_typeof(p_filtros->'fornecedorId') = 'number' then
    v_fornecedor_id := (p_filtros->>'fornecedorId')::bigint;
  end if;

  v_tipo := nullif(btrim(p_filtros->>'tipo'), '');
  v_categoria := nullif(btrim(p_filtros->>'categoria'), '');
  v_status := nullif(btrim(p_filtros->>'status'), '');
  v_status_pagamento := nullif(btrim(p_filtros->>'statusPagamento'), '');

  select coalesce(jsonb_agg(t order by t.data_compra desc, t.id desc), '[]'::jsonb)
    into v_compras
    from (
      select
        c.id,
        c.data_compra,
        c.tipo,
        c.categoria,
        c.descricao,
        c.fornecedor_id,
        f.nome as fornecedor_nome,
        c.subtotal,
        c.frete,
        c.desconto,
        c.total,
        c.status_pagamento,
        c.status,
        c.vencimento,
        c.pago_em,
        c.recebida_em,
        c.cancelada_em,
        c.updated_at,
        (select count(*)::int from public.itens_compra ic where ic.compra_id = c.id) as quantidade_itens
      from public.compras c
      left join public.fornecedores f on f.id = c.fornecedor_id
      where (v_data_inicio is null or c.data_compra >= v_data_inicio)
        and (v_data_fim is null or c.data_compra <= v_data_fim)
        and (v_fornecedor_id is null or c.fornecedor_id = v_fornecedor_id)
        and (v_tipo is null or c.tipo = v_tipo)
        and (v_categoria is null or c.categoria = v_categoria)
        and (v_status is null or c.status = v_status)
        and (v_status_pagamento is null or c.status_pagamento = v_status_pagamento)
        and (
          v_busca is null
          or lower(c.descricao) like '%' || lower(v_busca) || '%'
          or lower(coalesce(c.categoria, '')) like '%' || lower(v_busca) || '%'
          or lower(coalesce(f.nome, '')) like '%' || lower(v_busca) || '%'
        )
    ) t;

  return jsonb_build_object('ok', true, 'compras', v_compras);
end;
$$;

-- ============================================================
-- 3) RPC — admin_obter_compra
-- ============================================================
create or replace function public.admin_obter_compra(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_compra record;
  v_fornecedor jsonb;
  v_itens jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select
    c.id, c.fornecedor_id, c.tipo, c.categoria, c.descricao, c.data_compra,
    c.subtotal, c.frete, c.desconto, c.total, c.forma_pagamento,
    c.status_pagamento, c.vencimento, c.pago_em, c.status,
    c.recebida_em, c.cancelada_em, c.observacao, c.comprovante_url,
    c.created_at, c.updated_at,
    f.nome as fornecedor_nome
    into v_compra
    from public.compras c
    left join public.fornecedores f on f.id = c.fornecedor_id
   where c.id = p_id;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Compra não encontrada.');
  end if;

  if v_compra.fornecedor_id is not null then
    v_fornecedor := jsonb_build_object('id', v_compra.fornecedor_id, 'nome', v_compra.fornecedor_nome);
  else
    v_fornecedor := null;
  end if;

  select coalesce(jsonb_agg(t order by t.id), '[]'::jsonb)
    into v_itens
    from (
      select
        ic.id, ic.produto_variante_id, ic.descricao, ic.cor, ic.tamanho,
        ic.quantidade, ic.valor_unitario, ic.subtotal
      from public.itens_compra ic
      where ic.compra_id = p_id
    ) t;

  return jsonb_build_object(
    'ok', true,
    'compra', jsonb_build_object(
      'id', v_compra.id,
      'fornecedor_id', v_compra.fornecedor_id,
      'tipo', v_compra.tipo,
      'categoria', v_compra.categoria,
      'descricao', v_compra.descricao,
      'data_compra', v_compra.data_compra,
      'subtotal', v_compra.subtotal,
      'frete', v_compra.frete,
      'desconto', v_compra.desconto,
      'total', v_compra.total,
      'forma_pagamento', v_compra.forma_pagamento,
      'status_pagamento', v_compra.status_pagamento,
      'vencimento', v_compra.vencimento,
      'pago_em', v_compra.pago_em,
      'status', v_compra.status,
      'recebida_em', v_compra.recebida_em,
      'cancelada_em', v_compra.cancelada_em,
      'observacao', v_compra.observacao,
      'comprovante_url', v_compra.comprovante_url,
      'created_at', v_compra.created_at,
      'updated_at', v_compra.updated_at,
      'fornecedor', v_fornecedor,
      'itens', v_itens
    )
  );
end;
$$;

-- ============================================================
-- 4) RPC — admin_criar_compra
-- ============================================================
create or replace function public.admin_criar_compra(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tipo text;
  v_status_pagamento text;
  v_cabecalho jsonb;
  v_dados jsonb;
  v_itens jsonb;
  v_subtotal numeric(10,2);
  v_total numeric(10,2);
  v_id bigint;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_tipo := nullif(btrim(p_dados->>'tipo'), '');

  if v_tipo is null or v_tipo not in ('mercadoria', 'despesa') then
    return jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'erro', 'Tipo de compra inválido.');
  end if;

  if p_dados ? 'status' and nullif(btrim(p_dados->>'status'), '') is not null
     and (p_dados->>'status') <> 'pendente' then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'A compra deve ser criada como pendente.');
  end if;

  v_cabecalho := public.admin_validar_cabecalho_compra(p_dados, v_tipo, true);

  if v_cabecalho->>'ok' <> 'true' then
    return v_cabecalho;
  end if;

  v_dados := v_cabecalho->'dados';

  if v_tipo = 'despesa' then
    v_subtotal := 0;
    if jsonb_typeof(p_dados->'subtotal') = 'number' then
      v_subtotal := (p_dados->>'subtotal')::numeric(10,2);
    end if;

    if v_subtotal < 0 then
      return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Valor da despesa não pode ser negativo.');
    end if;
  else
    v_itens := public.admin_validar_itens_compra(p_dados->'itens');

    if v_itens->>'ok' <> 'true' then
      return v_itens;
    end if;

    v_subtotal := (v_itens->>'subtotal')::numeric(10,2);
  end if;

  v_total := v_subtotal + (v_dados->>'frete')::numeric(10,2) - (v_dados->>'desconto')::numeric(10,2);

  if v_total < 0 then
    return jsonb_build_object('ok', false, 'codigo', 'TOTAL_INVALIDO', 'erro', 'Desconto maior que o valor da compra.');
  end if;

  insert into public.compras (
    fornecedor_id, tipo, categoria, descricao, data_compra,
    subtotal, frete, desconto, total, forma_pagamento,
    status_pagamento, vencimento, pago_em, status, observacao, comprovante_url
  )
  values (
    nullif(v_dados->>'fornecedor_id', '')::bigint,
    v_tipo,
    v_dados->>'categoria',
    v_dados->>'descricao',
    (v_dados->>'data_compra')::date,
    v_subtotal,
    (v_dados->>'frete')::numeric(10,2),
    (v_dados->>'desconto')::numeric(10,2),
    v_total,
    v_dados->>'forma_pagamento',
    v_dados->>'status_pagamento',
    nullif(v_dados->>'vencimento', '')::date,
    nullif(v_dados->>'pago_em', '')::timestamptz,
    'pendente',
    v_dados->>'observacao',
    v_dados->>'comprovante_url'
  )
  returning id into v_id;

  if v_tipo = 'mercadoria' then
    insert into public.itens_compra (
      compra_id, produto_variante_id, descricao, cor, tamanho,
      quantidade, valor_unitario, subtotal
    )
    select
      v_id,
      nullif(item->>'produto_variante_id', '')::bigint,
      item->>'descricao',
      nullif(item->>'cor', ''),
      nullif(item->>'tamanho', ''),
      (item->>'quantidade')::int,
      (item->>'valor_unitario')::numeric(10,2),
      (item->>'subtotal')::numeric(10,2)
    from jsonb_array_elements(v_itens->'itens') as item;
  end if;

  return public.admin_obter_compra(v_id);
end;
$$;

-- ============================================================
-- 5) RPC — admin_atualizar_compra
-- ============================================================
-- pendente   -> atualização completa (cabeçalho + itens recalculados).
-- recebida   -> apenas campos financeiros/administrativos.
-- cancelada  -> somente leitura.
create or replace function public.admin_atualizar_compra(p_id bigint, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status_atual text;
  v_tipo text;
  v_cabecalho jsonb;
  v_dados jsonb;
  v_itens jsonb;
  v_subtotal numeric(10,2);
  v_total numeric(10,2);
  v_forma_pagamento text;
  v_status_pagamento text;
  v_vencimento date;
  v_pago_em timestamptz;
  v_observacao text;
  v_comprovante_url text;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select status into v_status_atual
    from public.compras
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Compra não encontrada.');
  end if;

  if v_status_atual = 'cancelada' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_CANCELADA', 'erro', 'Compra cancelada não pode ser alterada.');
  end if;

  if v_status_atual = 'recebida' then
    if p_dados ? 'tipo'
       or p_dados ? 'itens'
       or p_dados ? 'fornecedor_id'
       or p_dados ? 'descricao'
       or p_dados ? 'data_compra'
       or p_dados ? 'subtotal'
       or p_dados ? 'frete'
       or p_dados ? 'desconto' then
      return jsonb_build_object('ok', false, 'codigo', 'COMPRA_JA_RECEBIDA', 'erro', 'Compra recebida: apenas dados financeiros podem ser alterados.');
    end if;

    v_forma_pagamento := case when p_dados ? 'forma_pagamento'
      then nullif(btrim(coalesce(p_dados->>'forma_pagamento', '')), '')
      else (select forma_pagamento from public.compras where id = p_id) end;

    if v_forma_pagamento is not null and char_length(v_forma_pagamento) > 40 then
      return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Forma de pagamento deve ter no máximo 40 caracteres.');
    end if;

    v_status_pagamento := case when p_dados ? 'status_pagamento'
      then coalesce(nullif(btrim(p_dados->>'status_pagamento'), ''), 'pendente')
      else (select status_pagamento from public.compras where id = p_id) end;

    if v_status_pagamento not in ('pendente', 'pago') then
      return jsonb_build_object('ok', false, 'codigo', 'PAGAMENTO_INVALIDO', 'erro', 'Status de pagamento inválido.');
    end if;

    if v_status_pagamento = 'pago' then
      if p_dados->>'pago_em' ~ '^\d{4}-\d{2}-\d{2}' then
        v_pago_em := (p_dados->>'pago_em')::timestamptz;
      else
        v_pago_em := coalesce((select pago_em from public.compras where id = p_id), now());
      end if;
    else
      v_pago_em := null;
    end if;

    v_vencimento := case when p_dados ? 'vencimento' and p_dados->>'vencimento' ~ '^\d{4}-\d{2}-\d{2}$'
      then (p_dados->>'vencimento')::date
      else (select vencimento from public.compras where id = p_id) end;

    v_observacao := case when p_dados ? 'observacao'
      then nullif(btrim(coalesce(p_dados->>'observacao', '')), '')
      else (select observacao from public.compras where id = p_id) end;

    if v_observacao is not null and char_length(v_observacao) > 1000 then
      return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Observação deve ter no máximo 1000 caracteres.');
    end if;

    v_comprovante_url := case when p_dados ? 'comprovante_url'
      then nullif(btrim(coalesce(p_dados->>'comprovante_url', '')), '')
      else (select comprovante_url from public.compras where id = p_id) end;

    if v_comprovante_url is not null and char_length(v_comprovante_url) > 500 then
      return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Comprovante inválido.');
    end if;

    update public.compras
       set forma_pagamento = v_forma_pagamento,
           status_pagamento = v_status_pagamento,
           vencimento = v_vencimento,
           pago_em = v_pago_em,
           observacao = v_observacao,
           comprovante_url = v_comprovante_url,
           updated_at = now()
     where id = p_id;

    return public.admin_obter_compra(p_id);
  end if;

  -- status = pendente: atualização completa
  v_tipo := nullif(btrim(p_dados->>'tipo'), '');

  if v_tipo is null or v_tipo not in ('mercadoria', 'despesa') then
    return jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'erro', 'Tipo de compra inválido.');
  end if;

  v_cabecalho := public.admin_validar_cabecalho_compra(p_dados, v_tipo, false);

  if v_cabecalho->>'ok' <> 'true' then
    return v_cabecalho;
  end if;

  v_dados := v_cabecalho->'dados';

  if v_tipo = 'despesa' then
    v_subtotal := 0;
    if jsonb_typeof(p_dados->'subtotal') = 'number' then
      v_subtotal := (p_dados->>'subtotal')::numeric(10,2);
    end if;

    if v_subtotal < 0 then
      return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Valor da despesa não pode ser negativo.');
    end if;
  else
    v_itens := public.admin_validar_itens_compra(p_dados->'itens');

    if v_itens->>'ok' <> 'true' then
      return v_itens;
    end if;

    v_subtotal := (v_itens->>'subtotal')::numeric(10,2);
  end if;

  v_total := v_subtotal + (v_dados->>'frete')::numeric(10,2) - (v_dados->>'desconto')::numeric(10,2);

  if v_total < 0 then
    return jsonb_build_object('ok', false, 'codigo', 'TOTAL_INVALIDO', 'erro', 'Desconto maior que o valor da compra.');
  end if;

  update public.compras
     set fornecedor_id = nullif(v_dados->>'fornecedor_id', '')::bigint,
         tipo = v_tipo,
         categoria = v_dados->>'categoria',
         descricao = v_dados->>'descricao',
         data_compra = (v_dados->>'data_compra')::date,
         subtotal = v_subtotal,
         frete = (v_dados->>'frete')::numeric(10,2),
         desconto = (v_dados->>'desconto')::numeric(10,2),
         total = v_total,
         forma_pagamento = v_dados->>'forma_pagamento',
         status_pagamento = v_dados->>'status_pagamento',
         vencimento = nullif(v_dados->>'vencimento', '')::date,
         pago_em = nullif(v_dados->>'pago_em', '')::timestamptz,
         observacao = v_dados->>'observacao',
         comprovante_url = v_dados->>'comprovante_url',
         updated_at = now()
   where id = p_id;

  delete from public.itens_compra where compra_id = p_id;

  if v_tipo = 'mercadoria' then
    insert into public.itens_compra (
      compra_id, produto_variante_id, descricao, cor, tamanho,
      quantidade, valor_unitario, subtotal
    )
    select
      p_id,
      nullif(item->>'produto_variante_id', '')::bigint,
      item->>'descricao',
      nullif(item->>'cor', ''),
      nullif(item->>'tamanho', ''),
      (item->>'quantidade')::int,
      (item->>'valor_unitario')::numeric(10,2),
      (item->>'subtotal')::numeric(10,2)
    from jsonb_array_elements(v_itens->'itens') as item;
  end if;

  return public.admin_obter_compra(p_id);
end;
$$;

-- ============================================================
-- 6) RPC — admin_alterar_status_compra
-- ============================================================
-- Máquina de estados: pendente -> recebida | cancelada.
-- recebida/cancelada são terminais nesta fase. NÃO altera estoque.
create or replace function public.admin_alterar_status_compra(p_id bigint, p_status text)
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
    from public.compras
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Compra não encontrada.');
  end if;

  if v_status_atual = 'recebida' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_JA_RECEBIDA', 'erro', 'Compra já recebida.');
  end if;

  if v_status_atual = 'cancelada' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_CANCELADA', 'erro', 'Compra já cancelada.');
  end if;

  if p_status is null or p_status not in ('recebida', 'cancelada') then
    return jsonb_build_object('ok', false, 'codigo', 'TRANSICAO_INVALIDA', 'erro', 'Transição de status inválida.');
  end if;

  if p_status = 'recebida' then
    update public.compras
       set status = 'recebida',
           recebida_em = now(),
           updated_at = now()
     where id = p_id;
  else
    update public.compras
       set status = 'cancelada',
           cancelada_em = now(),
           updated_at = now()
     where id = p_id;
  end if;

  return public.admin_obter_compra(p_id);
end;
$$;

-- ============================================================
-- 7) PERMISSÕES
-- ============================================================
-- Helpers internos: não expostos a authenticated/anon.
revoke all on function public.admin_validar_cabecalho_compra(jsonb, text, boolean) from public;
revoke execute on function public.admin_validar_cabecalho_compra(jsonb, text, boolean) from anon, authenticated;

revoke all on function public.admin_validar_itens_compra(jsonb) from public;
revoke execute on function public.admin_validar_itens_compra(jsonb) from anon, authenticated;

-- RPCs administrativas: padrão do projeto.
revoke all on function public.admin_listar_compras(jsonb) from public;
revoke all on function public.admin_obter_compra(bigint) from public;
revoke all on function public.admin_criar_compra(jsonb) from public;
revoke all on function public.admin_atualizar_compra(bigint, jsonb) from public;
revoke all on function public.admin_alterar_status_compra(bigint, text) from public;

revoke execute on function public.admin_listar_compras(jsonb) from anon;
revoke execute on function public.admin_obter_compra(bigint) from anon;
revoke execute on function public.admin_criar_compra(jsonb) from anon;
revoke execute on function public.admin_atualizar_compra(bigint, jsonb) from anon;
revoke execute on function public.admin_alterar_status_compra(bigint, text) from anon;

grant execute on function public.admin_listar_compras(jsonb) to authenticated, service_role;
grant execute on function public.admin_obter_compra(bigint) to authenticated, service_role;
grant execute on function public.admin_criar_compra(jsonb) to authenticated, service_role;
grant execute on function public.admin_atualizar_compra(bigint, jsonb) to authenticated, service_role;
grant execute on function public.admin_alterar_status_compra(bigint, text) to authenticated, service_role;
