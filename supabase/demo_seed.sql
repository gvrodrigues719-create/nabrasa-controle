-- ==========================================
-- NaBrasa Controle - SEED DE DEMONSTRAÇÃO (REVISADO V4 - FINAL)
-- Objetivo: Popular o sistema com dados reais para palestra de forma segura e idempotente.
-- Utiliza APENAS usuários reais que já existem no banco.
-- ==========================================

DO $$
DECLARE
    -- CONFIGURAÇÃO: Se quiser priorizar seu usuário, coloque o seu UUID aqui
    PALESTRANTE_ID UUID := NULL; 
    
    -- Variáveis para armazenar usuários REAIS encontrados no banco
    USER_1 UUID;
    USER_2 UUID;
    USER_3 UUID;
    USER_4 UUID;
    USER_COUNT INT := 0;

    -- UUIDs FIXOS PARA ESTRUTURA (Garante idempotência e limpeza cirúrgica)
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

    -- IDs FIXOS PARA ITENS (Garante idempotência sem depender de índice Único no nome)
    I_PICANHA UUID := 'b0b0b0b0-0000-4000-a000-000000000001';
    I_ALCATRA UUID := 'b0b0b0b0-0000-4000-a000-000000000002';
    I_FRALDINHA UUID := 'b0b0b0b0-0000-4000-a000-000000000003';
    I_LINGUICA UUID := 'b0b0b0b0-0000-4000-a000-000000000004';
    I_GALETO UUID := 'b0b0b0b0-0000-4000-a000-000000000005';
    I_PAO_ALHO UUID := 'b0b0b0b0-0000-4000-a000-000000000006';
    I_HEINEKEN UUID := 'b0b0b0b0-0000-4000-a000-000000000007';
    I_COCA UUID := 'b0b0b0b0-0000-4000-a000-000000000008';
    I_CARVAO UUID := 'b0b0b0b0-0000-4000-a000-000000000009';
BEGIN

    -- 1. DESCOBERTA DE USUÁRIOS REAIS
    -- -------------------------------------------------------
    
    -- Tenta verificar se o palestrante existe
    IF PALESTRANTE_ID IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id = PALESTRANTE_ID) THEN
        USER_1 := PALESTRANTE_ID;
        RAISE NOTICE 'Usuário Palestrante detectado e será priorizado.';
    END IF;

    -- Busca outros usuários para preencher a demo (excluindo palestrante se já pegamos)
    SELECT id INTO USER_2 FROM public.users WHERE id != COALESCE(USER_1, '00000000-0000-0000-0000-000000000000'::uuid) LIMIT 1 OFFSET 0;
    SELECT id INTO USER_3 FROM public.users WHERE id != COALESCE(USER_1, '00000000-0000-0000-0000-000000000000'::uuid) AND id != COALESCE(USER_2, '00000000-0000-0000-0000-000000000000'::uuid) LIMIT 1 OFFSET 0;
    SELECT id INTO USER_4 FROM public.users WHERE id != COALESCE(USER_1, '00000000-0000-0000-0000-000000000000'::uuid) AND id != COALESCE(USER_2, '00000000-0000-0000-0000-000000000000'::uuid) AND id != COALESCE(USER_3, '00000000-0000-0000-0000-000000000000'::uuid) LIMIT 1 OFFSET 0;

    -- Se USER_1 ainda for null (palestrante não fornecido ou não existe), pega o primeiro disponível
    IF USER_1 IS NULL THEN
        SELECT id INTO USER_1 FROM public.users LIMIT 1;
    END IF;

    -- VALIDAÇÃO CRÍTICA: Se não houver nenhum usuário, para tudo.
    IF USER_1 IS NULL THEN
        RAISE EXCEPTION 'A demo não pode ser criada: ZERO usuários encontrados na tabela public.users. Por favor, cadastre pelo menos um usuário real no sistema antes de rodar este seed.';
    END IF;

    -- Contagem para logs e fallback
    SELECT count(*) INTO USER_COUNT FROM (
        SELECT id FROM (
            SELECT USER_1 AS id WHERE USER_1 IS NOT NULL
            UNION SELECT USER_2 WHERE USER_2 IS NOT NULL
            UNION SELECT USER_3 WHERE USER_3 IS NOT NULL
            UNION SELECT USER_4 WHERE USER_4 IS NOT NULL
        ) AS unique_users
    ) AS tmp;

    IF USER_COUNT = 1 THEN
        RAISE NOTICE 'Apenas 1 usuário detectado. Toda a carga demo será atribuída a ele.';
        USER_2 := USER_1;
        USER_3 := USER_1;
        USER_4 := USER_1;
    ELSIF USER_COUNT < 4 THEN
        RAISE NOTICE 'Apenas % usuários detectados. Dados serão distribuídos entre eles.', USER_COUNT;
        USER_2 := COALESCE(USER_2, USER_1);
        USER_3 := COALESCE(USER_3, USER_2);
        USER_4 := COALESCE(USER_4, USER_1);
    END IF;

    -- 2. LIMPEZA INTENCIONAL (Diferenciando dados demo para permitir rerun seguro)
    -- -------------------------------------------------------
    DELETE FROM public.gamification_events WHERE source_type = 'manual_seed';
    DELETE FROM public.count_session_items WHERE session_id IN (SESSAO_BAR_ID, SESSAO_COZINHA_ID);
    DELETE FROM public.count_sessions WHERE routine_id = ROTINA_ID;
    DELETE FROM public.routine_executions WHERE routine_id = ROTINA_ID;

    -- 3. ESTRUTURA OPERACIONAL
    -- -------------------------------------------------------
    -- Rotina Principal
    INSERT INTO public.routines (id, name, active, routine_type, frequency)
    VALUES (ROTINA_ID, 'Inventário Geral NaBrasa', true, 'count', 'weekly')
    ON CONFLICT (id) DO UPDATE 
    SET
      name = EXCLUDED.name,
      active = EXCLUDED.active,
      routine_type = EXCLUDED.routine_type,
      frequency = EXCLUDED.frequency;

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

    -- Itens Realistas com IDs fixos para segurança
    INSERT INTO public.items (id, name, unit, group_id, active, min_expected, max_expected) VALUES
    (I_PICANHA, 'Picanha', 'kg', GRUPO_COZINHA, true, 5, 20),
    (I_ALCATRA, 'Alcatra', 'kg', GRUPO_COZINHA, true, 5, 15),
    (I_FRALDINHA, 'Fraldinha', 'kg', GRUPO_COZINHA, true, 3, 10),
    (I_LINGUICA, 'Linguiça Toscana', 'kg', GRUPO_COZINHA, true, 2, 8),
    (I_GALETO, 'Galeto', 'un', GRUPO_COZINHA, true, 10, 30),
    (I_PAO_ALHO, 'Pão de Alho (Caixa)', 'un', GRUPO_ESTOQUE, true, 2, 10),
    (I_HEINEKEN, 'Heineken Long Neck', 'un', GRUPO_BAR, true, 24, 120),
    (I_COCA, 'Coca-Cola 350ml', 'un', GRUPO_BAR, true, 48, 200),
    (I_CARVAO, 'Carvão (Saca 20kg)', 'un', GRUPO_ESTOQUE, true, 5, 20)
    ON CONFLICT (id) DO UPDATE SET 
      name = EXCLUDED.name,
      unit = EXCLUDED.unit,
      group_id = EXCLUDED.group_id;

    -- 4. HISTÓRICO E GAMIFICAÇÃO
    -- -------------------------------------------------------
    -- Execução ativa
    INSERT INTO public.routine_executions (id, routine_id, status, started_at)
    VALUES (EXECUCAO_ID, ROTINA_ID, 'active', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Ranking (Simulação de pontos usando IDs reais encontrados)
    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (USER_1, 'manual_seed', GID_DEMO_1, 1450, 'Performance histórica exemplar.', NOW() - INTERVAL '1 day');

    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (USER_2, 'manual_seed', GID_DEMO_2, 920, 'Contagem de bebidas precisa.', NOW() - INTERVAL '2 hours');

    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (USER_3, 'manual_seed', GID_DEMO_3, 740, 'Organização da câmara fria.', NOW() - INTERVAL '4 hours');

    INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
    VALUES (USER_4, 'manual_seed', GID_DEMO_4, 480, 'Eficiência no Almoxarifado.', NOW() - INTERVAL '1 day');

    -- Se palestrante participou como um dos usuários, ganha bônus
    IF PALESTRANTE_ID IS NOT NULL AND EXISTS (SELECT 1 FROM public.users WHERE id = PALESTRANTE_ID) THEN
        INSERT INTO public.gamification_events (user_id, source_type, source_id, points, reason, created_at)
        VALUES (PALESTRANTE_ID, 'manual_seed', GID_DEMO_PALESTRANTE, 500, 'Engajamento na palestra.', NOW());
    END IF;

    -- 5. SESSÕES DE CONTAGEM
    -- -------------------------------------------------------
    -- Juliana (ou quem assumiu o lugar) concluiu o Bar
    INSERT INTO public.count_sessions (id, routine_id, group_id, user_id, status, started_at, completed_at, execution_id)
    VALUES (SESSAO_BAR_ID, ROTINA_ID, GRUPO_BAR, USER_2, 'completed', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '90 minutes', EXECUCAO_ID)
    ON CONFLICT (id) DO NOTHING;

    -- Roberto (ou quem assumiu o lugar) na Cozinha agora
    INSERT INTO public.count_sessions (id, routine_id, group_id, user_id, status, started_at, execution_id)
    VALUES (SESSAO_COZINHA_ID, ROTINA_ID, GRUPO_COZINHA, USER_1, 'in_progress', NOW() - INTERVAL '30 minutes', EXECUCAO_ID)
    ON CONFLICT (id) DO NOTHING;

    -- 6. CHECKLISTS
    -- -------------------------------------------------------
    INSERT INTO public.checklist_templates (id, name, description, context, active)
    VALUES ('d0d0d0d0-0000-4000-a000-000000000001', 'Abertura de Casa (Demo)', 'Procedimentos de segurança e higiene.', 'opening', true)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, required, display_order) VALUES
    ('d0d0d0d0-0000-4000-a000-000000000001', 'Câmara fria está na temperatura ideal?', 'temperature', true, 1),
    ('d0d0d0d0-0000-4000-a000-000000000001', 'Pisos do salão foram varridos?', 'boolean', true, 2)
    ON CONFLICT (template_id, display_order) DO NOTHING;

    RAISE NOTICE 'Seed de demonstração V4 finalizado com sucesso.';
END $$;

