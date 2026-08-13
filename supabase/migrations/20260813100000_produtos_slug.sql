-- ============================================================
-- La Femme — slug amigável para a página pública de produtos
-- Adiciona a coluna `slug` em public.produtos, função de
-- slugificação, backfill dos registros existentes e constraint
-- UNIQUE.
--
-- IMPORTANTE: NÃO executar automaticamente. Revisar e rodar
-- manualmente no Supabase (SQL Editor) quando for aplicar.
-- Idempotente: pode ser re-executado.
-- ============================================================

-- 1) Extensão unaccent (remove acentos; disponível no Supabase)
create extension if not exists unaccent;

-- 2) Função de slugificação reutilizável.
--    Ex.: "Camisola Insaciável" -> "camisola-insaciavel"
--         "Conjunto Madame Preto" -> "conjunto-madame-preto"
--         "!!!" -> "" (vazio; o backfill aplica fallback por id)
create or replace function public.slugificar(nome text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(unaccent(coalesce(nome, ''))),
    '[^a-z0-9]+',
    '-',
    'g'
  ));
$$;

-- 3) Coluna slug
alter table public.produtos add column if not exists slug text;

-- 4) Backfill dos produtos existentes.
--    Regras:
--      a) Slug base = public.slugificar(nome). Se vazio/não-slugificável,
--         usa fallback "produto-{id}" (garante URL válida e UNIQUE).
--      b) Tenta primeiro o slug base; se já estiver em uso, anexa sufixo
--         numérico crescente a partir de -2.
--      c) O conjunto "em uso" inclui TODOS os slugs já persistidos
--         (execuções anteriores) + os gerados nesta execução, na ordem
--         de id. Isso evita colisões reais até entre nomes diferentes
--         que produzam o mesmo slug.
--    Exemplos:
--         "Camisola Insaciável" (1º) -> camisola-insaciavel
--         "Camisola Insaciável" (2º) -> camisola-insaciavel-2
--         "Camisola Insaciável" (3º) -> camisola-insaciavel-3
--         "Produto"                  -> produto
--         "Produto 2"                -> produto-2
--         "Produto" (duplicado)      -> produto-3   (produto-2 já ocupado)
--         "!!!"                      -> produto-{id} (fallback)
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

-- 5) Constraint única (a própria constraint cria o índice único)
alter table public.produtos drop constraint if exists produtos_slug_key;
alter table public.produtos add constraint produtos_slug_key unique (slug);

-- NOTA: NÃO foi criado trigger para novos produtos de propósito.
-- O slug usado na URL é derivado do nome no momento da navegação
-- (mesma regra do public.slugificar). Um trigger que regenerasse o
-- slug entraria em conflito com a constraint UNIQUE quando dois
-- produtos tivessem o mesmo nome.
