-- ============================================================
-- La Femme — Fase 8B: proteção da edição de produto em pedidos
--
-- Problema (auditoria 8A): admin_atualizar_produto faz delete +
-- insert de todas as variantes. Quando o produto já possui itens
-- em itens_pedido (FK sem ON DELETE CASCADE), o DELETE das
-- variantes estoura a violação de FK em texto bruto, quebrando a
-- edição de produtos com histórico de pedidos.
--
-- Solução: adicionar guarda explícita ANTES da substituição
-- destrutiva. Se o produto possui alguma variante referenciada em
-- itens_pedido, a RPC retorna codigo 'PRODUTO_EM_PEDIDO' e NÃO
-- altera nada (mesmo padrão já usado em admin_excluir_produto).
--
-- Preserva:
--   * SECURITY DEFINER;
--   * public.is_admin() / auth.role() <> 'service_role';
--   * lock SELECT ... FOR UPDATE;
--   * transação (rollback implícito da função);
--   * slug seguro contra race condition (constraint UNIQUE);
--   * storage fora da transação (limpeza pela API após confirmação).
--
-- Histórico de pedidos continua preservado: nada é apagado.
-- Produtos com pedidos deixam de ser editáveis nesta fase
-- (prioridade: histórico > facilidade de recriação de variantes).
--
-- IMPORTANTE: NÃO executar automaticamente. Revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
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

  -- Integridade de pedidos: produto com variantes já usadas em
  -- itens de pedido não pode ter suas variantes recriadas. A FK
  -- continua sendo a proteção real; este bloco apenas torna o
  -- bloqueio explícito e identificável (codigo 'PRODUTO_EM_PEDIDO').
  if exists (
    select 1
      from public.itens_pedido ip
      join public.produto_variante pv on pv.id = ip.produto_variante_id
     where pv.produto_id = p_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'PRODUTO_EM_PEDIDO',
      'erro', 'Este produto não pode ser alterado porque já está vinculado a um pedido.'
    );
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

-- Permissões preservadas (idempotente).
revoke all on function public.admin_atualizar_produto(integer, jsonb) from public;
revoke execute on function public.admin_atualizar_produto(integer, jsonb) from anon;
grant execute on function public.admin_atualizar_produto(integer, jsonb) to authenticated, service_role;