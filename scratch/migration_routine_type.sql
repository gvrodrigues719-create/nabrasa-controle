-- Migration: Adicionar suporte a routine_type na tabela routines
-- Abordagem segura e modular

-- 1. Cria a coluna se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routines' AND column_name='routine_type') THEN
        ALTER TABLE routines ADD COLUMN routine_type TEXT;
    END IF;
END $$;

-- 2. Preenche registros nulos com o valor padrão do legado (count)
UPDATE routines SET routine_type = 'count' WHERE routine_type IS NULL;

-- 3. Define o valor padrão para novos registros
ALTER TABLE routines ALTER COLUMN routine_type SET DEFAULT 'count';

-- 4. Define a restrição NOT NULL para garantir consistência
ALTER TABLE routines ALTER COLUMN routine_type SET NOT NULL;
