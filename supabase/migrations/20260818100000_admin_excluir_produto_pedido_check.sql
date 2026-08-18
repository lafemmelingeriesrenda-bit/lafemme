-- ============================================================
-- La Femme — Fase 7B: bloqueio explícito de exclusão de produto
-- vinculado a pedidos
--
-- Recria public.admin_excluir_produto para detectar, ANTES de
-- tentar excluir, se o produto possui variantes referenciadas em
-- itens de pedido (FK itens_pedido_produto_variante_id_fkey).
--
-- Regra de negócio NÃO muda: a FK continua intacta (sem CASCADE),
-- o histórico de pedidos é preservado e produtos utilizados em
-- pedidos continuam impossíveis de excluir. A diferença é que a
-- RPC passa a retornar um erro identificável (codigo
-- 'PRODUTO_EM_PEDIDO') em vez de deixar o banco estourar a
-- violação de FK em texto bruto.
--
-- Preserva:
--   * SECURITY DEFINER;
--   * public.is_admin() / auth.role() <> 'service_role';
--   * lock SELECT ... FOR UPDATE;
--   * transação (rollback implícito da função);
--   * limpeza de Storage pela API após confirmação do banco.
--
-- IMPORTANTE: NÃO executar automaticamente. Revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

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

  -- Integridade de pedidos: produto com variantes já usadas em
  -- itens de pedido não pode ser excluído. A FK continua sendo a
  -- proteção real; este bloco apenas torna o bloqueio explícito.
  if exists (
    select 1
      from public.itens_pedido ip
      join public.produto_variante pv on pv.id = ip.produto_variante_id
     where pv.produto_id = p_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'codigo', 'PRODUTO_EM_PEDIDO',
      'erro', 'Este produto não pode ser excluído porque já está vinculado a um pedido.'
    );
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

-- Permissões preservadas (idempotente).
revoke all on function public.admin_excluir_produto(integer) from public;
revoke execute on function public.admin_excluir_produto(integer) from anon;
grant execute on function public.admin_excluir_produto(integer) to authenticated, service_role;