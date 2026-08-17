-- ============================================================
-- La Femme — Fase 5C-4: reconciliação de RLS/policies
--
-- Contexto descoberto na auditoria 5C-3:
--   O banco real já possuía RLS habilitado nas tabelas protegidas
--   (produtos, produto_variante, foto_variante, clientes, usuario,
--   admin_users, pedidos, itens_pedido) E policies criadas
--   anteriormente FORA do versionamento (via Dashboard/SQL Editor).
--
-- A arquitetura atual NÃO depende dessas policies diretas:
--   - catálogo público  -> view public.catalogo_produtos;
--   - fotos públicas    -> GET /api/produtos/[id]/fotos (Service Role);
--   - clientes          -> POST /api/clientes e /api/admin/clientes (Service Role);
--   - criação de perfil -> trigger on_auth_user_created -> handle_new_user()
--                          (SECURITY DEFINER);
--   - CRUD admin        -> RPCs SECURITY DEFINER (Fase 4B) via Service Role;
--   - autorização admin -> public.is_admin()/public.admin_users.
--
-- Portanto, as policies diretas antigas devem ser REMOVIDAS. Não criamos
-- policies substitutas: o acesso legítimo ocorre via views, APIs
-- server-side, Service Role e funções SECURITY DEFINER.
--
-- handle_new_user(): por causa dos default ACLs do schema public
-- (pg_default_acl -> defaclobjtype 'f'), a função recém-criada recebeu
-- EXECUTE direto para anon/authenticated/service_role. O revoke anterior
-- (REVOKE ALL ... FROM public) não removeu esses grants diretos. Aqui
-- revogamos explicitamente de anon e authenticated. A função só deve ser
-- executada internamente pelo trigger.
--
-- Migration idempotente. NÃO executar automaticamente: revisar e aplicar
-- manualmente no Supabase.
-- ============================================================

-- ============================================================
-- 1) handle_new_user — revogar EXECUTE de anon/authenticated
-- ============================================================
-- Motivo: os default ACLs do schema public concedem EXECUTE direto a
-- anon/authenticated em toda função nova. handle_new_user é SECURITY
-- DEFINER e executada APENAS pelo trigger on_auth_user_created. Não há
-- motivo para anon/authenticated executá-la.
-- (service_role mantém EXECUTE: é o papel de servidor e não expõe a
--  função; o revoke de PUBLIC já ocorreu na migration 5B-2.)
revoke execute on function public.handle_new_user() from anon, authenticated;

-- ============================================================
-- 2) CLIENTES — remover policy pública de PII
-- ============================================================
-- "clientes" (ALL, USING true, roles vazias => todas as roles) expõe
-- PII via REST. Removemos. Sem policy substituta:
--   cadastro -> POST /api/clientes (Service Role)
--   leitura  -> /api/admin/clientes (Service Role)
drop policy if exists "clientes" on public.clientes;

-- ============================================================
-- 3) PRODUTOS — remover policies diretas
-- ============================================================
-- "Catálogo público produtos" (SELECT direto) é desnecessário: o catálogo
-- usa a view public.catalogo_produtos.
-- "Administrador produtos" (ALL, UID hardcoded) diverge do modelo de
-- autorização por is_admin()/RPCs. O CRUD admin usa as RPCs SECURITY
-- DEFINER via Service Role.
drop policy if exists "Catálogo público produtos" on public.produtos;
drop policy if exists "Administrador produtos" on public.produtos;

-- ============================================================
-- 4) PRODUTO_VARIANTE — remover policies diretas
-- ============================================================
-- Acesso público via view catalogo_produtos; admin via RPCs.
drop policy if exists "Catálogo público variante" on public.produto_variante;
drop policy if exists "Administrador variante" on public.produto_variante;

-- ============================================================
-- 5) FOTO_VARIANTE — remover policies diretas
-- ============================================================
-- Fotos públicas via GET /api/produtos/[id]/fotos (Service Role).
drop policy if exists "Leitura pública foto_variante" on public.foto_variante;
drop policy if exists "Administrador foto_variante" on public.foto_variante;

-- ============================================================
-- 6) USUARIO — remover policies de self-access
-- ============================================================
-- O navegador não deve inserir/ler/atualizar public.usuario diretamente:
--   - criação do perfil via trigger handle_new_user() (SECURITY DEFINER);
--   - sem uso client-side de SELECT/UPDATE em usuario atualmente;
--   - sem necessidade comprovada de policy de self-access.
-- Após a remoção: RLS permanece habilitado; trigger continua funcionando.
drop policy if exists "Visualizar próprios dados" on public.usuario;
drop policy if exists "Inserir dados" on public.usuario;
drop policy if exists "Atualizar próprios dados" on public.usuario;

-- ============================================================
-- 7) NÃO ALTERADOS POR ESTA MIGRATION
-- ============================================================
-- public.catalogo_produtos (view)   -> inalterada
-- public.criar_pedido()             -> inalterada
-- public.is_admin()                 -> inalterada
-- public.admin_users                -> RLS habilitado, sem policies
-- public.pedidos / itens_pedido     -> RLS habilitado, sem policies
-- RPCs admin (Fase 4B)              -> inalteradas
-- Storage                           -> inalterado
-- grants de tabela                  -> inalterados
-- RLS enable/disable                -> inalterados (já habilitado)