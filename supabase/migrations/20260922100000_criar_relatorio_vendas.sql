-- ============================================================
-- La Femme — Relatórios (Fase 4.1): receita de vendas
--
-- Cria UMA RPC SECURITY DEFINER que agrega, no banco, a receita de
-- vendas de um período. NÃO cria/alterar tabelas, colunas ou índices.
--
--   GET -> public.admin_relatorio_vendas(p_filtros jsonb)
--
-- Base da receita (exclusivamente):
--   * status = 'finalizado';
--   * finalizado_em is not null;
--   * valor = pedidos.total (histórico; NÃO recalcula pelos itens).
-- Data usada: pedidos.finalizado_em (nunca created_at/updated_at).
--
-- Filtros (jsonb): dataInicio e dataFim (YYYY-MM-DD, opcionais).
-- O limite final considera o dia inteiro:
--   finalizado_em >= dataInicio::timestamptz
--   finalizado_em <  (dataFim::timestamptz + interval '1 day')
--
-- NÃO calcula lucro, margem, CMV, custo médio ou valor de estoque.
--
-- Segurança: SECURITY DEFINER + search_path fixo + guarda admin/
-- service_role; EXECUTE apenas para authenticated e service_role.
--
-- Idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase (SQL Editor) na etapa de deploy.
-- ============================================================

create or replace function public.admin_relatorio_vendas(p_filtros jsonb default null)
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
    select p.total, p.finalizado_em
      from public.pedidos p
     where p.status = 'finalizado'
       and p.finalizado_em is not null
       and (v_inicio is null or p.finalizado_em >= v_inicio::timestamptz)
       and (v_fim is null or p.finalizado_em < (v_fim::timestamptz + interval '1 day'))
  )
  select jsonb_build_object(
    'ok', true,
    'periodo', jsonb_build_object('dataInicio', v_inicio, 'dataFim', v_fim),
    'resumo', (
      select jsonb_build_object(
        'receita', coalesce(sum(total), 0)::numeric(14,2),
        'quantidade_pedidos', count(*)::int,
        'ticket_medio', case
          when count(*) = 0 then 0::numeric(14,2)
          else round(coalesce(sum(total), 0) / count(*), 2)::numeric(14,2)
        end
      )
      from base
    ),
    'evolucao_mensal', (
      select coalesce(jsonb_agg(t order by t.mes), '[]'::jsonb)
      from (
        select
          to_char(date_trunc('month', b.finalizado_em), 'YYYY-MM') as mes,
          sum(b.total)::numeric(14,2) as receita,
          count(*)::int as quantidade_pedidos,
          round(sum(b.total) / count(*), 2)::numeric(14,2) as ticket_medio
        from base b
        group by date_trunc('month', b.finalizado_em)
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
revoke all on function public.admin_relatorio_vendas(jsonb) from public;
revoke execute on function public.admin_relatorio_vendas(jsonb) from anon;
grant execute on function public.admin_relatorio_vendas(jsonb) to authenticated, service_role;
