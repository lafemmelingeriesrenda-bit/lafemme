-- ============================================================
-- La Femme — Correção da disponibilidade no catálogo
--
-- Problema: Variantes com estoque 0 ainda apareciam como disponíveis
-- no catálogo, permitindo seleção e tentativa de compra.
--
-- Solução: A view catalogo_produtos agora calcula corretamente:
--   disponivel = pv.ativo AND pv.quantidade > 0
--
-- IMPORTANTE: Não altera o fluxo de criação/finalização de pedidos.
-- O estoque continua sendo baixado apenas em admin_finalizar_pedido.
-- ============================================================

-- ---------- 1) Corrigir a view catalogo_produtos ----------
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
  (pv.ativo AND pv.quantidade > 0) as disponivel,
  p.slug
from public.produtos p
join public.produto_variante pv on pv.produto_id = p.id;