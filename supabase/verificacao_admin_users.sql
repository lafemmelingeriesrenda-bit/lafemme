-- ============================================================
-- La Femme — Diagnóstico de administradores (somente leitura)
--
-- Ferramenta GENÉRICA e não-produtiva: não contém e-mails nem
-- dados pessoais. Nenhuma escrita no banco.
--
-- Uso (por ambiente):
--   1) Lista todos os administradores atuais (public.admin_users)
--      com o e-mail correspondente do auth.users;
--   2) Lista usuários do auth.users que ainda NÃO são administradores.
--      A decisão de promovê-los ou não é operacional e cabe ao
--      responsável pelo ambiente (promover via INSERT em
--      public.admin_users apontando o user_id do auth.users).
--
-- Referência de estrutura:
--   - public.admin_users.user_id references auth.users (id)
--   - migration 20260814100000_admin_users.sql
-- ============================================================

-- 1) Administradores atuais:
select
  au.email,
  au.id as user_id,
  a.created_at
from public.admin_users a
join auth.users au on au.id = a.user_id
order by au.email;

-- 2) Usuários do auth.users que ainda não são administradores:
select
  au.email,
  au.id as user_id
from auth.users au
left join public.admin_users a on a.user_id = au.id
where a.user_id is null
order by au.email;
