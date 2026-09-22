-- ============================================================
-- La Femme — Produtos em rascunho + vínculo de itens de compra
--
-- Contexto: itens_compra.produto_variante_id é nullable (item de
-- mercadoria sem produto cadastrado). Esta migration prepara o fluxo
-- de vincular/criar produto sem alterar estoque.
--
-- Decisão de arquitetura (auditoria):
--   * public.produtos NÃO possuía campo de publicação; o catálogo
--     público (view catalogo_produtos) expunha TODOS os produtos com
--     variantes. Foi adicionado `publicado boolean not null default
--     true` — semântica explícita de rascunho/publicado.
--   * Produtos existentes continuam publicados (default true), sem
--     regressão. A view passa a filtrar `p.publicado = true`.
--
-- ESCOPO: coluna publicado, view do catálogo, RPCs de publicação,
-- vínculo/desvínculo de item e criação de produto rascunho a partir
-- de item de compra. NÃO altera estoque, produto_variante.quantidade,
-- pedidos, admin_finalizar_pedido, admin_criar/atualizar_produto.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) Coluna publicado
-- ============================================================
alter table public.produtos
  add column if not exists publicado boolean not null default true;

-- ============================================================
-- 2) View do catálogo público — oculta rascunhos
-- ============================================================
-- Mesmas colunas/ordem; apenas filtra produtos não publicados.
create or replace view public.catalogo_produtos as
select
  p.id as produto_id,
  p.nome,
  p.descricao,
  p.categoria,
  pv.id as variante_id,
  pv.cor,
  pv.tamanho,
  pv.valor,
  pv.foto,
  pv.sku,
  pv.quantidade,
  (pv.ativo AND pv.quantidade > 0) as disponivel,
  p.slug
from public.produtos p
join public.produto_variante pv on pv.produto_id = p.id
where p.publicado = true;

-- ============================================================
-- 3) RPC — admin_alterar_publicacao_produto
-- ============================================================
-- Publica/despublica um produto. Para publicar, exige ao menos uma
-- variante com preço de venda > 0 (mínimo comercial do catálogo).
-- Não copia custo para preço; apenas valida.
create or replace function public.admin_alterar_publicacao_produto(p_id integer, p_publicado boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id integer;
  v_publicado_atual boolean;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_publicado is null then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Publicação inválida.');
  end if;

  select id, publicado
    into v_id, v_publicado_atual
    from public.produtos
   where id = p_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Produto não encontrado.');
  end if;

  if p_publicado and not exists (
    select 1 from public.produto_variante where produto_id = p_id and valor > 0
  ) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'PUBLICACAO_INVALIDA',
      'erro', 'Para publicar, informe um preço de venda maior que zero em pelo menos uma variante.'
    );
  end if;

  update public.produtos
     set publicado = p_publicado,
         updated_at = now()
   where id = p_id;

  return jsonb_build_object('ok', true, 'produto', jsonb_build_object('id', p_id, 'publicado', p_publicado));
end;
$$;

-- ============================================================
-- 4) RPC — admin_vincular_item_compra_variante
-- ============================================================
-- Atualiza SOMENTE itens_compra.produto_variante_id. Preserva
-- snapshots históricos (descricao/cor/tamanho/valor_unitario).
-- Permitido para compra pendente ou recebida; cancelada é bloqueada.
create or replace function public.admin_vincular_item_compra_variante(p_item_id bigint, p_variante_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_variante_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Variante inválida.');
  end if;

  select ic.id, c.status as compra_status, c.tipo as compra_tipo
    into v_item
    from public.itens_compra ic
    join public.compras c on c.id = ic.compra_id
   where ic.id = p_item_id
   for update of ic;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ITEM_NAO_ENCONTRADO', 'erro', 'Item de compra não encontrado.');
  end if;

  if v_item.compra_status = 'cancelada' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_CANCELADA', 'erro', 'Compra cancelada não pode ser alterada.');
  end if;

  if v_item.compra_tipo <> 'mercadoria' then
    return jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'erro', 'Somente itens de mercadoria podem ser vinculados a variantes.');
  end if;

  if not exists (select 1 from public.produto_variante where id = p_variante_id) then
    return jsonb_build_object('ok', false, 'codigo', 'VARIANTE_INEXISTENTE', 'erro', 'Variante informada não encontrada.');
  end if;

  update public.itens_compra
     set produto_variante_id = p_variante_id
   where id = p_item_id;

  return jsonb_build_object(
    'ok', true,
    'item', jsonb_build_object('id', p_item_id, 'produto_variante_id', p_variante_id)
  );
end;
$$;

-- ============================================================
-- 5) RPC — admin_desvincular_item_compra_variante
-- ============================================================
-- Zera produto_variante_id. Permitido apenas para compra pendente.
-- Recebida é bloqueada (evita remover vínculo de compra já recebida).
create or replace function public.admin_desvincular_item_compra_variante(p_item_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select ic.id, c.status as compra_status
    into v_item
    from public.itens_compra ic
    join public.compras c on c.id = ic.compra_id
   where ic.id = p_item_id
   for update of ic;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ITEM_NAO_ENCONTRADO', 'erro', 'Item de compra não encontrado.');
  end if;

  if v_item.compra_status = 'cancelada' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_CANCELADA', 'erro', 'Compra cancelada não pode ser alterada.');
  end if;

  if v_item.compra_status = 'recebida' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_JA_RECEBIDA', 'erro', 'Compra recebida: não é possível desvincular o item.');
  end if;

  update public.itens_compra
     set produto_variante_id = null
   where id = p_item_id;

  return jsonb_build_object(
    'ok', true,
    'item', jsonb_build_object('id', p_item_id, 'produto_variante_id', null)
  );
end;
$$;

-- ============================================================
-- 6) RPC — admin_criar_produto_rascunho_item_compra
-- ============================================================
-- Cria produto + variante em rascunho e vincula o item, tudo na
-- mesma transação. NÃO altera estoque (quantidade da variante vem do
-- payload, tipicamente 0). Preço de venda NÃO é derivado do custo.
create or replace function public.admin_criar_produto_rascunho_item_compra(p_item_id bigint, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_item record;
  v_validacao jsonb;
  v_nome text;
  v_descricao text;
  v_categoria text;
  v_capa text;
  v_variantes jsonb;
  v_produto_id bigint;
  v_variante_id bigint;
  v_primeira_variante bigint := null;
  v_base_slug text;
  v_slug text;
  v_tentativa integer;
  v_variante jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select ic.id, ic.produto_variante_id, c.status as compra_status, c.tipo as compra_tipo
    into v_item
    from public.itens_compra ic
    join public.compras c on c.id = ic.compra_id
   where ic.id = p_item_id
   for update of ic;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'ITEM_NAO_ENCONTRADO', 'erro', 'Item de compra não encontrado.');
  end if;

  if v_item.compra_status = 'cancelada' then
    return jsonb_build_object('ok', false, 'codigo', 'COMPRA_CANCELADA', 'erro', 'Compra cancelada não pode ser alterada.');
  end if;

  if v_item.compra_tipo <> 'mercadoria' then
    return jsonb_build_object('ok', false, 'codigo', 'TIPO_INVALIDO', 'erro', 'Somente itens de mercadoria podem gerar produto.');
  end if;

  if v_item.produto_variante_id is not null then
    return jsonb_build_object('ok', false, 'codigo', 'ITEM_JA_VINCULADO', 'erro', 'Este item já está vinculado a uma variante.');
  end if;

  v_validacao := public.admin_validar_dados_produto(p_dados);
  if not (v_validacao->>'ok')::boolean then
    return jsonb_build_object(
      'ok', false,
      'codigo', coalesce(v_validacao->>'codigo', 'PAYLOAD_INVALIDO'),
      'erro', v_validacao->>'erro'
    );
  end if;

  v_nome := v_validacao->'dados'->>'nome';
  v_descricao := v_validacao->'dados'->>'descricao';
  v_categoria := v_validacao->'dados'->>'categoria';
  v_capa := v_validacao->'dados'->>'capa';
  v_variantes := v_validacao->'dados'->'variantes';

  if jsonb_array_length(v_variantes) < 1 then
    return jsonb_build_object('ok', false, 'codigo', 'PAYLOAD_INVALIDO', 'erro', 'Informe ao menos uma variante.');
  end if;

  insert into public.produtos (nome, descricao, categoria, publicado)
  values (v_nome, v_descricao, v_categoria, false)
  returning id into v_produto_id;

  v_base_slug := public.slugificar(v_nome);
  if v_base_slug = '' then
    v_base_slug := 'produto-' || v_produto_id;
  end if;

  v_tentativa := 1;
  loop
    v_slug := case when v_tentativa = 1 then v_base_slug else v_base_slug || '-' || (v_tentativa + 1) end;
    begin
      update public.produtos set slug = v_slug where id = v_produto_id;
      exit;
    exception
      when unique_violation then
        if v_tentativa >= 100 then
          raise exception 'Não foi possível gerar um slug único.' using errcode = 'P0001';
        end if;
        v_tentativa := v_tentativa + 1;
    end;
  end loop;

  for v_variante in select value from jsonb_array_elements(v_variantes) loop
    insert into public.produto_variante (produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo)
    values (
      v_produto_id,
      v_variante->>'cor',
      v_variante->>'tamanho',
      (v_variante->>'valor')::numeric,
      (v_variante->>'quantidade')::int,
      v_variante->>'sku',
      v_capa,
      (v_variante->>'ativo')::boolean
    )
    returning id into v_variante_id;

    if v_primeira_variante is null then
      v_primeira_variante := v_variante_id;
    end if;
  end loop;

  update public.itens_compra
     set produto_variante_id = v_primeira_variante
   where id = p_item_id;

  return jsonb_build_object('ok', true, 'produto_id', v_produto_id, 'variante_id', v_primeira_variante);
end;
$$;

-- ============================================================
-- 7) PERMISSÕES (padrão do projeto)
-- ============================================================
revoke all on function public.admin_alterar_publicacao_produto(integer, boolean) from public;
revoke all on function public.admin_vincular_item_compra_variante(bigint, bigint) from public;
revoke all on function public.admin_desvincular_item_compra_variante(bigint) from public;
revoke all on function public.admin_criar_produto_rascunho_item_compra(bigint, jsonb) from public;

revoke execute on function public.admin_alterar_publicacao_produto(integer, boolean) from anon;
revoke execute on function public.admin_vincular_item_compra_variante(bigint, bigint) from anon;
revoke execute on function public.admin_desvincular_item_compra_variante(bigint) from anon;
revoke execute on function public.admin_criar_produto_rascunho_item_compra(bigint, jsonb) from anon;

grant execute on function public.admin_alterar_publicacao_produto(integer, boolean) to authenticated, service_role;
grant execute on function public.admin_vincular_item_compra_variante(bigint, bigint) to authenticated, service_role;
grant execute on function public.admin_desvincular_item_compra_variante(bigint) to authenticated, service_role;
grant execute on function public.admin_criar_produto_rascunho_item_compra(bigint, jsonb) to authenticated, service_role;
