-- ============================================================
-- La Femme — Fase 5B-2: trigger para criar public.usuario
-- Cria o perfil em public.usuario a partir do INSERT em auth.users.
--
-- Remove a necessidade do navegador executar INSERT em public.usuario
-- durante o cadastro (app/composables/useRegister.ts). O perfil passa a
-- ser criado automaticamente pelo trigger, mesmo com confirmação de
-- e-mail habilitada (auth.users é inserida de qualquer forma no signUp).
--
-- SECURITY DEFINER + search_path fixo -> executa como owner e ignora RLS
-- do public.usuario (que ainda não está habilitado). Só usa dados de
-- auth.users (NEW.id, NEW.email, NEW.raw_user_meta_data) — nunca valores
-- enviados pelo cliente para definir privilégios.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Guarda anti-duplicidade: só insere se ainda não existir perfil
  -- para este auth.users.id. Não usa ON CONFLICT (constraints de uid
  -- não confirmadas no repositório).
  if exists (
    select 1
    from public.usuario
    where uid = new.id
  ) then
    return new;
  end if;

  insert into public.usuario (uid, email, nome, sobrenome, telefone)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'name',
    new.raw_user_meta_data ->> 'lastName',
    -- Preserva a regra do frontend: telefone = dígitos convertidos para numeric.
    nullif(
      regexp_replace(new.raw_user_meta_data ->> 'phone', '\D', '', 'g'),
      ''
    )::numeric
  );

  return new;
end;
$$;

-- Trigger disparado em todo INSERT em auth.users (signUp), garantindo a
-- criação do perfil em public.usuario.
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- A função é chamada apenas pelo trigger (roda como owner/SECURITY DEFINER).
-- Não conceder EXECUTE a anon/authenticated: o disparo ocorre internamente
-- no contexto da criação de auth.users, não via chamada do cliente.
revoke all on function public.handle_new_user() from public;