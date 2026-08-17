-- ============================================================
-- La Femme — Fase 1: public.is_admin()
-- Verifica se o usuário autenticado (auth.uid()) é administrador.
-- SECURITY DEFINER + search_path fixo -> seguro para uso em policies.
-- Não expõe a tabela admin_users (só retorna um boolean).
-- ============================================================

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();

  if v_uid is null then
    return false;
  end if;

  return exists (
    select 1
    from public.admin_users
    where user_id = v_uid
  );
end;
$$;

-- Necessário para uso em policies futuras. anon recebe false (uid nulo),
-- portanto a função não vaza dados mesmo chamada publicamente.
grant execute on function public.is_admin() to anon, authenticated, service_role;
