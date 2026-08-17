-- ============================================================
-- La Femme — Fase 5B-3: RLS definitivo de produtos, clientes e
-- usuario + revisão de Storage.
--
-- Fecha o acesso direto (REST) às tabelas administrativas e de
-- PII, preservando integralmente catálogo, cadastro, carrinho,
-- checkout, pedidos e o fluxo administrativo.
--
-- IMPORTANTE: migration versionada no repositório. Aplicar apenas
-- manualmente no Supabase (SQL Editor). NÃO executar aqui.
--
-- Não altera estrutura/colunas de nenhuma tabela. Não cria
-- constraints. Não cria policies públicas em produtos.
-- ============================================================

-- ============================================================
-- 1) RLS — PRODUTOS
-- ============================================================
-- Habilitar RLS em produtos, produto_variante e foto_variante,
-- SEM policies para anon/authenticated.
--
-- Motivo: acesso REST direto deve ser negado.
--   - catálogo público usa a view catalogo_produtos (owner postgres,
--     BYPASSRLS -> continua lendo as tabelas base normalmente);
--   - fotos públicas usam /api/produtos/[id]/fotos;
--   - carrinho, pedidos e admin usam Service Role/RPC.
--
-- Com RLS habilitado e sem policies, anon/authenticated não
-- conseguem SELECT/INSERT/UPDATE/DELETE direto (0 linhas/denegado).
-- ============================================================

alter table public.produtos enable row level security;
alter table public.produto_variante enable row level security;
alter table public.foto_variante enable row level security;

-- ============================================================
-- 2) RLS — CLIENTES
-- ============================================================
-- Habilitar RLS em clientes, SEM policies para anon/authenticated.
-- Impede que qualquer cliente autenticado consulte PII via REST.
--
-- Acesso legítimo (sempre via Service Role no servidor):
--   ADMIN  -> browser -> /api/admin/clientes -> requireAdmin() -> Service Role
--   PÚBLICO-> browser -> /api/clientes -> validação server-side -> Service Role
-- Não existe SELECT público de clientes.
-- ============================================================

alter table public.clientes enable row level security;

-- ============================================================
-- 3) RLS — USUARIO
-- ============================================================
-- Habilitar RLS em usuario, SEM policies.
--
-- A criação do perfil ocorre via:
--   auth.users -> trigger public.handle_new_user() (SECURITY DEFINER)
--   -> public.usuario
-- A função é SECURITY DEFINER (owner postgres), então ignora RLS e
-- insere mesmo sem policy de INSERT do usuário.
-- Não há policy de self-insert/select/role. usuario.role NÃO existe.
-- ============================================================

alter table public.usuario enable row level security;

-- ============================================================
-- 4) ADMIN_USERS — SEM ALTERAÇÃO
-- ============================================================
-- public.admin_users já tem RLS habilitado e sem policies
-- (migration 20260814100000). NÃO criar policy de SELECT, NÃO
-- abrir a tabela, NÃO alterar public.is_admin().
-- ============================================================

-- ============================================================
-- 5) PEDIDOS / ITENS_PEDIDO — SEM ALTERAÇÃO
-- ============================================================
-- Já possuem RLS habilitado e nenhuma policy (20260812150000).
-- NÃO modificar public.criar_pedido().
-- ============================================================

-- ============================================================
-- 6) STORAGE — REQUER CONFIRMAÇÃO (NÃO EXECUTAR NESTA MIGRATION)
-- ============================================================
-- O bucket é "La Femme". Comportamento desejado:
--   LEITURA : pública (imagens servidas pelas URLs públicas do bucket)
--   ESCRITA / UPDATE / DELETE: negado a anon e authenticated;
--                              Service Role pode.
--
-- ATENÇÃO: as policies de Storage vivem no dashboard do Supabase
-- e NÃO estão versionadas neste repositório. Não é possível
-- confirmar o estado atual (existem? quais? public-read já ativo?)
-- apenas pelo código.
--
-- Como o app já usa URLs públicas (/storage/v1/object/public/La%20Femme/...)
-- e a escrita ocorre só via Service Role (admin/upload.post.ts,
-- adminProdutos.ts), o comportamento atual já é o desejado SE o bucket
-- estiver como público e sem policies de escrita para anon/authenticated.
--
-- Por segurança (evitar policies duplicadas/conflitantes sem conhecer
-- o estado real), esta migration NÃO cria/alterar policies de Storage.
-- Para fechar o Storage de forma versionada, CONFIRMAR no Supabase
-- Dashboard -> Storage -> Policies do bucket "La Femme":
--   - existe policy de leitura pública? (obrigatório manter)
--   - existe alguma policy de INSERT/UPDATE/DELETE para anon/authenticated?
--     (se existir, remover manualmente; Service Role segue podendo)
-- Depois da confirmação, criar uma migration dedicada com as policies
-- exatas e idempotentes.
-- ============================================================

-- ============================================================
-- 7) GRANTS / EXECUTE — SEM ALTERAÇÃO
-- ============================================================
-- Design já aprovado e preservado:
--   - RPCs admin (Fase 4B): revogado de anon/public, EXECUTE só para
--     authenticated e service_role; verificação via is_admin()/service_role.
--   - public.is_admin(): EXECUTE para anon/authenticated/service_role
--     (retorna false para anon; necessário para policies futuras).
--   - public.handle_new_user(): não exposta (REVOKE de public);
--     executada apenas pelo trigger.
--   - public.criar_pedido(): EXECUTE para anon/authenticated/service_role.
-- Não são necessárias mudanças de GRANT nesta fase.
-- ============================================================