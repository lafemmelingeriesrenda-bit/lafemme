-- ============================================================
-- La Femme — Aumentar limite de tamanho das variantes
--
-- Tamanho Único possui 13 caracteres e não cabe no varchar(10)
-- atualmente usado por public.produto_variante.tamanho.
-- ============================================================

-- A view depende da coluna `tamanho`; remova-a durante a mesma transação
-- da alteração e recrie-a com o contrato original.
drop view public.catalogo_produtos;

alter table public.produto_variante
  alter column tamanho type varchar(20);

create view public.catalogo_produtos as
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
  pv.ativo AND pv.quantidade > 0 as disponivel,
  p.slug
from public.produtos p
join public.produto_variante pv
  on pv.produto_id = p.id;

-- Grants confirmados para a view original. O OWNER não é redefinido aqui.
grant all privileges on public.catalogo_produtos to anon, authenticated, service_role, postgres;
