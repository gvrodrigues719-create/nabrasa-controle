-- ==========================================
-- NaBrasa Controle - SEED DE DEMONSTRAÇÃO (REVISADO V3 - FINAL)
-- Objetivo: Popular o sistema com dados reais para palestra de forma segura e idempotente.
-- ==========================================

-- INSTRUÇÃO: 
-- (OPCIONAL) Se quiser que os pontos apareçam para o SEU usuário, 
-- substitua NULL abaixo pelo seu UUID (ex: 'a0eebc99...').
-- PALESTRANTE_ID UUID := 'SEU-UUID-AQUI';

DO $$
DECLARE
    -- ID DO UTILIZADOR PALESTRANTE (Seguro: NULL por padrão não quebra o script)
    PALESTRANTE_ID UUID := NULL; 
    
    -- UUIDs FIXOS PARA DEMO (Garante idempotência e limpeza cirúrgica)
    ROBERTO_ID UUID := 'c011e001-e001-4001-a001-000000000001';
    JULIANA_ID UUID := 'c011e001-e001-4001-a001-000000000002';
    PATRICIA_ID UUID := 'c011e001-e001-4001-a001-000000000003';
    RICARDO_ID UUID := 'c011e001-e001-4001-a001-000000000004';
    
    ROTINA_ID UUID := 'b1b1b1b1-b1b1-4b1b-b1b1-b1b1b1b1b1b1';
    EXECUCAO_ID UUID := 'e1e1e1e1-e1e1-4e11-e1e1-e1e1e1e1e1e1';
    
    GRUPO_COZINHA UUID := '91919191-9191-4919-9191-919191919191';
    GRUPO_BAR UUID := '81818181-8181-4818-8181-818181818181';
    GRUPO_ESTOQUE UUID := '71717171-7171-4717-7171-717171717171';

    -- SESSÕES FIXAS (Garante que ON CONFLICT de sessões funcione)
    SESSAO_BAR_ID UUID := 'ffffffff-ffff-4fff-afff-000000000001';
    SESSAO_COZINHA_ID UUID := 'ffffffff-ffff-4fff-afff-000000000002';

    -- SOURCE IDs FIXOS PARA GAMIFICAÇÃO (Garante que pontos não dupliquem ao rodar de novo)
    GID_DEMO_1 UUID := 'd0000000-0000-0000-0000-000000000001';
    GID_DEMO_2 UUID := 'd0000000-0000-0000-0000-000000000002';
    GID_DEMO_3 UUID := 'd0000000-0000-0000-0000-000000000003';
    GID_DEMO_4 UUID := 'd0000000-0000-0000-0000-000000000004';
    GID_DEMO_PALESTRANTE UUID := 'd0000000-0000-0000-0000-000000000005';
BEGIN

    -- 0. LIMPEZA INTENCIONAL (Diferenciando dados demo para permitir rerun seguro)
    -- Removemos apenas eventos marcados como manual_seed para não tocar em logs reais
    DELETE FROM public.gamification_events WHERE source_type = 'manual_seed';
    
    -- Removemos sessões e execuções vinculadas à rotina de demo
    DELETE FROM public.count_session_items WHERE session_id IN (SESSAO_BAR_ID, SESSAO_COZINHA_ID);
    DELETE FROM public.count_sessions WHERE routine_id = ROTINA_ID;
    DELETE FROM public.routine_executions WHERE routine_id = ROTINA_ID;

    -- 1. USUÁRIOS DEMO (Tabela Publica)
    INSERT INTO public.users (id, name, role, active) VALUES
    (ROBERTO_ID, 'Roberto Cozinha', 'operator', true),
    (JULIANA_ID, 'Juliana Bar', 'operator', true),
    (PATRICIA_ID, 'Patrícia Estoque', 'operator', true),
    (RICARDO_ID, 'Ricardo Gerente', 'manager', true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role;

    -- 2. ESTRUTURA OPERACIONAL
    -- Rotina Principal (Corrigido para routine_type = 'count')
    INSERT INTO public.routines (id, name, active, routine_type, frequency)
    VALUES (ROTINA_ID, 'Inventário Geral NaBrasa', true, 'count', 'weekly')
    ON CONFLICT (id) DO UPDATE SET routine_type = EXCLUDED.routine_type;

    -- Grupos (Setores)
    INSERT INTO public.groups (id, name, active) VALUES
    (GRUPO_COZINHA, 'Cozinha (Carnes)', true),
    (GRUPO_BAR, 'Bar (Bebidas)', true),
    (GRUPO_ESTOQUE, 'Almoxarifado', true)
    ON CONFLICT (id) DO NOTHING;

    -- Vincula Grupos à Rotina
    INSERT INTO public.routine_groups (routine_id, group_id) VALUES
    (ROTINA_ID, GRUPO_COZINHA),
    (ROTINA_ID, GRUPO_BAR),
    (ROTINA_ID, GRUPO_ESTOQUE)
    ON CONFLICT DO NOTHING;

    -- Itens Realistas
    -- Cozinha
    INSERT INTO public.items (name, unit, group_id, active, min_expected, max_expected) VALUES
    ('Picanha', 'kg', GRUPO_COZINHA, true, 5, 20),
    ('Alcatra', 'kg', GRUPO_COZINHA, true, 5, 15),
    ('Fraldinha', 'kg', GRUPO_COZINHA, true, 3, 10),
    ('Linguiça Toscana', 'kg', GRUPO_COZINHA, true, 2, 8),
    ('Galeto', 'un', GRUPO_COZINHA, true, 10, 30),
    ('Coração de Frango', 'kg', GRUPO_COZINHA, true, 1, 5),
    ('Tomate', 'kg', GRUPO_COZINHA, true, 2, 10),
    ('Cebola', 'kg', GRUPO_COZINHA, true, 2, 10),
    ('Vinagrete (Pote 1L)', 'un', GRUPO_COZINHA, true, 5, 15)
    ON CONFLICT DO NOTHING;

    -- Bar
    INSERT INTO public.items (name, unit, group_id, active, min_expected, max_expected) VALUES
    ('Heineken Long Neck', 'un', GRUPO_BAR, true, 24, 120),
    ('Coca-Cola 350ml', 'un', GRUPO_BAR, true, 48, 200),
    ('Guaraná Antarctica 350ml', 'un', GRUPO_BAR, true, 24, 150),
    ('Chope Brahma (Barril 50L)', 'un', GRUPO_BAR, true, 1, 4)
    ON CONFLICT DO NOTHING;

    -- Estoque
    INSERT INTO public.items (name, unit, group_id, active, min_expected, max_expected) VALUES
    ('Carvão (Saca 20kg)', 'un', GRUPO_ESTOQUE, true, 5, 20),
    ('Pão de Alho (Caixa)', 'un', GRUPO_ESTOQUE, true, 2, 10),
    ('Farofa (Pote 2kg)', 'un', GRUPO_ESTOQUE, true, 5, 20),
    ('Batata Frita Congelada (Saco 2kg)', 'un', GRUPO_ESTOQUE, true, 10, 40)
    ON CONFLICT DO NOTHING;

    -- 3. HISTÓRICO E GAMIFICAÇÃO
    -- Criamos uma execução ativa para hoje
    INSERT INTO public.routine_executions (id, routine_id, status, started_at)
    VALUES (EXECUCAO_ID, ROTINA_ID, 'active', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Simular pontos para preencher o Ranking (Top 5)
    -- Ricardo Gerente (Líder)
    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (RICARDO_ID, 'manual_seed', GID_DEMO_1, 1450, 'Performance histórica exemplar.', NOW() - INTERVAL '1 day');

    -- Juliana Bar (#2)
    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (JULIANA_ID, 'manual_seed', GID_DEMO_2, 920, 'Contagem de bebidas precisa.', NOW() - INTERVAL '2 hours');

    -- Roberto Cozinha (#3)
    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (ROBERTO_ID, 'manual_seed', GID_DEMO_3, 740, 'Organização da câmara fria.', NOW() - INTERVAL '4 hours');

    -- Patrícia Estoque (#4)
    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (PATRICIA_ID, 'manual_seed', GID_DEMO_4, 480, 'Recebimento de mercadorias.', NOW() - INTERVAL '1 day');

    -- VOCÊ (Palestrante) - Só insere se o ID for fornecido
    IF PALESTRANTE_ID IS NOT NULL THEN
        -- Tenta garantir que o palestrante esteja em public.users se ainda não estiver
        INSERT INTO public.users (id, name, role, active) 
        VALUES (PALESTRANTE_ID, 'Sua Conta (Palestrante)', 'manager', true)
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
        VALUES (PALESTRANTE_ID, 'manual_seed', GID_DEMO_PALESTRANTE, 850, 'Engajamento na plataforma MOC.', NOW() - INTERVAL '5 minutes');
    END IF;

    -- 4. SESSÕES ATIVAS COM IDS FIXOS
    -- Juliana já concluiu o Bar hoje
    INSERT INTO public.count_sessions (id, routine_id, group_id, user_id, status, started_at, completed_at, execution_id)
    VALUES (SESSAO_BAR_ID, ROTINA_ID, GRUPO_BAR, JULIANA_ID, 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes', EXECUCAO_ID)
    ON CONFLICT (id) DO NOTHING;

    -- Roberto está contando a Cozinha agora
    INSERT INTO public.count_sessions (id, routine_id, group_id, user_id, status, started_at, execution_id)
    VALUES (SESSAO_COZINHA_ID, ROTINA_ID, GRUPO_COZINHA, ROBERTO_ID, 'in_progress', NOW() - INTERVAL '30 minutes', EXECUCAO_ID)
    ON CONFLICT (id) DO NOTHING;

    -- 5. CHECKLIST DEMO
    INSERT INTO public.checklist_templates (id, name, description, context, active)
    VALUES ('d0d0d0d0-0000-4000-a000-000000000001', 'Abertura de Casa (Demo)', 'Procedimentos de segurança e higiene antes de abrir.', 'opening', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, required, display_order) VALUES
    ('d0d0d0d0-0000-4000-a000-000000000001', 'Câmara fria está na temperatura ideal?', 'temperature', true, 1),
    ('d0d0d0d0-0000-4000-a000-000000000001', 'Pisos do salão foram varridos?', 'boolean', true, 2),
    ('d0d0d0d0-0000-4000-a000-000000000001', 'Estoque de bebidas geladas conferido?', 'boolean', true, 3)
    ON CONFLICT DO NOTHING;

END $$;
