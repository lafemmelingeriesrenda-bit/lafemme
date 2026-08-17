-- ============================================================
-- La Femme — Fase 4B: CRUD administrativo de produtos transacional
--
-- Cria 3 RPCs (SECURITY DEFINER) que executam o CRUD de produto
-- de forma ATÔMICA dentro da própria transação da função:
--   POST   -> public.admin_criar_produto(p_dados jsonb)
--   PATCH  -> public.admin_atualizar_produto(p_id integer, p_dados jsonb)
--   DELETE -> public.admin_excluir_produto(p_id integer)
--
-- Em PostgreSQL, toda função PL/pgSQL roda dentro de uma transação
-- própria: qualquer EXCEPTION não tratada no corpo aborta TODAS as
-- operações realizadas pela função (rollback implícito). Assim uma
-- falha em qualquer etapa (produto / variantes / fotos) desfaz tudo.
-- Não usamos BEGIN/COMMIT manual dentro das funções.
--
-- Autorização em dupla camada:
--   1) requireAdmin() no endpoint (server/api/admin/produtos*);
--   2) Dentro da RPC: public.is_admin() (baseada em auth.uid()) OU
--      session_user = 'service_role' (chave do servidor).
--   3) GRANTs: EXECUTE apenas para authenticated e service_role;
--      anon/PUBLIC revogado -> a RPC não fica aberta.
--
-- A identidade vem de auth.uid() (nunca de payload/navegador).
--
-- Concorrência: UPDATE/PATCH e DELETE travam a linha do produto com
-- SELECT ... FOR UPDATE, serializando requisições simultâneas.
--
-- Slug seguro contra race condition: constraint UNIQUE produtos_slug_key
-- é o guarda real. A geração tenta o slug base e, em caso de
-- unique_violation (23505), avança para -2, -3, ... dentro do mesmo
-- lote, sem SELECT-then-INSERT vulnerável a corrida.
--
-- Storage NÃO faz parte da transação: as RPCs cuidam somente do banco.
-- A API remove arquivos do Storage DEPOIS que a transação confirma
-- (exclusão retorna as URLs removidas em 'fotos').
--
-- IMPORTANTE: NÃO executar automaticamente. Revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ---------- Helper de validação/normalização do payload ----------
-- Processa apenas jsonb (sem acesso a tabelas). Retorna
-- {ok:true, dados:{...normalizado}} ou {ok:false, erro:text}.
create or replace function public.admin_validar_dados_produto(
  p_dados jsonb
)
returns jsonb
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_nome text;
  v_descricao text;
  v_categoria text;
  v_capa text;
  v_variantes jsonb;
  v_variantes_norm jsonb := '[]'::jsonb;
  v_tamanhos text[] := '{}'::text[];
  v_item jsonb;
  v_tamanho text;
  v_cor text;
  v_sku text;
  v_valor numeric;
  v_quantidade numeric;
  v_ativo boolean;
  v_imagens jsonb;
  v_imagens_norm jsonb := '[]'::jsonb;
  v_url text;
  v_norm text;
begin
  if jsonb_typeof(p_dados) <> 'object' then
    return jsonb_build_object('ok', false, 'erro', 'Payload inválido.');
  end if;

  -- nome obrigatório (1..120, espaços colapsados)
  v_nome := p_dados->>'nome';
  v_norm := case when v_nome is null then null else trim(regexp_replace(v_nome, '\s+', ' ', 'g')) end;
  if v_norm is null or v_norm = '' or length(v_norm) > 120 then
    return jsonb_build_object('ok', false, 'erro', 'Nome do produto é obrigatório (1 a 120 caracteres).');
  end if;
  v_nome := v_norm;

  -- descricao opcional (<= 2000)
  v_descricao := p_dados->>'descricao';
  if v_descricao is not null and length(trim(v_descricao)) > 2000 then
    return jsonb_build_object('ok', false, 'erro', 'Descrição deve ter no máximo 2000 caracteres.');
  end if;
  v_descricao := nullif(trim(v_descricao), '');

  -- categoria opcional (<= 100)
  v_categoria := p_dados->>'categoria';
  v_norm := case when v_categoria is null then null else trim(regexp_replace(v_categoria, '\s+', ' ', 'g')) end;
  if v_norm is not null and length(v_norm) > 100 then
    return jsonb_build_object('ok', false, 'erro', 'Categoria deve ter no máximo 100 caracteres.');
  end if;
  v_categoria := nullif(v_norm, '');

  -- capa opcional (URL http(s) <= 2048)
  v_capa := p_dados->>'capa';
  if v_capa = '' then
    v_capa := null;
  end if;
  if v_capa is not null and (length(v_capa) > 2048 or v_capa !~ '^https?://') then
    return jsonb_build_object('ok', false, 'erro', 'Imagem de capa inválida.');
  end if;

  -- variantes
  v_variantes := p_dados->'variantes';
  if v_variantes is null or jsonb_typeof(v_variantes) <> 'array' then
    return jsonb_build_object('ok', false, 'erro', 'Variantes deve ser uma lista.');
  end if;

  for v_item in select * from jsonb_array_elements(v_variantes) loop
    if jsonb_typeof(v_item) <> 'object' then
      return jsonb_build_object('ok', false, 'erro', 'Cada variante deve ser um objeto.');
    end if;

    -- tamanho obrigatório (1..20)
    v_tamanho := v_item->>'tamanho';
    v_norm := case when v_tamanho is null then null else trim(regexp_replace(v_tamanho, '\s+', ' ', 'g')) end;
    if v_norm is null or v_norm = '' or length(v_norm) > 20 then
      return jsonb_build_object('ok', false, 'erro', 'Tamanho é obrigatório em cada variante.');
    end if;
    v_tamanho := v_norm;

    if v_tamanho = any (v_tamanhos) then
      return jsonb_build_object('ok', false, 'erro', 'Tamanho "' || v_tamanho || '" repetido nas variantes.');
    end if;
    v_tamanhos := v_tamanhos || v_tamanho;

    -- cor opcional (<= 60)
    v_cor := v_item->>'cor';
    v_norm := case when v_cor is null then null else trim(regexp_replace(v_cor, '\s+', ' ', 'g')) end;
    if v_norm is not null and length(v_norm) > 60 then
      return jsonb_build_object('ok', false, 'erro', 'Cor deve ter no máximo 60 caracteres.');
    end if;
    v_cor := nullif(v_norm, '');

    -- valor obrigatório (número >= 0)
    if v_item->'valor' is null or jsonb_typeof(v_item->'valor') <> 'number' then
      return jsonb_build_object('ok', false, 'erro', 'Valor deve ser um número maior ou igual a zero.');
    end if;
    v_valor := (v_item->>'valor')::numeric;
    if v_valor < 0 then
      return jsonb_build_object('ok', false, 'erro', 'Valor deve ser um número maior ou igual a zero.');
    end if;

    -- quantidade obrigatória (inteiro >= 0)
    if v_item->'quantidade' is null or jsonb_typeof(v_item->'quantidade') <> 'number' then
      return jsonb_build_object('ok', false, 'erro', 'Quantidade deve ser um inteiro maior ou igual a zero.');
    end if;
    v_quantidade := (v_item->>'quantidade')::numeric;
    if v_quantidade < 0 or v_quantidade <> trunc(v_quantidade) then
      return jsonb_build_object('ok', false, 'erro', 'Quantidade deve ser um inteiro maior ou igual a zero.');
    end if;

    -- sku opcional (<= 40)
    v_sku := v_item->>'sku';
    v_norm := case when v_sku is null then null else trim(regexp_replace(v_sku, '\s+', ' ', 'g')) end;
    if v_norm is not null and length(v_norm) > 40 then
      return jsonb_build_object('ok', false, 'erro', 'SKU deve ter no máximo 40 caracteres.');
    end if;
    v_sku := nullif(v_norm, '');

    -- ativo (default true; aceita apenas booleano real)
    if v_item ? 'ativo' and jsonb_typeof(v_item->'ativo') <> 'boolean' then
      return jsonb_build_object('ok', false, 'erro', 'Ativo deve ser um booleano.');
    end if;
    v_ativo := case when v_item ? 'ativo' then (v_item->>'ativo')::boolean else true end;

    -- imagens (lista de URLs http(s) <= 2048)
    v_imagens := v_item->'imagens';
    if v_imagens is null or jsonb_typeof(v_imagens) <> 'array' then
      return jsonb_build_object('ok', false, 'erro', 'Imagens da variante deve ser uma lista de URLs.');
    end if;

    v_imagens_norm := '[]'::jsonb;
    for v_url in select * from jsonb_array_elements_text(v_imagens) loop
      if v_url is null or v_url = '' or length(v_url) > 2048 or v_url !~ '^https?://' then
        return jsonb_build_object('ok', false, 'erro', 'URL de imagem inválida.');
      end if;
      v_imagens_norm := v_imagens_norm || jsonb_build_array(v_url);
    end loop;

    v_variantes_norm := v_variantes_norm || jsonb_build_array(jsonb_build_object(
      'cor', v_cor,
      'tamanho', v_tamanho,
      'valor', v_valor,
      'quantidade', v_quantidade::int,
      'sku', v_sku,
      'ativo', v_ativo,
      'imagens', v_imagens_norm
    ));
  end loop;

  return jsonb_build_object(
    'ok', true,
    'dados', jsonb_build_object(
      'nome', v_nome,
      'descricao', v_descricao,
      'categoria', v_categoria,
      'capa', v_capa,
      'variantes', v_variantes_norm
    )
  );
end;
$$;

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
  if not public.is_admin() and session_user <> 'service_role' then
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
  if not public.is_admin() and session_user <> 'service_role' then
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
  if not public.is_admin() and session_user <> 'service_role' then
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
-- Funções têm EXECUTE para PUBLIC por padrão; removemos e concedemos
-- apenas para authenticated e service_role. anon fica sem acesso.
revoke all on function public.admin_criar_produto(jsonb) from public;
revoke all on function public.admin_atualizar_produto(integer, jsonb) from public;
revoke all on function public.admin_excluir_produto(integer) from public;
revoke all on function public.admin_validar_dados_produto(jsonb) from public;

revoke execute on function public.admin_criar_produto(jsonb) from anon;
revoke execute on function public.admin_atualizar_produto(integer, jsonb) from anon;
revoke execute on function public.admin_excluir_produto(integer) from anon;
revoke execute on function public.admin_validar_dados_produto(jsonb) from anon;

grant execute on function public.admin_criar_produto(jsonb) to authenticated, service_role;
grant execute on function public.admin_atualizar_produto(integer, jsonb) to authenticated, service_role;
grant execute on function public.admin_excluir_produto(integer) to authenticated, service_role;