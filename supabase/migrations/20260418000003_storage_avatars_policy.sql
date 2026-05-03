-- Políticas de Storage para Avatares dos Funcionários
-- Garante que gerentes possam subir fotos e todos possam visualizar no Mural

-- 1. Permitir Insert (Upload) para Gerentes no caminho de avatars
CREATE POLICY "Managers can upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'checklist-evidences' AND
  (storage.foldername(name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);

-- 2. Permitir Select (Visualização) para todos
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'checklist-evidences' AND (storage.foldername(name))[1] = 'avatars');

-- 3. Permitir Delete/Update para Gerentes (Manutenção)
CREATE POLICY "Managers can manage avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'checklist-evidences' AND
  (storage.foldername(name))[1] = 'avatars' AND
  EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role IN ('admin', 'manager')
  )
);
