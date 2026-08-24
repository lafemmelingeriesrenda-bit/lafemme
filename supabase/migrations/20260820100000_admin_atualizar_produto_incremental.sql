-- ============================================================
-- La Femme — Etapa 2A: atualização incremental de produtos
--
-- Preserva IDs de variantes e impede alterações destrutivas em
-- variantes que já possuem histórico em itens_pedido.
--
-- IMPORTANTE:
--   * não altera criar_pedido;
--   * não altera admin_finalizar_pedido;
--   * não altera /api/carrinho/validar;
--   * Storage continua sendo tratado pela API após o commit.
--   * A guarda produtoEmPedido() do endpoint permanece nesta etapa.
-- ============================================================

-- ---------- Validação/normalização do payload ----------
create or replace function public.admin_validar_dados_produto(p_dados jsonb)
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
  v_item jsonb;
  v_id bigint;
  v_tamanho text;
  v_cor text;
  v_sku text;
  v_valor numeric;
  v_quantidade numeric;
  v_ativo boolean;
  v_imagens jsonb;
  v_imagens_norm jsonb;
  v_url text;
  v_norm text;
  v_chave_cor text;
  v_chave_combinacao text;
  v_chaves text[] := '{}'::text[];
  v_cores_unico text[] := '{}'::text[];
  v_cores_regulares text[] := '{}'::text[];
begin
  if jsonb_typeof(p_dados) <> 'object' then
    return jsonb_build_object('ok', false, 'erro', 'Payload inválido.');
  end if;

  v_nome := p_dados->>'nome';
  v_norm := case when v_nome is null then null else trim(regexp_replace(v_nome, '\s+', ' ', 'g')) end;
  if v_norm is null or v_norm = '' or length(v_norm) > 120 then
    return jsonb_build_object('ok', false, 'erro', 'Nome do produto é obrigatório (1 a 120 caracteres).');
  end if;
  v_nome := v_norm;

  v_descricao := p_dados->>'descricao';
  if v_descricao is not null and length(trim(v_descricao)) > 2000 then
    return jsonb_build_object('ok', false, 'erro', 'Descrição deve ter no máximo 2000 caracteres.');
  end if;
  v_descricao := nullif(trim(v_descricao), '');

  v_categoria := p_dados->>'categoria';
  v_norm := case when v_categoria is null then null else trim(regexp_replace(v_categoria, '\s+', ' ', 'g')) end;
  if v_norm is not null and length(v_norm) > 100 then
    return jsonb_build_object('ok', false, 'erro', 'Categoria deve ter no máximo 100 caracteres.');
  end if;
  v_categoria := nullif(v_norm, '');

  v_capa := nullif(p_dados->>'capa', '');
  if v_capa is not null and (length(v_capa) > 2048 or v_capa !~ '^https?://') then
    return jsonb_build_object('ok', false, 'erro', 'Imagem de capa inválida.');
  end if;

  v_variantes := p_dados->'variantes';
  if v_variantes is null or jsonb_typeof(v_variantes) <> 'array' then
    return jsonb_build_object('ok', false, 'erro', 'Variantes deve ser uma lista.');
  end if;

  for v_item in select value from jsonb_array_elements(v_variantes) loop
    if jsonb_typeof(v_item) <> 'object' then
      return jsonb_build_object('ok', false, 'erro', 'Cada variante deve ser um objeto.');
    end if;

    v_id := null;
    if not v_item ? 'id' then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'VARIANTE_ID_AUSENTE',
        'erro', 'A propriedade id da variante é obrigatória.'
      );
    end if;
    if jsonb_typeof(v_item->'id') not in ('null', 'number') then
      return jsonb_build_object('ok', false, 'erro', 'ID da variante inválido.');
    end if;
    if jsonb_typeof(v_item->'id') = 'number' then
      v_id := (v_item->>'id')::bigint;
      if v_id <= 0 then
        return jsonb_build_object('ok', false, 'erro', 'ID da variante inválido.');
      end if;
    end if;

    v_tamanho := v_item->>'tamanho';
    v_norm := case when v_tamanho is null then null else trim(regexp_replace(v_tamanho, '\s+', ' ', 'g')) end;
    if v_norm is null or v_norm = '' or length(v_norm) > 20 then
      return jsonb_build_object('ok', false, 'erro', 'Tamanho é obrigatório em cada variante.');
    end if;
    v_tamanho := v_norm;

    v_cor := v_item->>'cor';
    v_norm := case when v_cor is null then null else trim(regexp_replace(v_cor, '\s+', ' ', 'g')) end;
    if v_norm is not null and length(v_norm) > 60 then
      return jsonb_build_object('ok', false, 'erro', 'Cor deve ter no máximo 60 caracteres.');
    end if;
    v_cor := nullif(v_norm, '');

    v_chave_cor := lower(coalesce(v_cor, ''));
    v_chave_combinacao := v_chave_cor || chr(31) || v_tamanho;

    if v_chave_combinacao = any(v_chaves) then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'COMBINACAO_VARIANTE_DUPLICADA',
        'erro', 'A combinação de cor e tamanho está duplicada.'
      );
    end if;
    v_chaves := v_chaves || v_chave_combinacao;

    if v_tamanho = 'Tamanho Único' then
      if v_chave_cor = any(v_cores_regulares) then
        return jsonb_build_object(
          'ok', false,
          'codigo', 'TAMANHO_UNICO_INCOMPATIVEL',
          'erro', 'Tamanho Único não pode combinar com tamanhos regulares na mesma cor.'
        );
      end if;
      v_cores_unico := v_cores_unico || v_chave_cor;
    else
      if v_chave_cor = any(v_cores_unico) then
        return jsonb_build_object(
          'ok', false,
          'codigo', 'TAMANHO_UNICO_INCOMPATIVEL',
          'erro', 'Tamanho Único não pode combinar com tamanhos regulares na mesma cor.'
        );
      end if;
      v_cores_regulares := v_cores_regulares || v_chave_cor;
    end if;

    if v_item->'valor' is null or jsonb_typeof(v_item->'valor') <> 'number' then
      return jsonb_build_object('ok', false, 'erro', 'Valor deve ser um número maior ou igual a zero.');
    end if;
    v_valor := (v_item->>'valor')::numeric;
    if v_valor < 0 then
      return jsonb_build_object('ok', false, 'erro', 'Valor deve ser um número maior ou igual a zero.');
    end if;

    if v_item->'quantidade' is null or jsonb_typeof(v_item->'quantidade') <> 'number' then
      return jsonb_build_object('ok', false, 'erro', 'Quantidade deve ser um inteiro maior ou igual a zero.');
    end if;
    v_quantidade := (v_item->>'quantidade')::numeric;
    if v_quantidade < 0 or v_quantidade <> trunc(v_quantidade) then
      return jsonb_build_object('ok', false, 'erro', 'Quantidade deve ser um inteiro maior ou igual a zero.');
    end if;

    v_sku := v_item->>'sku';
    v_norm := case when v_sku is null then null else trim(regexp_replace(v_sku, '\s+', ' ', 'g')) end;
    if v_norm is not null and length(v_norm) > 40 then
      return jsonb_build_object('ok', false, 'erro', 'SKU deve ter no máximo 40 caracteres.');
    end if;
    v_sku := nullif(v_norm, '');

    if not v_item ? 'ativo' then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'VARIANTE_ATIVO_AUSENTE',
        'erro', 'Ativo da variante é obrigatório.'
      );
    end if;
    if jsonb_typeof(v_item->'ativo') <> 'boolean' then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'VARIANTE_ATIVO_INVALIDO',
        'erro', 'Ativo deve ser um booleano.'
      );
    end if;
    v_ativo := (v_item->>'ativo')::boolean;

    v_imagens := v_item->'imagens';
    if v_imagens is null or jsonb_typeof(v_imagens) <> 'array' then
      return jsonb_build_object('ok', false, 'erro', 'Imagens da variante deve ser uma lista de URLs.');
    end if;

    v_imagens_norm := '[]'::jsonb;
    for v_url in select value from jsonb_array_elements_text(v_imagens) loop
      if v_url is null or v_url = '' or length(v_url) > 2048 or v_url !~ '^https?://' then
        return jsonb_build_object('ok', false, 'erro', 'URL de imagem inválida.');
      end if;
      v_imagens_norm := v_imagens_norm || jsonb_build_array(v_url);
    end loop;

    v_variantes_norm := v_variantes_norm || jsonb_build_array(jsonb_build_object(
      'id', v_id,
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

-- ---------- Atualização incremental ----------
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
  v_id bigint;
  v_id_atual bigint;
  v_nome_atual text;
  v_slug_atual text;
  v_base_slug text;
  v_slug text;
  v_item jsonb;
  v_atual record;
  v_variante_id bigint;
  v_foto_id bigint;
  v_url text;
  v_imagens text[];
  v_fotos jsonb;
  v_campos_bloqueados jsonb;
  v_ids_enviados bigint[] := '{}'::bigint[];
  v_variantes_resultado jsonb := '[]'::jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_dados is null or jsonb_typeof(p_dados) <> 'object' then
    return jsonb_build_object('ok', false, 'codigo', 'PAYLOAD_INVALIDO', 'erro', 'Payload inválido.');
  end if;

  select id, nome, slug
    into v_id_atual, v_nome_atual, v_slug_atual
    from public.produtos
   where id = p_id
   for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Produto não encontrado.');
  end if;

  -- EXCLUSIVE impede que criar_pedido/admin_finalizar_pedido adquiram
  -- ROW SHARE e locks de variantes enquanto esta operação mantém o
  -- conjunto completo bloqueado. A ordem evita deadlock sem alterar as
  -- RPCs de pedidos, mas serializa operações que escrevem variantes.
  lock table public.produto_variante in exclusive mode;

  drop table if exists _produto_variantes_edicao;

  create temp table _produto_variantes_edicao on commit drop as
  select
    pv.id,
    pv.produto_id,
    pv.cor,
    pv.tamanho,
    pv.valor,
    pv.quantidade,
    pv.sku,
    pv.foto,
    pv.ativo,
    exists (
      select 1
        from public.itens_pedido ip
       where ip.produto_variante_id = pv.id
    ) as historica
  from public.produto_variante pv
  where pv.produto_id = p_id
  order by pv.id
  for update of pv;

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

  -- Valida todos os IDs e a identidade das variantes antes de qualquer escrita.
  for v_item in select value from jsonb_array_elements(v_variantes) loop
    if jsonb_typeof(v_item->'id') = 'number' then
      v_id := (v_item->>'id')::bigint;

      if v_id = any(v_ids_enviados) then
        return jsonb_build_object(
          'ok', false,
          'codigo', 'VARIANTE_ID_DUPLICADO',
          'erro', 'O mesmo ID de variante foi enviado mais de uma vez.',
          'varianteId', v_id
        );
      end if;
      v_ids_enviados := v_ids_enviados || v_id;

      select * into v_atual
        from _produto_variantes_edicao
       where id = v_id;

      if not found then
        if exists (select 1 from public.produto_variante where id = v_id) then
          return jsonb_build_object(
            'ok', false,
            'codigo', 'VARIANTE_FORA_DO_PRODUTO',
            'erro', 'A variante não pertence ao produto editado.',
            'varianteId', v_id
          );
        end if;

        return jsonb_build_object(
          'ok', false,
          'codigo', 'VARIANTE_NAO_ENCONTRADA',
          'erro', 'A variante informada não existe.',
          'varianteId', v_id
        );
      end if;

      if v_atual.historica then
        v_campos_bloqueados := '[]'::jsonb;

        if nullif(regexp_replace(lower(trim(coalesce(v_atual.cor, ''))), '\s+', ' ', 'g'), '')
             is distinct from nullif(regexp_replace(lower(trim(coalesce(v_item->>'cor', ''))), '\s+', ' ', 'g'), '') then
          v_campos_bloqueados := v_campos_bloqueados || jsonb_build_array('cor');
        end if;
        if regexp_replace(trim(coalesce(v_atual.tamanho, '')), '\s+', ' ', 'g')
             is distinct from regexp_replace(trim(coalesce(v_item->>'tamanho', '')), '\s+', ' ', 'g') then
          v_campos_bloqueados := v_campos_bloqueados || jsonb_build_array('tamanho');
        end if;
        if nullif(regexp_replace(trim(coalesce(v_atual.sku, '')), '\s+', ' ', 'g'), '')
             is distinct from nullif(regexp_replace(trim(coalesce(v_item->>'sku', '')), '\s+', ' ', 'g'), '') then
          v_campos_bloqueados := v_campos_bloqueados || jsonb_build_array('sku');
        end if;

        if jsonb_array_length(v_campos_bloqueados) > 0 then
          return jsonb_build_object(
            'ok', false,
            'codigo', 'VARIANTE_HISTORICA_IMUTAVEL',
            'erro', 'A identidade comercial da variante histórica não pode ser alterada.',
            'varianteId', v_id,
            'camposBloqueados', v_campos_bloqueados
          );
        end if;
      end if;
    end if;
  end loop;

  -- Uma variante histórica ausente do estado completo não pode ser removida.
  for v_atual in
    select t.*
      from _produto_variantes_edicao t
     where not (t.id = any(v_ids_enviados))
  loop
    if v_atual.historica then
      return jsonb_build_object(
        'ok', false,
        'codigo', 'VARIANTE_HISTORICA_IMUTAVEL',
        'erro', 'A variante histórica não pode ser removida.',
        'varianteId', v_atual.id
      );
    end if;
  end loop;

  update public.produtos
     set nome = v_nome,
         descricao = v_descricao,
         categoria = v_categoria,
         updated_at = now()
   where id = p_id;

  if v_slug_atual is not null and v_nome_atual = v_nome then
    v_slug := v_slug_atual;
  else
    v_base_slug := public.slugificar(v_nome);
    if v_base_slug = '' then
      v_base_slug := 'produto-' || p_id;
    end if;

    v_id := 1;
    loop
      v_slug := case when v_id = 1 then v_base_slug else v_base_slug || '-' || (v_id + 1) end;
      begin
        update public.produtos
           set slug = v_slug,
               updated_at = now()
         where id = p_id;
        exit;
      exception
        when unique_violation then
          if v_id >= 100 then
            raise exception 'Não foi possível gerar um slug único.' using errcode = 'P0001';
          end if;
          v_id := v_id + 1;
      end;
    end loop;
  end if;

  for v_item in select value from jsonb_array_elements(v_variantes) loop
    v_id := null;
    if jsonb_typeof(v_item->'id') = 'number' then
      v_id := (v_item->>'id')::bigint;
    end if;

    if v_id is not null then
      select * into v_atual
        from _produto_variantes_edicao
       where id = v_id;

      if v_atual.historica then
        update public.produto_variante
           set valor = (v_item->>'valor')::numeric,
               quantidade = (v_item->>'quantidade')::integer,
               ativo = (v_item->>'ativo')::boolean,
               foto = v_capa,
               updated_at = now()
         where id = v_id;
      else
        update public.produto_variante
           set cor = v_item->>'cor',
               tamanho = v_item->>'tamanho',
               valor = (v_item->>'valor')::numeric,
               quantidade = (v_item->>'quantidade')::integer,
               sku = v_item->>'sku',
               ativo = (v_item->>'ativo')::boolean,
               foto = v_capa,
               updated_at = now()
         where id = v_id;
      end if;

      select coalesce(array_agg(value), '{}'::text[])
        into v_imagens
        from jsonb_array_elements_text(v_item->'imagens');

      delete from public.foto_variante
       where id_variante = v_id
         and not (url = any(v_imagens));

      foreach v_url in array v_imagens loop
        if not exists (
          select 1 from public.foto_variante
           where id_variante = v_id and url = v_url
        ) then
          insert into public.foto_variante (url, id_variante)
          values (v_url, v_id)
          returning id into v_foto_id;
        end if;
      end loop;
    else
      insert into public.produto_variante (
        produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo
      )
      values (
        p_id,
        v_item->>'cor',
        v_item->>'tamanho',
        (v_item->>'valor')::numeric,
        (v_item->>'quantidade')::integer,
        v_item->>'sku',
        v_capa,
        (v_item->>'ativo')::boolean
      )
      returning id into v_variante_id;

      v_fotos := '[]'::jsonb;
      for v_url in select value from jsonb_array_elements_text(v_item->'imagens') loop
        insert into public.foto_variante (url, id_variante)
        values (v_url, v_variante_id)
        returning id into v_foto_id;
        v_fotos := v_fotos || jsonb_build_array(jsonb_build_object('id', v_foto_id, 'url', v_url));
      end loop;

      v_variantes_resultado := v_variantes_resultado || jsonb_build_array(
        jsonb_build_object('id', v_variante_id, 'fotos', v_fotos)
      );
      continue;
    end if;

    select coalesce(
      jsonb_agg(jsonb_build_object('id', fv.id, 'url', fv.url) order by fv.id),
      '[]'::jsonb
    ) into v_fotos
    from public.foto_variante fv
    where fv.id_variante = v_id;

    v_variantes_resultado := v_variantes_resultado || jsonb_build_array(
      jsonb_build_object('id', v_id, 'fotos', v_fotos)
    );
  end loop;

  for v_atual in
    select t.*
      from _produto_variantes_edicao t
     where not (t.id = any(v_ids_enviados))
  loop
    delete from public.foto_variante where id_variante = v_atual.id;
    delete from public.produto_variante where id = v_atual.id;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'id', p_id,
    'variantes', v_variantes_resultado
  );
end;
$$;

revoke all on function public.admin_atualizar_produto(integer, jsonb) from public;
revoke execute on function public.admin_atualizar_produto(integer, jsonb) from anon;
grant execute on function public.admin_atualizar_produto(integer, jsonb) to authenticated, service_role;
