-- ============================================================
-- Correção de Permissões: Allan (Gerente Camboinhas)
-- Migration: 20260504_fix_allan_permissions.sql
-- ============================================================

-- Garante que o usuário Allan tenha o cargo de gerente e esteja vinculado à unidade Camboinhas
UPDATE public.users 
SET 
    role = 'manager',
    unit_id = '3e52d6b2-755d-4bc5-a808-b8ac37ffcee1', -- NaBrasa Camboinhas
    active = true
WHERE name ILIKE '%Allan%';
