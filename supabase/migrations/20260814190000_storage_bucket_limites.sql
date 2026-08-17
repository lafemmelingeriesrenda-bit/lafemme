-- ============================================================
-- La Femme — Fase 5D-2: Limites de tamanho e MIME types do bucket
--
-- Contexto: o endpoint /api/admin/upload já limita o tamanho a
-- 2 MiB e rejeita MIME não permitido, mas o bucket "La Femme"
-- estava sem file_size_limit e sem allowed_mime_types (defesa em
-- profundidade ausente). Esta migration aplica os mesmos limites
-- no bucket existente.
--
-- Escopo (apenas isso):
--   - update storage.buckets (id = 'La Femme')
--       file_size_limit = 2097152  (2 MiB)
--       allowed_mime_types = {image/jpeg, image/png, image/webp,
--                              image/gif, image/avif}
--
-- Idempotente: se executada novamente, apenas reafirma os valores.
--
-- Não altera: policies, RLS, objetos existentes, public = true,
-- recriação do bucket, outras tabelas.
--
-- IMPORTANTE: NÃO executar via supabase db push. Aplicar de forma
-- controlada com:
--   supabase db query --linked --file supabase/migrations/20260814190000_storage_bucket_limites.sql
-- ============================================================

update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
 where id = 'La Femme';