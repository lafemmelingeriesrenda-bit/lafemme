-- ============================================================
-- La Femme — Relatórios (Fase 4): relatório financeiro de compras
--
-- Cria UMA RPC SECURITY DEFINER que agrega, no banco, compras e
-- despesas de um período. NÃO cria/alterar tabelas, colunas ou índices.
--
--   GET -> public.admin_relatorio_financeiro_compras(p_filtros jsonb)
--
-- Filtros (jsonb): dataInicio e dataFim (YYYY-MM-DD, opcionais).
--
-- Regras financeiras desta fase:
--   * compras CANCELADAS são excluídas de todos os indicadores;
--   * NÃO calcula lucro, margem, CMV, custo médio ou valor de estoque;
--   * 'pendente' operacional é diferente de 'pendente' de pagamento.
--
-- Retorna:
--   resumo (total/mercadorias/despesas/pago/pendente/quantidade_compras),
--   despesas_por_categoria, compras_por_fornecedor,
--   evolucao_mensal e pendencias (status_pagamento = 'pendente').
--
-- Segurança: SECURITY DEFINER + search_path fixo + guarda admin/
-- service_role; EXECUTE apenas para authenticated e service_role.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

create or replace function public.admin_relatorio_financeiro_compras(p_filtros jsonb default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inicio date;
  v_fim date;
  v_resultado jsonb;
begin
  if not public.is_admin() and auth.role() <> 'service_role' then
    raise exception 'Acesso negado.' using errcode = '42501';
  end if;

  if p_filtros->>'dataInicio' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_inicio := (p_filtros->>'dataInicio')::date;
  end if;

  if p_filtros->>'dataFim' ~ '^\d{4}-\d{2}-\d{2}$' then
    v_fim := (p_filtros->>'dataFim')::date;
  end if;

  with base as (
    select
      c.id,
      c.tipo,
      c.categoria,
      c.descricao,
      c.fornecedor_id,
      f.nome as fornecedor_nome,
      c.data_compra,
      c.total,
      c.status,
      c.status_pagamento,
      c.vencimento
    from public.compras c
    left join public.fornecedores f on f.id = c.fornecedor_id
    where c.status <> 'cancelada'
      and (v_inicio is null or c.data_compra >= v_inicio)
      and (v_fim is null or c.data_compra <= v_fim)
  ),
  tot as (
    select
      coalesce(sum(total), 0) as total_geral,
      coalesce(sum(total) filter (where tipo = 'despesa'), 0) as total_despesas
    from base
  )
  select jsonb_build_object(
    'ok', true,
    'periodo', jsonb_build_object('dataInicio', v_inicio, 'dataFim', v_fim),
    'resumo', (
      select jsonb_build_object(
        'total', coalesce(sum(total), 0)::numeric(14,2),
        'mercadorias', coalesce(sum(total) filter (where tipo = 'mercadoria'), 0)::numeric(14,2),
        'despesas', coalesce(sum(total) filter (where tipo = 'despesa'), 0)::numeric(14,2),
        'pago', coalesce(sum(total) filter (where status_pagamento = 'pago'), 0)::numeric(14,2),
        'pendente', coalesce(sum(total) filter (where status_pagamento = 'pendente'), 0)::numeric(14,2),
        'quantidade_compras', count(*)::int
      )
      from base
    ),
    'despesas_por_categoria', (
      select coalesce(jsonb_agg(t order by t.total desc, t.categoria), '[]'::jsonb)
      from (
        select
          b.categoria,
          sum(b.total)::numeric(14,2) as total,
          count(*)::int as quantidade,
          round(100.0 * sum(b.total) / nullif((select total_despesas from tot), 0), 2) as percentual
        from base b
        where b.tipo = 'despesa'
        group by b.categoria
      ) t
    ),
    'compras_por_fornecedor', (
      select coalesce(jsonb_agg(t order by t.total desc, t.fornecedor_id nulls last), '[]'::jsonb)
      from (
        select
          b.fornecedor_id,
          b.fornecedor_nome,
          sum(b.total)::numeric(14,2) as total,
          count(*)::int as quantidade_compras,
          round(100.0 * sum(b.total) / nullif((select total_geral from tot), 0), 2) as percentual
        from base b
        group by b.fornecedor_id, b.fornecedor_nome
      ) t
    ),
    'evolucao_mensal', (
      select coalesce(jsonb_agg(t order by t.mes), '[]'::jsonb)
      from (
        select
          to_char(date_trunc('month', b.data_compra), 'YYYY-MM') as mes,
          sum(b.total)::numeric(14,2) as total,
          coalesce(sum(b.total) filter (where b.tipo = 'mercadoria'), 0)::numeric(14,2) as mercadorias,
          coalesce(sum(b.total) filter (where b.tipo = 'despesa'), 0)::numeric(14,2) as despesas,
          coalesce(sum(b.total) filter (where b.status_pagamento = 'pago'), 0)::numeric(14,2) as pago,
          coalesce(sum(b.total) filter (where b.status_pagamento = 'pendente'), 0)::numeric(14,2) as pendente
        from base b
        group by date_trunc('month', b.data_compra)
      ) t
    ),
    'pendencias', (
      select coalesce(jsonb_agg(t order by t.vencimento asc nulls last, t.id), '[]'::jsonb)
      from (
        select
          b.id,
          b.tipo,
          b.categoria,
          b.descricao,
          b.fornecedor_id,
          b.fornecedor_nome,
          b.total::numeric(14,2) as total,
          b.vencimento,
          b.status,
          b.status_pagamento
        from base b
        where b.status_pagamento = 'pendente'
      ) t
    )
  )
  into v_resultado;

  return v_resultado;
end;
$$;

-- ============================================================
-- PERMISSÕES (padrão do projeto)
-- ============================================================
revoke all on function public.admin_relatorio_financeiro_compras(jsonb) from public;
revoke execute on function public.admin_relatorio_financeiro_compras(jsonb) from anon;
grant execute on function public.admin_relatorio_financeiro_compras(jsonb) to authenticated, service_role;
