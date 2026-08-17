-- ============================================================
-- La Femme — Fase 5C-6: Correção da checagem de admin nas RPCs
--
-- Contexto: quando o backend chama as RPCs administrativas usando
-- a chave Service Role via PostgREST/Supabase:
--   - session_user permanece como 'authenticator';
--   - current_user assume o owner da função (SECURITY DEFINER),
--     não o role do JWT;
--   - auth.uid() é NULL -> public.is_admin() retorna false;
--   - auth.role() retorna o role efetivo do JWT ('service_role');
--   - a checagem antiga (session_user <> 'service_role') gerava
--     'Acesso negado.' mesmo para o backend.
--
-- Correção: nas três RPCs administrativas, substituir
--   session_user <> 'service_role'
-- por
--   auth.role() <> 'service_role'
--
-- auth.role() lê a claim 'role' do JWT via request.jwt.claims
-- (GUC definido pelo PostgREST por requisição), que persiste
-- dentro de funções SECURITY DEFINER — diferente de current_user,
-- que dentro delas vale o owner da função.
--
-- Escopo (apenas isso):
--   - public.admin_criar_produto
--   - public.admin_atualizar_produto
--   - public.admin_excluir_produto
--
-- Não altera: public.is_admin(), public.criar_pedido(),
-- catalogo_produtos, RLS, policies, clientes, usuario.
-- Não altera a lógica de negócio das três RPCs: apenas a checagem.
--
-- SECURITY DEFINER, search_path, parâmetros, tipos de retorno,
-- validações e grants são preservados.
--
-- IMPORTANTE: NÃO executar automaticamente nem via supabase db push.
-- Aplicar de forma controlada com:
--   supabase db query --file supabase/migrations/20260814170000_corrigir_checagem_admin_rpc.sql
-- ============================================================

-- ---------- Criação transacional ----------
create or replace function public.admin_criar_produto(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_validacao jsonb;
  v_nome text;
  v_descricao text;
  v_categoria text;
  v_capa text;
  v_variantes jsonb;
  v_produto_id integer;
  v_base_slug text;
  v_slug text;
  v_tentativa integer;
  v_item jsonb;
  v_variante_id integer;
  v_foto_id integer;
  v_url text;
  v_fotos jsonb;
  v_variantes_resultado jsonb := '[]'::jsonb;
begin
  -- Autorização: admin autenticado (auth.uid()) ou chamada via chave do
  -- servidor (service_role). anon nunca chega aqui (sem EXECUTE).
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_validacao := public.admin_validar_dados_produto(p_dados);
  if not (v_validacao->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'codigo', 'PAYLOAD_INVALIDO', 'erro', v_validacao->>'erro');
  end if;

  v_nome := v_validacao->'dados'->>'nome';
  v_descricao := v_validacao->'dados'->>'descricao';
  v_categoria := v_validacao->'dados'->>'categoria';
  v_capa := v_validacao->'dados'->>'capa';
  v_variantes := v_validacao->'dados'->'variantes';

  insert into public.produtos (nome, descricao, categoria)
  values (v_nome, v_descricao, v_categoria)
  returning id into v_produto_id;

  -- Slug: base + sufixo numérico, guiado pela constraint UNIQUE.
  v_base_slug := public.slugificar(v_nome);
  if v_base_slug = '' then
    v_base_slug := 'produto-' || v_produto_id;
  end if;

  v_tentativa := 1;
  loop
    v_slug := case when v_tentativa = 1 then v_base_slug else v_base_slug || '-' || (v_tentativa + 1) end;
    begin
      update public.produtos
         set slug = v_slug
       where id = v_produto_id;
      exit;
    exception
      when unique_violation then
        if v_tentativa >= 100 then
          raise exception 'Não foi possível gerar um slug único.'
            using errcode = 'P0001';
        end if;
        v_tentativa := v_tentativa + 1;
    end;
  end loop;

  for v_item in select * from jsonb_array_elements(v_variantes) loop
    insert into public.produto_variante (produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo)
    values (
      v_produto_id,
      v_item->>'cor',
      v_item->>'tamanho',
      (v_item->>'valor')::numeric,
      (v_item->>'quantidade')::int,
      v_item->>'sku',
      v_capa,
      (v_item->>'ativo')::boolean
    )
    returning id into v_variante_id;

    v_fotos := '[]'::jsonb;
    for v_url in select * from jsonb_array_elements_text(v_item->'imagens') loop
      insert into public.foto_variante (url, id_variante)
      values (v_url, v_variante_id)
      returning id into v_foto_id;
      v_fotos := v_fotos || jsonb_build_array(jsonb_build_object('id', v_foto_id, 'url', v_url));
    end loop;

    v_variantes_resultado := v_variantes_resultado || jsonb_build_array(
      jsonb_build_object('id', v_variante_id, 'fotos', v_fotos)
    );
  end loop;

  return jsonb_build_object('ok', true, 'id', v_produto_id, 'variantes', v_variantes_resultado);
end;
$$;

-- ---------- Atualização transacional (substitui variantes/fotos) ----------
create or replace function public.admin_atualizar_produto(p_id integer, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_validacao jsonb;
  v_nome text;
  v_descricao text;
  v_categoria text;
  v_capa text;
  v_variantes jsonb;
  v_id integer;
  v_nome_atual text;
  v_slug_atual text;
  v_base_slug text;
  v_slug text;
  v_tentativa integer;
  v_item jsonb;
  v_variante_id integer;
  v_foto_id integer;
  v_url text;
  v_fotos jsonb;
  v_variantes_resultado jsonb := '[]'::jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  -- Lock na linha do produto: impede dois PATCH simultâneos de
  -- destruírem/reinserirem variantes uns dos outros.
  select id, nome, slug
    into v_id, v_nome_atual, v_slug_atual
    from public.produtos
   where id = p_id
     for update;

  if v_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Produto não encontrado.');
  end if;

  v_validacao := public.admin_validar_dados_produto(p_dados);
  if not (v_validacao->>'ok')::boolean then
    return jsonb_build_object('ok', false, 'codigo', 'PAYLOAD_INVALIDO', 'erro', v_validacao->>'erro');
  end if;

  v_nome := v_validacao->'dados'->>'nome';
  v_descricao := v_validacao->'dados'->>'descricao';
  v_categoria := v_validacao->'dados'->>'categoria';
  v_capa := v_validacao->'dados'->>'capa';
  v_variantes := v_validacao->'dados'->'variantes';

  update public.produtos
     set nome = v_nome,
         descricao = v_descricao,
         categoria = v_categoria
   where id = p_id;

  -- Slug: mantém o atual se o nome não mudou; caso contrário regenera
  -- com sufixo numérico guiado pela constraint UNIQUE.
  if v_slug_atual is not null and v_nome_atual = v_nome then
    v_slug := v_slug_atual;
  else
    v_base_slug := public.slugificar(v_nome);
    if v_base_slug = '' then
      v_base_slug := 'produto-' || p_id;
    end if;

    v_tentativa := 1;
    loop
      v_slug := case when v_tentativa = 1 then v_base_slug else v_base_slug || '-' || (v_tentativa + 1) end;
      begin
        update public.produtos
           set slug = v_slug
         where id = p_id;
        exit;
      exception
        when unique_violation then
          if v_tentativa >= 100 then
            raise exception 'Não foi possível gerar um slug único.'
              using errcode = 'P0001';
          end if;
          v_tentativa := v_tentativa + 1;
      end;
    end loop;
  end if;

  -- Substituição de variantes/fotos (mesma transação da função).
  delete from public.foto_variante
   where id_variante in (select id from public.produto_variante where produto_id = p_id);

  delete from public.produto_variante
   where produto_id = p_id;

  for v_item in select * from jsonb_array_elements(v_variantes) loop
    insert into public.produto_variante (produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo)
    values (
      p_id,
      v_item->>'cor',
      v_item->>'tamanho',
      (v_item->>'valor')::numeric,
      (v_item->>'quantidade')::int,
      v_item->>'sku',
      v_capa,
      (v_item->>'ativo')::boolean
    )
    returning id into v_variante_id;

    v_fotos := '[]'::jsonb;
    for v_url in select * from jsonb_array_elements_text(v_item->'imagens') loop
      insert into public.foto_variante (url, id_variante)
      values (v_url, v_variante_id)
      returning id into v_foto_id;
      v_fotos := v_fotos || jsonb_build_array(jsonb_build_object('id', v_foto_id, 'url', v_url));
    end loop;

    v_variantes_resultado := v_variantes_resultado || jsonb_build_array(
      jsonb_build_object('id', v_variante_id, 'fotos', v_fotos)
    );
  end loop;

  return jsonb_build_object('ok', true, 'id', p_id, 'variantes', v_variantes_resultado);
end;
$$;

-- ---------- Exclusão transacional ----------
create or replace function public.admin_excluir_produto(p_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id integer;
  v_fotos jsonb := '[]'::jsonb;
  v_linha record;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select id
    into v_id
    from public.produtos
   where id = p_id
     for update;

  if v_id is null then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Produto não encontrado.');
  end if;

  -- Coleta as URLs antes de excluir (limpeza de Storage pela API,
  -- fora da transação, somente após a confirmação do banco).
  for v_linha in
    select url
      from (
        select fv.url as url
          from public.foto_variante fv
          join public.produto_variante pv on pv.id = fv.id_variante
         where pv.produto_id = p_id
        union
        select pv.foto as url
          from public.produto_variante pv
         where pv.produto_id = p_id and pv.foto is not null
      ) urls
  loop
    v_fotos := v_fotos || jsonb_build_array(v_linha.url);
  end loop;

  delete from public.foto_variante
   where id_variante in (select id from public.produto_variante where produto_id = p_id);

  delete from public.produto_variante
   where produto_id = p_id;

  delete from public.produtos
   where id = p_id;

  return jsonb_build_object('ok', true, 'fotos', v_fotos);
end;
$$;

-- ---------- Permissões ----------
-- CREATE OR REPLACE FUNCTION preserva os grants existentes; abaixo
-- reafirmamos o mesmo modelo de autorização (idempotente) para
-- garantir que anon fica sem EXECUTE e apenas authenticated e
-- service_role executam.
revoke all on function public.admin_criar_produto(jsonb) from public;
revoke all on function public.admin_atualizar_produto(integer, jsonb) from public;
revoke all on function public.admin_excluir_produto(integer) from public;

revoke execute on function public.admin_criar_produto(jsonb) from anon;
revoke execute on function public.admin_atualizar_produto(integer, jsonb) from anon;
revoke execute on function public.admin_excluir_produto(integer) from anon;

grant execute on function public.admin_criar_produto(jsonb) to authenticated, service_role;
grant execute on function public.admin_atualizar_produto(integer, jsonb) to authenticated, service_role;
grant execute on function public.admin_excluir_produto(integer) to authenticated, service_role;