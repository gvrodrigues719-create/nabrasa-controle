-- ==========================================
-- NaBrasa Controle - CLEANUP DE DEMONSTRAÇÃO
-- Objetivo: Remover dados de seed e limpar o sistema.
-- ==========================================

DO $$
BEGIN
    -- 1. Remover itens vinculados aos grupos de demo
    DELETE FROM public.items 
    WHERE group_id IN ('91919191-9191-4919-9191-919191919191', '81818181-8181-4818-8181-818181818181', '71717171-7171-4717-7171-717171717171');

    -- 2. Remover históricos de gamificação de demo
    DELETE FROM public.gamification_events 
    WHERE source_type = 'manual_seed' 
       OR user_id IN (
           'c011e001-e001-4001-a001-000000000001', 
           'c011e001-e001-4001-a001-000000000002', 
           'c011e001-e001-4001-a001-000000000003', 
           'c011e001-e001-4001-a001-000000000004'
       );

    -- 3. Remover sessões de contagem vinculadas às rotinas de demo
    DELETE FROM public.count_sessions 
    WHERE routine_id = 'b1b1b1b1-b1b1-4b1b-b1b1-b1b1b1b1b1b1';

    -- 4. Remover execuções de demo
    DELETE FROM public.routine_executions 
    WHERE routine_id = 'b1b1b1b1-b1b1-4b1b-b1b1-b1b1b1b1b1b1';

    -- 5. Remover estrutura de rotinas de demo
    DELETE FROM public.routine_groups WHERE routine_id = 'b1b1b1b1-b1b1-4b1b-b1b1-b1b1b1b1b1b1';
    DELETE FROM public.routines WHERE id = 'b1b1b1b1-b1b1-4b1b-b1b1-b1b1b1b1b1b1';
    DELETE FROM public.groups WHERE id IN ('91919191-9191-4919-9191-919191919191', '81818181-8181-4818-8181-818181818181', '71717171-7171-4717-7171-717171717171');

    -- 6. Remover checklists de demo
    DELETE FROM public.checklist_templates WHERE id = 'd0d0d0d0-0000-4000-a000-000000000001';

    -- 7. Remover usuários de demo (public.users)
    DELETE FROM public.users WHERE id IN (
        'c011e001-e001-4001-a001-000000000001', 
        'c011e001-e001-4001-a001-000000000002', 
        'c011e001-e001-4001-a001-000000000003', 
        'c011e001-e001-4001-a001-000000000004'
    );

END $$;
