-- ============================================================
-- La Femme — Ajustes manuais de estoque auditáveis
--
-- Substitui a edição direta de produto_variante.quantidade por um
-- fluxo auditável:
--   * coluna movimentos_estoque.motivo (motivo estruturado);
--   * RPC public.admin_ajustar_estoque_variante(...);
--   * admin_criar_produto e admin_atualizar_produto deixam de gravar
--     quantidade arbitrariamente.
--
-- Decisões:
--   * ajuste infere tipo pela diferença (ajuste_positivo/ajuste_negativo);
--     quantidade do movimento é sempre positiva;
--   * variante NOVA (via cadastro de produto) inicia em quantidade 0;
--     o estoque inicial é definido pela ação "Ajustar estoque"
--     (gera movimento auditável);
--   * variante EXISTENTE tem a quantidade preservada por
--     admin_atualizar_produto; só admin_ajustar_estoque_variante a altera;
--   * concorrência otimista opcional via p_quantidade_esperada.
--
-- NÃO altera admin_confirmar_recebimento_compra nem admin_finalizar_pedido.
-- NÃO implementa custo médio/CMV.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

-- ============================================================
-- 1) Coluna motivo + constraints
-- ============================================================
alter table public.movimentos_estoque
  add column if not exists motivo text null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'movimentos_estoque_motivo_check') then
    alter table public.movimentos_estoque
      add constraint movimentos_estoque_motivo_check
      check (
        motivo is null
        or motivo in (
          'avaria', 'brinde', 'promocao', 'perda', 'uso_interno',
          'erro_inventario', 'devolucao_fornecedor',
          'inventario', 'correcao_cadastro', 'devolucao_cliente',
          'retorno_promocao', 'outro'
        )
      );
  end if;

  if not exists (select 1 from pg_constraint where conname = 'movimentos_estoque_ajuste_motivo_check') then
    alter table public.movimentos_estoque
      add constraint movimentos_estoque_ajuste_motivo_check
      check (
        tipo not in ('ajuste_positivo', 'ajuste_negativo')
        or motivo is not null
      );
  end if;
end $$;

-- ============================================================
-- 2) RPC — admin_ajustar_estoque_variante
-- ============================================================
create or replace function public.admin_ajustar_estoque_variante(
  p_variante_id bigint,
  p_nova_quantidade integer,
  p_motivo text,
  p_observacao text default null,
  p_quantidade_esperada integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_quantidade_atual integer;
  v_diferenca integer;
  v_tipo text;
  v_motivo text;
  v_observacao text;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  select quantidade into v_quantidade_atual
    from public.produto_variante
   where id = p_variante_id
     for update;

  if not found then
    return jsonb_build_object('ok', false, 'codigo', 'NAO_ENCONTRADO', 'erro', 'Variante não encontrada.');
  end if;

  if p_nova_quantidade is null or p_nova_quantidade < 0 then
    return jsonb_build_object('ok', false, 'codigo', 'QUANTIDADE_INVALIDA', 'erro', 'A nova quantidade deve ser um inteiro maior ou igual a zero.');
  end if;

  if p_quantidade_esperada is not null and p_quantidade_esperada <> v_quantidade_atual then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'ESTOQUE_ALTERADO',
      'erro', 'O estoque desta variante foi alterado desde que você abriu a tela. Atualize os dados e tente novamente.'
    );
  end if;

  v_diferenca := p_nova_quantidade - v_quantidade_atual;

  if v_diferenca = 0 then
    return jsonb_build_object('ok', false, 'codigo', 'SEM_ALTERACAO', 'erro', 'A nova quantidade é igual à atual.');
  end if;

  if v_diferenca > 0 then
    v_tipo := 'ajuste_positivo';
  else
    v_tipo := 'ajuste_negativo';
  end if;

  v_motivo := nullif(btrim(coalesce(p_motivo, '')), '');

  if v_tipo = 'ajuste_positivo' then
    if v_motivo is null or v_motivo not in ('inventario', 'correcao_cadastro', 'devolucao_cliente', 'retorno_promocao', 'outro') then
      return jsonb_build_object('ok', false, 'codigo', 'MOTIVO_INVALIDO', 'erro', 'Motivo inválido para entrada manual de estoque.');
    end if;
  else
    if v_motivo is null or v_motivo not in ('avaria', 'brinde', 'promocao', 'perda', 'uso_interno', 'erro_inventario', 'devolucao_fornecedor', 'outro') then
      return jsonb_build_object('ok', false, 'codigo', 'MOTIVO_INVALIDO', 'erro', 'Motivo inválido para saída manual de estoque.');
    end if;
  end if;

  v_observacao := nullif(btrim(coalesce(p_observacao, '')), '');

  if v_motivo = 'outro' and v_observacao is null then
    return jsonb_build_object('ok', false, 'codigo', 'OBSERVACAO_OBRIGATORIA', 'erro', 'Para o motivo "Outro", informe uma observação.');
  end if;

  update public.produto_variante
     set quantidade = p_nova_quantidade,
         updated_at = now()
   where id = p_variante_id;

  insert into public.movimentos_estoque (
    produto_variante_id, tipo, quantidade, motivo, observacao
  )
  values (
    p_variante_id, v_tipo, abs(v_diferenca), v_motivo, v_observacao
  );

  return jsonb_build_object(
    'ok', true,
    'quantidade_anterior', v_quantidade_atual,
    'quantidade_nova', p_nova_quantidade,
    'diferenca', v_diferenca,
    'tipo', v_tipo,
    'motivo', v_motivo
  );
end;
$$;

-- ============================================================
-- 3) admin_criar_produto — nova variante inicia em 0
-- ============================================================
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

  -- Estoque inicial é sempre 0; a quantidade é definida exclusivamente
  -- pela RPC admin_ajustar_estoque_variante (movimento auditável).
  for v_item in select * from jsonb_array_elements(v_variantes) loop
    insert into public.produto_variante (produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo)
    values (
      v_produto_id,
      v_item->>'cor',
      v_item->>'tamanho',
      (v_item->>'valor')::numeric,
      0,
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

-- ============================================================
-- 4) admin_atualizar_produto — preserva quantidade de variantes
--    existentes; novas variantes iniciam em 0.
-- ============================================================
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

      -- Quantidade NÃO é alterada aqui: preserva o valor atual.
      if v_atual.historica then
        update public.produto_variante
           set valor = (v_item->>'valor')::numeric,
               ativo = (v_item->>'ativo')::boolean,
               foto = v_capa,
               updated_at = now()
         where id = v_id;
      else
        update public.produto_variante
           set cor = v_item->>'cor',
               tamanho = v_item->>'tamanho',
               valor = (v_item->>'valor')::numeric,
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
      -- Nova variante: quantidade inicial 0 (ajuste auditável depois).
      insert into public.produto_variante (
        produto_id, cor, tamanho, valor, quantidade, sku, foto, ativo
      )
      values (
        p_id,
        v_item->>'cor',
        v_item->>'tamanho',
        (v_item->>'valor')::numeric,
        0,
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

-- ============================================================
-- 5) PERMISSÕES
-- ============================================================
revoke all on function public.admin_ajustar_estoque_variante(bigint, integer, text, text, integer) from public;
revoke execute on function public.admin_ajustar_estoque_variante(bigint, integer, text, text, integer) from anon;
grant execute on function public.admin_ajustar_estoque_variante(bigint, integer, text, text, integer) to authenticated, service_role;

revoke all on function public.admin_criar_produto(jsonb) from public;
revoke execute on function public.admin_criar_produto(jsonb) from anon;
grant execute on function public.admin_criar_produto(jsonb) to authenticated, service_role;

revoke all on function public.admin_atualizar_produto(integer, jsonb) from public;
revoke execute on function public.admin_atualizar_produto(integer, jsonb) from anon;
grant execute on function public.admin_atualizar_produto(integer, jsonb) to authenticated, service_role;
