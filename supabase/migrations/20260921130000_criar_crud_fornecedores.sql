-- ============================================================
-- La Femme — Compras (Fase 2): CRUD administrativo de fornecedores
--
-- Cria 5 RPCs SECURITY DEFINER + 1 helper interno para o CRUD de
-- public.fornecedores. NÃO cria/alterar tabelas, colunas ou índices.
--
--   GET   -> public.admin_listar_fornecedores(p_filtros jsonb)
--   GET   -> public.admin_obter_fornecedor(p_id bigint)
--   POST  -> public.admin_criar_fornecedor(p_dados jsonb)
--   PATCH -> public.admin_atualizar_fornecedor(p_id bigint, p_dados jsonb)
--   PATCH -> public.admin_alterar_status_fornecedor(p_id bigint, p_ativo boolean)
--
-- Helper interno (não exposto):
--   public.admin_validar_dados_fornecedor(p_dados jsonb)
--
-- Arquitetura (igual ao restante do projeto):
--   Frontend -> Server API -> requireAdmin() -> Service Role ->
--   RPC SECURITY DEFINER -> Banco.
--   GRANTs: EXECUTE apenas para authenticated e service_role;
--   anon/PUBLIC revogado. O helper não é concedido a authenticated.
--
-- Regras:
--   * nome obrigatório (2..120), com espaços colapsados;
--   * cnpj normalizado para 14 dígitos (sem máscara) ou null;
--   * CNPJ duplicado bloqueado (índice único parcial da tabela);
--   * telefone normalizado para dígitos (8..20) ou null;
--   * email validado (5..160) ou null;
--   * contato (<=120) e observação (<=1000) ou null;
--   * desativação via ativo=false (sem DELETE físico);
--   * updated_at atualizado explicitamente nas escritas.
--
-- NÃO cria integração com estoque/compras, movimentos, custo médio, CMV,
-- nem altera pedidos, itens_pedido, produto_variante ou RPCs antigas.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 0) HELPER — public.admin_validar_dados_fornecedor(jsonb)
-- ============================================================
-- Normaliza e valida os campos textuais do fornecedor. Devolve:
--   { ok: true, dados: { nome, cnpj, telefone, email, contato, observacao } }
--   { ok: false, codigo, erro }
-- Função interna: usada por admin_criar/atualizar_fornecedor. Não é
-- concedida a authenticated/anon (executada pelo owner via SECURITY DEFINER).
create or replace function public.admin_validar_dados_fornecedor(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_nome text;
  v_cnpj text;
  v_telefone text;
  v_email text;
  v_contato text;
  v_observacao text;
begin
  v_nome := btrim(regexp_replace(coalesce(p_dados->>'nome', ''), '\s+', ' ', 'g'));

  if v_nome = '' then
    return jsonb_build_object('ok', false, 'codigo', 'NOME_OBRIGATORIO', 'erro', 'Nome é obrigatório.');
  end if;

  if char_length(v_nome) < 2 or char_length(v_nome) > 120 then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Nome deve ter entre 2 e 120 caracteres.');
  end if;

  v_cnpj := nullif(regexp_replace(coalesce(p_dados->>'cnpj', ''), '\D', '', 'g'), '');

  if v_cnpj is not null and char_length(v_cnpj) <> 14 then
    return jsonb_build_object('ok', false, 'codigo', 'CNPJ_INVALIDO', 'erro', 'CNPJ inválido.');
  end if;

  v_telefone := nullif(regexp_replace(coalesce(p_dados->>'telefone', ''), '\D', '', 'g'), '');

  if v_telefone is not null and (char_length(v_telefone) < 8 or char_length(v_telefone) > 20) then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Telefone inválido.');
  end if;

  v_email := nullif(btrim(coalesce(p_dados->>'email', '')), '');

  if v_email is not null
     and (
       char_length(v_email) < 5
       or char_length(v_email) > 160
       or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     ) then
    return jsonb_build_object('ok', false, 'codigo', 'EMAIL_INVALIDO', 'erro', 'E-mail inválido.');
  end if;

  v_contato := nullif(btrim(regexp_replace(coalesce(p_dados->>'contato', ''), '\s+', ' ', 'g')), '');

  if v_contato is not null and char_length(v_contato) > 120 then
    return jsonb_build_object('ok', false, 'codigo', 'LIMITE_EXCEDIDO', 'erro', 'Contato deve ter no máximo 120 caracteres.');
  end if;

  v_observacao := nullif(btrim(coalesce(p_dados->>'observacao', '')), '');

  if v_observacao is not null and char_length(v_observacao) > 1000 then
    return jsonb_build_object('ok', false, 'codigo', 'LIMITE_EXCEDIDO', 'erro', 'Observação deve ter no máximo 1000 caracteres.');
  end if;

  return jsonb_build_object(
    'ok', true,
    'dados', jsonb_build_object(
      'nome', v_nome,
      'cnpj', v_cnpj,
      'telefone', v_telefone,
      'email', v_email,
      'contato', v_contato,
      'observacao', v_observacao
    )
  );
end;
$$;

-- ============================================================
-- 1) RPC — admin_listar_fornecedores
-- ============================================================
-- Filtros opcionais (jsonb): busca (nome/cnpj/contato/telefone) e
-- ativo ('true' | 'false'). Ordena por nome A-Z (case-insensitive).
create or replace function public.admin_listar_fornecedores(p_filtros jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_busca text;
  v_busca_digitos text;
  v_ativo text;
  v_fornecedores jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_busca := nullif(btrim(p_filtros->>'busca'), '');
  v_busca_digitos := regexp_replace(coalesce(v_busca, ''), '\D', '', 'g');
  v_ativo := nullif(btrim(p_filtros->>'ativo'), '');

  select coalesce(jsonb_agg(t order by lower(t.nome), t.id), '[]'::jsonb)
    into v_fornecedores
    from (
      select
        f.id,
        f.nome,
        f.cnpj,
        f.telefone,
        f.email,
        f.contato,
        f.observacao,
        f.ativo,
        f.created_at,
        f.updated_at
      from public.fornecedores f
      where (v_ativo is null or f.ativo = (v_ativo = 'true'))
        and (
          v_busca is null
          or lower(f.nome) like '%' || lower(v_busca) || '%'
          or lower(coalesce(f.contato, '')) like '%' || lower(v_busca) || '%'
          or (
            v_busca_digitos <> ''
            and (
              coalesce(f.cnpj, '') like '%' || v_busca_digitos || '%'
              or coalesce(f.telefone, '') like '%' || v_busca_digitos || '%'
            )
          )
        )
    ) t;

  return jsonb_build_object('ok', true, 'fornecedores', v_fornecedores);
end;
$$;

-- ============================================================
-- 2) RPC — admin_obter_fornecedor
-- ============================================================
create or replace function public.admin_obter_fornecedor(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_fornecedor jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select to_jsonb(f.*) into v_fornecedor
    from public.fornecedores f
   where f.id = p_id;

  if v_fornecedor is null then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Fornecedor não encontrado.');
  end if;

  return jsonb_build_object('ok', true, 'fornecedor', v_fornecedor);
end;
$$;

-- ============================================================
-- 3) RPC — admin_criar_fornecedor
-- ============================================================
create or replace function public.admin_criar_fornecedor(p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_validacao jsonb;
  v_dados jsonb;
  v_ativo boolean := true;
  v_fornecedor jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  v_validacao := public.admin_validar_dados_fornecedor(p_dados);

  if v_validacao->>'ok' <> 'true' then
    return v_validacao;
  end if;

  v_dados := v_validacao->'dados';

  if p_dados is not null
     and jsonb_typeof(p_dados->'ativo') = 'boolean' then
    v_ativo := (p_dados->>'ativo')::boolean;
  end if;

  if v_dados->>'cnpj' is not null
     and exists (select 1 from public.fornecedores where cnpj = v_dados->>'cnpj') then
    return jsonb_build_object('ok', false, 'codigo', 'CNPJ_DUPLICADO', 'erro', 'Já existe um fornecedor cadastrado com este CNPJ.');
  end if;

  insert into public.fornecedores (nome, cnpj, telefone, email, contato, observacao, ativo)
  values (
    v_dados->>'nome',
    v_dados->>'cnpj',
    v_dados->>'telefone',
    v_dados->>'email',
    v_dados->>'contato',
    v_dados->>'observacao',
    v_ativo
  )
  returning to_jsonb(fornecedores.*) into v_fornecedor;

  return jsonb_build_object('ok', true, 'fornecedor', v_fornecedor);
end;
$$;

-- ============================================================
-- 4) RPC — admin_atualizar_fornecedor
-- ============================================================
create or replace function public.admin_atualizar_fornecedor(p_id bigint, p_dados jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
  v_validacao jsonb;
  v_dados jsonb;
  v_ativo boolean;
  v_fornecedor jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select id into v_id
    from public.fornecedores
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Fornecedor não encontrado.');
  end if;

  v_validacao := public.admin_validar_dados_fornecedor(p_dados);

  if v_validacao->>'ok' <> 'true' then
    return v_validacao;
  end if;

  v_dados := v_validacao->'dados';

  select ativo into v_ativo
    from public.fornecedores
   where id = p_id;

  if p_dados is not null
     and jsonb_typeof(p_dados->'ativo') = 'boolean' then
    v_ativo := (p_dados->>'ativo')::boolean;
  end if;

  if v_dados->>'cnpj' is not null
     and exists (
       select 1 from public.fornecedores
        where cnpj = v_dados->>'cnpj'
          and id <> p_id
     ) then
    return jsonb_build_object('ok', false, 'codigo', 'CNPJ_DUPLICADO', 'erro', 'Já existe um fornecedor cadastrado com este CNPJ.');
  end if;

  update public.fornecedores
     set nome = v_dados->>'nome',
         cnpj = v_dados->>'cnpj',
         telefone = v_dados->>'telefone',
         email = v_dados->>'email',
         contato = v_dados->>'contato',
         observacao = v_dados->>'observacao',
         ativo = v_ativo,
         updated_at = now()
   where id = p_id
  returning to_jsonb(fornecedores.*) into v_fornecedor;

  return jsonb_build_object('ok', true, 'fornecedor', v_fornecedor);
end;
$$;

-- ============================================================
-- 5) RPC — admin_alterar_status_fornecedor
-- ============================================================
-- Desativação/reativação (ativo=true|false). Nunca apaga o registro.
create or replace function public.admin_alterar_status_fornecedor(p_id bigint, p_ativo boolean)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id bigint;
  v_fornecedor jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_ativo is null then
    return jsonb_build_object('ok', false, 'codigo', 'DADOS_INVALIDOS', 'erro', 'Status inválido.');
  end if;

  select id into v_id
    from public.fornecedores
   where id = p_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Fornecedor não encontrado.');
  end if;

  update public.fornecedores
     set ativo = p_ativo,
         updated_at = now()
   where id = p_id
  returning to_jsonb(fornecedores.*) into v_fornecedor;

  return jsonb_build_object('ok', true, 'fornecedor', v_fornecedor);
end;
$$;

-- ============================================================
-- 6) PERMISSÕES
-- ============================================================
-- Helper interno: não exposto a authenticated/anon.
revoke all on function public.admin_validar_dados_fornecedor(jsonb) from public;
revoke execute on function public.admin_validar_dados_fornecedor(jsonb) from anon, authenticated;

-- RPCs administrativas: padrão do projeto.
revoke all on function public.admin_listar_fornecedores(jsonb) from public;
revoke all on function public.admin_obter_fornecedor(bigint) from public;
revoke all on function public.admin_criar_fornecedor(jsonb) from public;
revoke all on function public.admin_atualizar_fornecedor(bigint, jsonb) from public;
revoke all on function public.admin_alterar_status_fornecedor(bigint, boolean) from public;

revoke execute on function public.admin_listar_fornecedores(jsonb) from anon;
revoke execute on function public.admin_obter_fornecedor(bigint) from anon;
revoke execute on function public.admin_criar_fornecedor(jsonb) from anon;
revoke execute on function public.admin_atualizar_fornecedor(bigint, jsonb) from anon;
revoke execute on function public.admin_alterar_status_fornecedor(bigint, boolean) from anon;

grant execute on function public.admin_listar_fornecedores(jsonb) to authenticated, service_role;
grant execute on function public.admin_obter_fornecedor(bigint) to authenticated, service_role;
grant execute on function public.admin_criar_fornecedor(jsonb) to authenticated, service_role;
grant execute on function public.admin_atualizar_fornecedor(bigint, jsonb) to authenticated, service_role;
grant execute on function public.admin_alterar_status_fornecedor(bigint, boolean) to authenticated, service_role;
