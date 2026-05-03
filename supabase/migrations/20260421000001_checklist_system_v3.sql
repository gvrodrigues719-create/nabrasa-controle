-- 1. Evolução da Tabela de Templates
ALTER TABLE public.checklist_templates
ADD COLUMN IF NOT EXISTS area TEXT,
ADD COLUMN IF NOT EXISTS momento TEXT,
ADD COLUMN IF NOT EXISTS turno TEXT,
ADD COLUMN IF NOT EXISTS requires_signature BOOLEAN DEFAULT true;

-- 2. Vínculo por Unidade (Relation Table)
CREATE TABLE IF NOT EXISTS public.checklist_template_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL, -- Supondo que unit_id é um UUID no sistema
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id, unit_id)
);

-- 3. Evolução dos Itens do Template
DO $$ 
BEGIN 
    -- Adiciona criticidade se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='checklist_template_items' AND column_name='criticality') THEN
        ALTER TABLE public.checklist_template_items ADD COLUMN criticality TEXT DEFAULT 'standard' CHECK (criticality IN ('critical', 'important', 'standard'));
    END IF;
END $$;

ALTER TABLE public.checklist_template_items
ADD COLUMN IF NOT EXISTS generates_issue BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS generates_alert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS help_text TEXT;

-- 4. Preservação de Histórico (Snapshot) e Assinatura
ALTER TABLE public.checklist_sessions
ADD COLUMN IF NOT EXISTS signature_name TEXT,
ADD COLUMN IF NOT EXISTS signature_role TEXT,
ADD COLUMN IF NOT EXISTS template_snapshot JSONB;

-- 5. Campos de Resposta Detalhada
ALTER TABLE public.checklist_session_items
ADD COLUMN IF NOT EXISTS corrected_now BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS needs_manager_attention BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numeric_value DECIMAL;

-- 6. Tabela de Pendências Operacionais (Global)
CREATE TABLE IF NOT EXISTS public.operational_pending_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_type TEXT NOT NULL DEFAULT 'checklist', -- checklist, count, manual
    checklist_session_id UUID REFERENCES public.checklist_sessions(id) ON DELETE CASCADE,
    checklist_item_id UUID REFERENCES public.checklist_template_items(id),
    unit_id UUID NOT NULL,
    area TEXT,
    turno TEXT,
    severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'canceled')),
    visible_to_manager BOOLEAN DEFAULT true,
    visible_in_collective_view BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices para Performance
CREATE INDEX IF NOT EXISTS idx_pending_issues_unit_status ON public.operational_pending_issues(unit_id, status);
CREATE INDEX IF NOT EXISTS idx_checklist_template_units_unit ON public.checklist_template_units(unit_id);

-- SEEDING DOS 5 TEMPLATES OFICIAIS (VERSÃO ENXUTA)

DO $$
DECLARE
    v_cozinha_id UUID;
    v_cozinha_f_id UUID;
    v_salao_id UUID;
    v_salao_f_id UUID;
    v_caixa_id UUID;
BEGIN
    -- 1. CHECK ABERTURA COZINHA
    INSERT INTO public.checklist_templates (name, description, context, area, momento, turno, active)
    VALUES ('Check Abertura Cozinha', 'Checklist operacional de início de turno para a cozinha', 'opening', 'Cozinha', 'Abertura', 'manha', true)
    RETURNING id INTO v_cozinha_id;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, criticality, display_order) VALUES
    (v_cozinha_id, 'Equipamentos essenciais ligados e funcionando', 'boolean', 'critical', 1),
    (v_cozinha_id, 'Insumos e pré-preparo do turno disponíveis', 'boolean', 'critical', 2),
    (v_cozinha_id, 'Validades e armazenamento do que será usado conferidos', 'boolean', 'critical', 3),
    (v_cozinha_id, 'Estações principais prontas para operação', 'boolean', 'standard', 4),
    (v_cozinha_id, 'Lista de produção / PREP do dia alinhada', 'boolean', 'standard', 5),
    (v_cozinha_id, 'Faltas ou rupturas críticas registradas', 'boolean', 'important', 6),
    (v_cozinha_id, 'Área limpa e organizada para começar o turno', 'boolean', 'standard', 7),
    (v_cozinha_id, 'Equipe da cozinha apta para iniciar', 'boolean', 'standard', 8);

    -- 2. CHECK FECHAMENTO COZINHA
    INSERT INTO public.checklist_templates (name, description, context, area, momento, turno, active)
    VALUES ('Check Fechamento Cozinha', 'Checklist operacional de final de turno para a cozinha', 'closing', 'Cozinha', 'Fechamento', 'noite', true)
    RETURNING id INTO v_cozinha_f_id;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, criticality, display_order) VALUES
    (v_cozinha_f_id, 'Superfícies, utensílios e equipamentos higienizados', 'boolean', 'standard', 1),
    (v_cozinha_f_id, 'Alimentos armazenados corretamente para o próximo turno', 'boolean', 'critical', 2),
    (v_cozinha_f_id, 'Perecíveis descartados e perdas registradas quando houver', 'boolean', 'important', 3),
    (v_cozinha_f_id, 'Geladeiras, freezers e estoque da cozinha organizados no padrão', 'boolean', 'standard', 4),
    (v_cozinha_f_id, 'Churrasqueira, grelhas, coifa/exaustão e áreas críticas limpas', 'boolean', 'critical', 5),
    (v_cozinha_f_id, 'Equipamentos, luzes e pontos de risco desligados / verificados', 'boolean', 'critical', 6),
    (v_cozinha_f_id, 'Produtos de limpeza, utensílios e EPIs guardados corretamente', 'boolean', 'standard', 7),
    (v_cozinha_f_id, 'Proteínas e base do próximo turno separadas conforme PREP', 'boolean', 'standard', 8);

    -- 3. CHECK ABERTURA SALÃO
    INSERT INTO public.checklist_templates (name, description, context, area, momento, turno, active)
    VALUES ('Check Abertura Salão', 'Checklist operacional de início de turno para o salão', 'opening', 'Salão', 'Abertura', 'manha', true)
    RETURNING id INTO v_salao_id;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, criticality, display_order) VALUES
    (v_salao_id, 'Salão limpo, arrumado e pronto para receber cliente', 'boolean', 'standard', 1),
    (v_salao_id, 'Aparadores e mise en place abastecidos para o turno', 'boolean', 'standard', 2),
    (v_salao_id, 'Cardápios e materiais de atendimento disponíveis', 'boolean', 'standard', 3),
    (v_salao_id, 'Embalagens e materiais de viagem disponíveis', 'boolean', 'standard', 4),
    (v_salao_id, 'Ambiente funcionando corretamente', 'boolean', 'critical', 5),
    (v_salao_id, 'Time de atendimento pronto para operação', 'boolean', 'important', 6),
    (v_salao_id, 'Observações ou pendências do turno registradas', 'boolean', 'standard', 7);

    -- 4. CHECK FECHAMENTO SALÃO
    INSERT INTO public.checklist_templates (name, description, context, area, momento, turno, active)
    VALUES ('Check Fechamento Salão', 'Checklist operacional de final de turno para o salão', 'closing', 'Salão', 'Fechamento', 'noite', true)
    RETURNING id INTO v_salao_f_id;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, criticality, display_order) VALUES
    (v_salao_f_id, 'Salão limpo e organizado para o próximo turno', 'boolean', 'standard', 1),
    (v_salao_f_id, 'Mesas, cadeiras, aparadores e mise en place guardados corretamente', 'boolean', 'standard', 2),
    (v_salao_f_id, 'Cardápios, displays e materiais de atendimento guardados limpos e organizados', 'boolean', 'standard', 3),
    (v_salao_f_id, 'POS e itens de caixa recolhidos / guardados corretamente', 'boolean', 'critical', 4),
    (v_salao_f_id, 'Chopeira, máquina de café e equipamentos do salão higienizados e desligados', 'boolean', 'critical', 5),
    (v_salao_f_id, 'Luzes, TV, ar e cortinas de ar desligados', 'boolean', 'critical', 6),
    (v_salao_f_id, 'Janelas, portas e fechamento básico do setor verificados', 'boolean', 'critical', 7),
    (v_salao_f_id, 'Lixo retirado e utensílios remanescentes devolvidos à cozinha', 'boolean', 'standard', 8);

    -- 5. CHECK ABERTURA CAIXA / DELIVERY
    INSERT INTO public.checklist_templates (name, description, context, area, momento, turno, active)
    VALUES ('Check Abertura Caixa / Delivery', 'Checklist operacional de início de turno para caixa e delivery', 'opening', 'Caixa + Delivery', 'Abertura', 'manha', true)
    RETURNING id INTO v_caixa_id;

    INSERT INTO public.checklist_template_items (template_id, label, response_type, criticality, display_order) VALUES
    (v_caixa_id, 'Caixa, computador, telefone, impressoras e maquininha ligados e funcionando', 'boolean', 'critical', 1),
    (v_caixa_id, 'Troco e materiais básicos de operação disponíveis', 'boolean', 'standard', 2),
    (v_caixa_id, 'Balcão e área do caixa limpos e organizados', 'boolean', 'standard', 3),
    (v_caixa_id, 'Sobra ou falta de caixa identificada', 'number', 'critical', 4),
    (v_caixa_id, 'Embalagens e materiais de delivery disponíveis', 'boolean', 'standard', 5),
    (v_caixa_id, 'Cardápios digitais verificados com produtos disponíveis para venda', 'boolean', 'critical', 6),
    (v_caixa_id, 'Conservador / geladeiras / base do delivery prontos para o turno', 'boolean', 'standard', 7),
    (v_caixa_id, 'Entregadores e fluxo inicial de delivery aptos para operação', 'boolean', 'standard', 8);
END $$;
