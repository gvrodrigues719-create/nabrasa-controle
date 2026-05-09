-- ============================================================
-- Migration: Módulo Contagem da Cozinha Central
-- Versão: 2026-05-08
-- Segurança: 100% idempotente (IF NOT EXISTS / ON CONFLICT DO NOTHING)
-- Escopo: Cria grupos, rotina, itens e vinculações exclusivos da CK
-- NÃO modifica: rotinas de loja, contagens existentes, sugestão consolidada
-- ============================================================

-- ── PASSO 1: Criar grupos da Cozinha Central ─────────────────
-- Usamos nomes com prefixo "CK —" para isolamento visual e consultas

DO $$
DECLARE
    v_g_insumos       uuid;
    v_g_espetos       uuid;
    v_g_croquetes     uuid;
    v_g_carnes_por    uuid;
    v_g_carnes_frios  uuid;
    v_g_descartaveis  uuid;
    v_g_limpeza       uuid;
    v_rotina_id       uuid;
    v_kitchen_user_id uuid;
BEGIN

    -- Grupo: INSUMOS
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Insumos', 'Cozinha Central', 'Insumos de produção da Cozinha Central', 100, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_insumos FROM public.groups WHERE name = 'CK — Insumos' LIMIT 1;

    -- Grupo: ESPETOS
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Espetos', 'Cozinha Central', 'Espetos montados pela Cozinha Central', 101, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_espetos FROM public.groups WHERE name = 'CK — Espetos' LIMIT 1;

    -- Grupo: CROQUETES / PALMITO / LINGUIÇA CARACOL
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Croquetes / Palmito / Linguiça Caracol', 'Cozinha Central', 'Croquetes, palmito e linguiça caracol da CK', 102, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_croquetes FROM public.groups WHERE name = 'CK — Croquetes / Palmito / Linguiça Caracol' LIMIT 1;

    -- Grupo: CARNES PORÇÕES
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Carnes Porções', 'Cozinha Central', 'Porções de carne preparadas pela CK', 103, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_carnes_por FROM public.groups WHERE name = 'CK — Carnes Porções' LIMIT 1;

    -- Grupo: CARNES E FRIOS — INSUMOS
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Carnes e Frios — Insumos', 'Cozinha Central', 'Carnes e frios — insumos brutos da CK', 104, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_carnes_frios FROM public.groups WHERE name = 'CK — Carnes e Frios — Insumos' LIMIT 1;

    -- Grupo: DESCARTÁVEIS
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Descartáveis', 'Cozinha Central', 'Descartáveis de uso na Cozinha Central', 105, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_descartaveis FROM public.groups WHERE name = 'CK — Descartáveis' LIMIT 1;

    -- Grupo: PRODUTOS DE LIMPEZA
    INSERT INTO public.groups (name, macro_sector, description, order_index, active)
    VALUES ('CK — Produtos de Limpeza', 'Cozinha Central', 'Produtos de limpeza da Cozinha Central', 106, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_g_limpeza FROM public.groups WHERE name = 'CK — Produtos de Limpeza' LIMIT 1;

    -- ── PASSO 2: Criar a rotina "Contagem Cozinha Central" ────────

    INSERT INTO public.routines (name, frequency, active, routine_type)
    VALUES ('Contagem Cozinha Central', 'daily', true, 'count')
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_rotina_id FROM public.routines WHERE name = 'Contagem Cozinha Central' LIMIT 1;

    -- ── PASSO 3: Vincular grupos à rotina ─────────────────────────

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_insumos)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_espetos)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_croquetes)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_carnes_por)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_carnes_frios)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_descartaveis)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.routine_groups (routine_id, group_id)
    VALUES (v_rotina_id, v_g_limpeza)
    ON CONFLICT DO NOTHING;

    -- ── PASSO 4: Seed de Itens ────────────────────────────────────
    -- Categoria: INSUMOS
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('AÇÚCAR',                     'KG',          NULL,                          v_g_insumos, true),
        ('CREME DE LEITE 200G',        'CAIXINHA',    'Contar como CAIXINHA 200G',   v_g_insumos, true),
        ('FARINHA MANDIOCA',           'KG',          NULL,                          v_g_insumos, true),
        ('FEIJÃO PRETO (CALDEIRÃO)',   'KG',          NULL,                          v_g_insumos, true),
        ('MAIONESE KG BALDE 2,7',     'KG',          NULL,                          v_g_insumos, true),
        ('MOLHO BARBECUE 1,02KG',     'KG',          NULL,                          v_g_insumos, true),
        ('MOSTARDA ESCURA 200G',       'UN',          'Embalagem 200G',              v_g_insumos, true),
        ('MOSTARDA AMARELA',           'KG',          NULL,                          v_g_insumos, true),
        ('SAL',                        'KG',          NULL,                          v_g_insumos, true),
        ('MILHO TORRADO',              'UN',          'Saco 200G',                   v_g_insumos, true),
        ('LEMON PEPPER',               'UN',          'Saco 200G',                   v_g_insumos, true),
        ('CHIMICHURRI',                'UN',          'Saco 200G',                   v_g_insumos, true),
        ('ORÉGANO',                    'UN',          'Saco 200G',                   v_g_insumos, true),
        ('MARGARINA',                  'KG',          NULL,                          v_g_insumos, true),
        ('LEITE CONDENSADO',           'CAIXINHA',    NULL,                          v_g_insumos, true),
        ('ARROZ',                      'KG',          NULL,                          v_g_insumos, true),
        ('ALHO',                       'KG',          NULL,                          v_g_insumos, true),
        ('AÇÚCAR MASCAVO',             'KG',          NULL,                          v_g_insumos, true),
        ('PIMENTA BIQUINHA',           'BALDE',       NULL,                          v_g_insumos, true),
        ('FEIJÃO PRODUZIDO',           'KG',          NULL,                          v_g_insumos, true),
        ('VINAGRE',                    'UN',          NULL,                          v_g_insumos, true),
        ('AZEITE 2L',                  'UN',          NULL,                          v_g_insumos, true),
        ('ÓLEO 900ML',                 'UN',          NULL,                          v_g_insumos, true),
        ('LEITE',                      'CAIXA',       NULL,                          v_g_insumos, true),
        ('REQUEIJÃO 1,5KG',            'BISNAGA',     NULL,                          v_g_insumos, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: ESPETOS
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('BABY BEEF (5)',              'UNID', NULL, v_g_espetos, true),
        ('CORAÇÃO (5)',                'UNID', NULL, v_g_espetos, true),
        ('FRANGO (5)',                 'UNID', NULL, v_g_espetos, true),
        ('KAFTA COM QUEIJO',           'UNID', NULL, v_g_espetos, true),
        ('LINGUIÇA MINEIRA (6)',       'UNID', NULL, v_g_espetos, true),
        ('MISTO (5)',                  'UNID', NULL, v_g_espetos, true),
        ('QUEIJO COALHO (5)',          'UNID', NULL, v_g_espetos, true),
        ('SALSICHÃO (5)',              'UNID', NULL, v_g_espetos, true),
        ('SUÍNO (5)',                  'UNID', NULL, v_g_espetos, true),
        ('VEGETARIANO (1)',            'UNID', NULL, v_g_espetos, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: CROQUETES / PALMITO / LINGUIÇA CARACOL
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('LINGUIÇA CARACOL PROVOLONE', 'UND',  NULL, v_g_croquetes, true),
        ('PALMITO ROLO',               'ROLO', NULL, v_g_croquetes, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: CARNES PORÇÕES
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('FILÉ MIGNON EXECUTIVO',  'PORÇÃO', NULL, v_g_carnes_por, true),
        ('FILÉ MIGNON REFEIÇÃO',   'PORÇÃO', NULL, v_g_carnes_por, true),
        ('PICANHA EXECUTIVO',      'PORÇÃO', NULL, v_g_carnes_por, true),
        ('PICANHA REFEIÇÃO',       'PORÇÃO', NULL, v_g_carnes_por, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: CARNES E FRIOS — INSUMOS
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('BACON MANTA',                        'KG',   NULL, v_g_carnes_frios, true),
        ('BOMBOM DA ALCATRA',                  'KG',   NULL, v_g_carnes_frios, true),
        ('CORAÇÃO DE GALINHA',                 'KG',   NULL, v_g_carnes_frios, true),
        ('FILÉ MIGNON - BOVINO',               'KG',   NULL, v_g_carnes_frios, true),
        ('FILÉ MIGNON SUÍNO',                  'KG',   NULL, v_g_carnes_frios, true),
        ('GALETO',                             'UNID', NULL, v_g_carnes_frios, true),
        ('LINGUIÇA DE PERNIL (PARA PREPARAR)', 'KG',   NULL, v_g_carnes_frios, true),
        ('LINGUIÇA DEFUMADA FININHA PERDIGÃO', 'KG',   NULL, v_g_carnes_frios, true),
        ('PEITO DE FRANGO',                    'KG',   NULL, v_g_carnes_frios, true),
        ('PICANHA',                            'KG',   NULL, v_g_carnes_frios, true),
        ('SALSICHÃO',                          'KG',   NULL, v_g_carnes_frios, true),
        ('QUEIJO PARMESÃO',                    'KG',   NULL, v_g_carnes_frios, true),
        ('QUEIJO COALHO',                      'PEÇA', NULL, v_g_carnes_frios, true),
        ('QUEIJO GORGONZOLA',                  'KG',   NULL, v_g_carnes_frios, true),
        ('QUEIJO MUSSARELA',                   'KG',   NULL, v_g_carnes_frios, true),
        ('SOBRECOXA',                          'KG',   NULL, v_g_carnes_frios, true),
        ('BACON FATIADO',                      'KG',   NULL, v_g_carnes_frios, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: DESCARTÁVEIS
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('BOBINA PICOTE 16X30',                    'ROLO',    NULL, v_g_descartaveis, true),
        ('BOBINA PICOTE 20X35 - ROLO MÉDIA 1,16KG','ROLO',   NULL, v_g_descartaveis, true),
        ('BOBINA PICOTE 30X40 - ROLO MÉDIA 1,71KG','ROLO',   NULL, v_g_descartaveis, true),
        ('BOBINA PICOTE 40X60 - ROLO MÉDIA 2,36KG','ROLO',   NULL, v_g_descartaveis, true),
        ('CANUDO BIODEGRADÁVEL CX 3000',           'CX',      NULL, v_g_descartaveis, true),
        ('COPO DESCARTÁVEL 300ML PCT C/100',       'UNID',    NULL, v_g_descartaveis, true),
        ('DESCARTÁVEL CARNE C/200',                'UNID',    NULL, v_g_descartaveis, true),
        ('DESCARTÁVEL HAMBURGUERIA C/100',         'UNID',    NULL, v_g_descartaveis, true),
        ('EMBALAGEM GALETO C/100',                 'UNID',    NULL, v_g_descartaveis, true),
        ('ETIQUETA BOPP',                          'ROLO',    NULL, v_g_descartaveis, true),
        ('ETIQUETA PARA ETIQUETADORA',             'ROLO',    NULL, v_g_descartaveis, true),
        ('LACRE DA LINGUIÇA C/1000',               'CX',      NULL, v_g_descartaveis, true),
        ('PAPEL ALUMÍNIO 30X100 CM',               'ROLO',    NULL, v_g_descartaveis, true),
        ('PAPEL ALUMÍNIO 45X65 CM',               'ROLO',    NULL, v_g_descartaveis, true),
        ('POTE 250 ML C/25',                       'PCT',     NULL, v_g_descartaveis, true),
        ('POTE 500 ML C/24',                       'PCT',     NULL, v_g_descartaveis, true),
        ('QUENTINHA 500 ML C/100',                 'PCT',     NULL, v_g_descartaveis, true),
        ('RIBBON',                                 'UNID',    NULL, v_g_descartaveis, true),
        ('SACO 40X60',                             'AMARRADO',NULL, v_g_descartaveis, true),
        ('SACO 50X80',                             'AMARRADO',NULL, v_g_descartaveis, true),
        ('SACO DELIVERY C/50 G',                   'UNID',    NULL, v_g_descartaveis, true),
        ('SACO DELIVERY C/50 GG',                  'UNID',    NULL, v_g_descartaveis, true),
        ('SACO DELIVERY C/50 M',                   'UNID',    NULL, v_g_descartaveis, true),
        ('SALADEIRA 500 ML',                       'UNID',    NULL, v_g_descartaveis, true),
        ('TOUCA DESCARTÁVEL C/100',                'PCT',     NULL, v_g_descartaveis, true)
    ON CONFLICT DO NOTHING;

    -- Categoria: PRODUTOS DE LIMPEZA
    INSERT INTO public.items (name, unit, unit_observation, group_id, active)
    VALUES
        ('ALVEJANTE HIPOCLORITO DE SÓDIO 2,5% - 5L', 'UN', NULL, v_g_limpeza, true),
        ('HIPOCLORITO DE SÓDIO 5% - 5L',             'UN', NULL, v_g_limpeza, true),
        ('DESINFETANTE 5L',                          'UN', NULL, v_g_limpeza, true)
    ON CONFLICT DO NOTHING;

    -- ── PASSO 5: Estrutura de Auditoria ──────────────────────────
    -- Adicionar coluna de motivo se não existir
    BEGIN
        ALTER TABLE public.count_sessions ADD COLUMN validation_reason TEXT;
    EXCEPTION WHEN duplicate_column THEN
        -- Já existe
    END;

    -- ── PASSO 6: Atualizar primary_group_id do usuário Cozinha Central ──
    -- Âncora = grupo Insumos (primeiro grupo da rotina)
    -- Isso permite que initCountSessionAction libere acesso server-side
    UPDATE public.users
    SET primary_group_id = v_g_insumos
    WHERE name = 'Cozinha Central'
      AND (primary_group_id IS NULL OR primary_group_id NOT IN (
          v_g_insumos, v_g_espetos, v_g_croquetes,
          v_g_carnes_por, v_g_carnes_frios, v_g_descartaveis, v_g_limpeza
      ));

END $$;

-- ── PASSO 6: Índices de performance para consultas da CK ──────
CREATE INDEX IF NOT EXISTS idx_items_group_macro
    ON public.items (group_id)
    WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_groups_macro_sector
    ON public.groups (macro_sector);
