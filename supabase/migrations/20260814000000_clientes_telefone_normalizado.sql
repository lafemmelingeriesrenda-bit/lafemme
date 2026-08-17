-- ============================================================
-- La Femme — clientes: telefone normalizado + unicidade
-- Idempotente: pode ser re-executado no Supabase SQL Editor.
-- ============================================================

-- Coluna com o telefone apenas com dígitos (chave de match/unique)
alter table public.clientes add column if not exists telefone_normalizado text;

-- Backfill a partir do telefone existente (somente dígitos)
update public.clientes
   set telefone_normalizado = regexp_replace(telefone, '\D', '', 'g')
 where telefone_normalizado is null
   and telefone is not null;

-- Índice único parcial: garante um cliente por telefone (ignora nulls)
-- e serve de alvo para INSERT ... ON CONFLICT na RPC criar_pedido.
create unique index if not exists clientes_telefone_normalizado_uq
  on public.clientes (telefone_normalizado)
  where telefone_normalizado is not null;