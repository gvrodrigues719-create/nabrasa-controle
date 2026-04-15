-- ============================================================
-- MIGRAÇÃO: Etapa 2 (Compras) + Etapa 3 (CMV)
-- Rodar no Supabase SQL Editor (Dashboard)
-- Data: 2026-04-15
-- ============================================================

-- 1. Adicionar campos de modo de custo na tabela items
ALTER TABLE items ADD COLUMN IF NOT EXISTS cost_mode TEXT NOT NULL DEFAULT 'direct'
  CHECK (cost_mode IN ('direct', 'conversion', 'manual'));
ALTER TABLE items ADD COLUMN IF NOT EXISTS purchase_unit TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS conversion_factor NUMERIC;

-- 2. Criar tabela stock_entries (registro de compras por ciclo)
CREATE TABLE IF NOT EXISTS stock_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES routine_executions(id),
  item_id UUID NOT NULL REFERENCES items(id),
  quantity_purchased NUMERIC NOT NULL,
  purchase_unit_price NUMERIC NOT NULL,
  converted_quantity NUMERIC NOT NULL,
  converted_unit_cost NUMERIC NOT NULL,
  update_avg_cost BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE stock_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock_entries_allow_all" ON stock_entries FOR ALL USING (true);

-- 3. Adicionar campos de CMV na routine_executions
ALTER TABLE routine_executions ADD COLUMN IF NOT EXISTS revenue NUMERIC DEFAULT 0;
ALTER TABLE routine_executions ADD COLUMN IF NOT EXISTS cmv_total NUMERIC;
ALTER TABLE routine_executions ADD COLUMN IF NOT EXISTS cmv_percentage NUMERIC;

-- 4. Criar tabela app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_allow_all" ON app_settings FOR ALL USING (true);

INSERT INTO app_settings (key, value) VALUES ('cmv_target', '{"percentage": 0.29}')
  ON CONFLICT (key) DO NOTHING;
