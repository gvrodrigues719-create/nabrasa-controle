-- Migration: Ajuste pontual itens de CK - Descartáveis (Cozinha Central)
-- Idempotent script para padronizar nomenclaturas e unidades.

DO $$
DECLARE
    v_group_id UUID;
BEGIN
    -- Obter o ID do grupo alvo
    SELECT id INTO v_group_id FROM public.groups WHERE name = 'CK — Descartáveis' LIMIT 1;
    
    IF v_group_id IS NULL THEN
        RAISE NOTICE 'Grupo "CK — Descartáveis" não encontrado no banco de dados. Pulando migration.';
        RETURN;
    END IF;

    -- =========================================================================
    -- 1. Renomear embalagens de isopor
    -- =========================================================================
    UPDATE public.items 
    SET name = 'EMBALAGEM DE ISOPOR CARNE - 100UN', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE 'DESCARTÁVEL CARNE C/200';

    UPDATE public.items 
    SET name = 'EMBALAGEM DE ISOPOR HAMBURG - 100UN', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE 'DESCARTÁVEL HAMBURGUERIA C/100';

    -- =========================================================================
    -- 2. Padronizar potes
    -- =========================================================================
    -- Atualizações
    UPDATE public.items 
    SET name = 'POTE 250ML - 25UN', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE 'POTE 250 ML C/25';

    UPDATE public.items 
    SET name = 'POTE 500ML - 25UN', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE 'POTE 500 ML C/24';

    UPDATE public.items 
    SET name = 'POTE 145ML - 25UN', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE '%potinho de molho%';

    -- Inserções caso não existam após as atualizações
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'POTE 145ML - 25UN') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'POTE 145ML - 25UN', 'UN', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'POTE 30ML - 50UN') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'POTE 30ML - 50UN', 'UN', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'POTE 60ML - 100UN') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'POTE 60ML - 100UN', 'UN', true);
    END IF;

    -- =========================================================================
    -- 3. Padronizar quentinhas
    -- =========================================================================
    UPDATE public.items 
    SET name = 'QUENTINHA 500ML - 100UN', unit = 'PCT' 
    WHERE group_id = v_group_id AND name ILIKE 'QUENTINHA 500 ML C/100';

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'QUENTINHA 1100ML - 100UN') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'QUENTINHA 1100ML - 100UN', 'PCT', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'QUENTINHA 220ML - 100UN') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'QUENTINHA 220ML - 100UN', 'PCT', true);
    END IF;

    -- =========================================================================
    -- 4. Corrigir unidade dos sacos 40x60 e 50x80
    -- =========================================================================
    UPDATE public.items 
    SET unit = 'UN' 
    WHERE group_id = v_group_id AND name IN ('SACO 40X60', 'SACO 50X80');

    -- =========================================================================
    -- 5. Padronizar sacos delivery
    -- =========================================================================
    -- Usando exact ILIKE para evitar que '... G' sobrescreva '... GG'
    UPDATE public.items 
    SET name = 'SACO DELIVERY (G) - 50UN', unit = 'PCT', unit_observation = 'Contar pacote fechado, não unidade solta.' 
    WHERE group_id = v_group_id AND name ILIKE 'SACO DELIVERY C/50 G';

    UPDATE public.items 
    SET name = 'SACO DELIVERY (GG) - 50UN', unit = 'PCT', unit_observation = 'Contar pacote fechado, não unidade solta.' 
    WHERE group_id = v_group_id AND name ILIKE 'SACO DELIVERY C/50 GG';

    UPDATE public.items 
    SET name = 'SACO DELIVERY (M) - 50UN', unit = 'PCT', unit_observation = 'Contar pacote fechado, não unidade solta.' 
    WHERE group_id = v_group_id AND name ILIKE 'SACO DELIVERY C/50 M';

    -- =========================================================================
    -- 6. Padronizar saladeiras
    -- =========================================================================
    UPDATE public.items 
    SET name = 'SALADEIRA 500ML', unit = 'UN' 
    WHERE group_id = v_group_id AND name ILIKE 'SALADEIRA 500 ML';

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'SALADEIRA 1000ML') THEN
        INSERT INTO public.items (group_id, name, unit, active) VALUES (v_group_id, 'SALADEIRA 1000ML', 'UN', true);
    END IF;

    -- =========================================================================
    -- 7. Incluir embalagens de executivo
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'EMBALAGEM TAMPA EXECUTIVO - 100UN') THEN
        INSERT INTO public.items (group_id, name, unit, unit_observation, active) 
        VALUES (v_group_id, 'EMBALAGEM TAMPA EXECUTIVO - 100UN', 'PCT', 'Contar pacote fechado com 100 unidades.', true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.items WHERE group_id = v_group_id AND name = 'EMBALAGEM DE ISOPOR EXECUTIVO - 100UN') THEN
        INSERT INTO public.items (group_id, name, unit, unit_observation, active) 
        VALUES (v_group_id, 'EMBALAGEM DE ISOPOR EXECUTIVO - 100UN', 'PCT', 'Contar pacote fechado com 100 unidades.', true);
    END IF;

END $$;
