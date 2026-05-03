-- Correção de RLS para Storage (Avatares)
-- Simplificando as políticas para garantir o funcionamento do upload

-- 1. Removemos as políticas anteriores se houver conflito
DROP POLICY IF EXISTS "Managers can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "Managers can manage avatars" ON storage.objects;

-- 2. Permitir Upload (Insert) para qualquer usuário autenticado na pasta avatars/
-- Usamos LIKE para maior compatibilidade com diferentes versões do Supabase
CREATE POLICY "authenticated_avatar_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'checklist-evidences' AND 
  name LIKE 'avatars/%'
);

-- 3. Permitir Visualização (Select) para o público em geral
CREATE POLICY "public_avatar_select"
ON storage.objects FOR SELECT TO public
USING (
  bucket_id = 'checklist-evidences' AND 
  name LIKE 'avatars/%'
);

-- 4. Permitir Controle Total (Update/Delete/Select) para autenticados na pasta avatars/
CREATE POLICY "authenticated_avatar_management"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'checklist-evidences' AND 
  name LIKE 'avatars/%'
)
WITH CHECK (
  bucket_id = 'checklist-evidences' AND 
  name LIKE 'avatars/%'
);
