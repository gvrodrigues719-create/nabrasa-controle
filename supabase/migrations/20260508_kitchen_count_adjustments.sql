-- Migration: Ajustes Contagem Cozinha Central (Issue #2)
-- Objetivo: Incluir itens faltantes, nova categoria e garantir idempotência.

DO $$
DECLARE
    v_routine_id UUID;
    v_group_insumos_id UUID;
    v_group_carnes_id UUID;
    v_group_limpeza_id UUID;
BEGIN
    -- 1. Buscar IDs necessários
    SELECT id INTO v_routine_id FROM public.routines WHERE name = 'Contagem Cozinha Central';
    SELECT id INTO v_group_insumos_id FROM public.groups WHERE name = 'CK — Insumos' AND macro_sector = 'Cozinha Central';
    SELECT id INTO v_group_carnes_id FROM public.groups WHERE name = 'CK — Carnes e Frios — Insumos' AND macro_sector = 'Cozinha Central';

    -- 2. Criar nova categoria: CK — Produtos de Limpeza (se não existir)
    INSERT INTO public.groups (name, macro_sector, active)
    VALUES ('CK — Produtos de Limpeza', 'Cozinha Central', true)
    ON CONFLICT (name) DO UPDATE SET active = true
    RETURNING id INTO v_group_limpeza_id;

    -- 3. Vincular nova categoria à rotina
    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_routine_id, v_group_limpeza_id)
    ON CONFLICT DO NOTHING;

    -- 4. Adicionar itens em CK — Insumos
    INSERT INTO public.items (group_id, name, unit, active)
    VALUES 
        (v_group_insumos_id, 'MARGARINA', 'KG', true),
        (v_group_insumos_id, 'LEITE CONDENSADO', 'CAIXINHA', true),
        (v_group_insumos_id, 'ARROZ', 'KG', true),
        (v_group_insumos_id, 'ALHO', 'KG', true),
        (v_group_insumos_id, 'AÇÚCAR MASCAVO', 'KG', true),
        (v_group_insumos_id, 'PIMENTA BIQUINHA', 'BALDE', true),
        (v_group_insumos_id, 'FEIJÃO PRODUZIDO', 'KG', true),
        (v_group_insumos_id, 'VINAGRE', 'UN', true),
        (v_group_insumos_id, 'AZEITE 2L', 'UN', true),
        (v_group_insumos_id, 'ÓLEO 900ML', 'UN', true),
        (v_group_insumos_id, 'LEITE', 'CAIXA', true),
        (v_group_insumos_id, 'REQUEIJÃO 1,5KG', 'BISNAGA', true)
    ON CONFLICT (group_id, name) DO UPDATE SET active = true;

    -- 5. Adicionar itens em CK — Carnes e Frios — Insumos
    INSERT INTO public.items (group_id, name, unit, active)
    VALUES 
        (v_group_carnes_id, 'SOBRECOXA', 'KG', true)
    ON CONFLICT (group_id, name) DO UPDATE SET active = true;

    -- 6. Adicionar itens em CK — Produtos de Limpeza
    INSERT INTO public.items (group_id, name, unit, active)
    VALUES 
        (v_group_limpeza_id, 'ALVEJANTE HIPOCLORITO DE SÓDIO 2,5% - 5L', 'UN', true),
        (v_group_limpeza_id, 'HIPOCLORITO DE SÓDIO 5% - 5L', 'UN', true),
        (v_group_limpeza_id, 'DESINFETANTE 5L', 'UN', true)
    ON CONFLICT (group_id, name) DO UPDATE SET active = true;

END $$;
