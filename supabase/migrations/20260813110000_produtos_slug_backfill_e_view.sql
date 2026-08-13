-- ============================================================
-- La Femme — slug oficial dos produtos + view com slug
--
-- 1) Backfill idempotente: garante slug para TODOS os produtos
--    (incluindo os criados pela aplicação antes deste backfill,
--    que ficaram com slug = NULL).
--    Regras idênticas à migration original 20260813100000:
--      a) base = public.slugificar(nome); se vazio -> "produto-{id}"
--      b) colisão -> sufixo numérico crescente a partir de -2
--    Preserva slugs já existentes (não re-escreve).
--
-- 2) View public.catalogo_produtos passa a expor produtos.slug
--    como coluna adicional (fonte oficial da URL pública).
--
-- IMPORTANTE: revisar e rodar manualmente no Supabase (SQL Editor).
-- Idempotente: pode ser re-executado.
-- ============================================================

-- ---------- 1) Backfill de slugs ausentes ----------
do $$
declare
  r record;
  base text;
  cand text;
  n int;
  taken text[];
begin
  select coalesce(array_agg(slug), array[]::text[])
    into taken
    from public.produtos
    where slug is not null and btrim(slug) <> '';

  for r in
    select id, nome
    from public.produtos
    where slug is null or btrim(slug) = ''
    order by id
  loop
    base := public.slugificar(r.nome);
    if base = '' then
      base := 'produto-' || r.id;
    end if;

    cand := base;
    n := 2;
    while cand = any(taken) loop
      cand := base || '-' || n;
      n := n + 1;
    end loop;

    update public.produtos
       set slug = cand
     where id = r.id;

    taken := taken || cand;
  end loop;
end
$$;

-- ---------- 2) View catalogo_produtos com produtos.slug ----------
-- create or replace mantém colunas existentes na mesma ordem e
-- acrescenta `slug` ao final (fonte oficial da URL pública).
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
  pv.ativo as disponivel,
  p.slug
from public.produtos p
join public.produto_variante pv on pv.produto_id = p.id;
