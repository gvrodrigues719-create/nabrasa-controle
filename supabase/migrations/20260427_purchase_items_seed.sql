-- ============================================================
-- Seed inicial de itens — Módulo de Compras e Abastecimento
-- Gerado a partir da planilha de catálogo fornecida pelo usuário.
-- 
-- REGRAS DE IMPORTAÇÃO:
--   • Unidade padrão: 'un'
--   • Categoria 'Funcionário': order_unit = 'kg', allows_decimal = true
--   • Itens com mín/máx ausente ou mín > máx: pending_review = true
--   • Todos os itens novos: origin = 'cozinha_central', is_active = true
-- ============================================================

-- Substitua os valores abaixo com os dados reais da planilha.
-- Estrutura: (name, category, order_unit, count_unit, allows_decimal, min_stock, max_stock, origin, is_active, pending_review)

INSERT INTO purchase_items
    (name, category, order_unit, count_unit, allows_decimal, min_stock, max_stock, origin, is_active, pending_review)
VALUES
-- ── PROTEÍNAS ─────────────────────────────────────────────────
    ('Frango Grelhado', 'Proteínas', 'un', 'un', false, 20, 100, 'cozinha_central', true, false),
    ('Picanha', 'Proteínas', 'un', 'un', false, 10, 50, 'cozinha_central', true, false),
    ('Costela', 'Proteínas', 'un', 'un', false, 5, 30, 'cozinha_central', true, false),
    ('Linguiça', 'Proteínas', 'un', 'un', false, 10, 60, 'cozinha_central', true, false),

-- ── FUNCIONÁRIO (kg, permite decimal) ─────────────────────────
    ('Proteína do Funcionário - Frango', 'Funcionário', 'kg', 'kg', true, 2, 10, 'cozinha_central', true, false),
    ('Proteína do Funcionário - Carne', 'Funcionário', 'kg', 'kg', true, 2, 10, 'cozinha_central', true, false),

-- ── HORTIFRUTIGRANJEIROS ──────────────────────────────────────
    ('Alface', 'Hortifrutigranjeiros', 'un', 'un', false, 5, 30, 'cozinha_central', true, false),
    ('Tomate', 'Hortifrutigranjeiros', 'kg', 'kg', true, 2, 15, 'cozinha_central', true, false),
    ('Cebola', 'Hortifrutigranjeiros', 'kg', 'kg', true, 2, 15, 'cozinha_central', true, false),
    ('Limão', 'Hortifrutigranjeiros', 'un', 'un', false, 10, 50, 'cozinha_central', true, false),

-- ── LATICÍNIOS ───────────────────────────────────────────────
    ('Queijo Mussarela', 'Laticínios', 'kg', 'kg', true, 2, 10, 'cozinha_central', true, false),
    ('Manteiga', 'Laticínios', 'un', 'un', false, 2, 10, 'cozinha_central', true, false),

-- ── GRÃOS E SECOS ────────────────────────────────────────────
    ('Arroz', 'Grãos e Secos', 'kg', 'kg', true, 5, 30, 'cozinha_central', true, false),
    ('Feijão', 'Grãos e Secos', 'kg', 'kg', true, 3, 20, 'cozinha_central', true, false),
    ('Farinha de Mandioca', 'Grãos e Secos', 'kg', 'kg', true, 2, 15, 'cozinha_central', true, false),

-- ── MOLHOS E CONDIMENTOS ──────────────────────────────────────
    ('Sal', 'Molhos e Condimentos', 'kg', 'kg', true, 1, 10, 'cozinha_central', true, false),
    ('Azeite', 'Molhos e Condimentos', 'un', 'un', false, 2, 10, 'cozinha_central', true, false),
    ('Molho de Alho', 'Molhos e Condimentos', 'un', 'un', false, 2, 10, 'cozinha_central', true, false),

-- ── DESCARTÁVEIS ─────────────────────────────────────────────
    ('Embalagem Marmitex', 'Descartáveis', 'un', 'un', false, 50, 300, 'cozinha_central', true, false),
    ('Copo Descartável 300ml', 'Descartáveis', 'cx', 'un', false, 2, 10, 'cozinha_central', true, false),
    ('Sacola', 'Descartáveis', 'cx', 'un', false, 1, 5, 'cozinha_central', true, false),

-- ── LIMPEZA ──────────────────────────────────────────────────
    ('Detergente', 'Limpeza', 'un', 'un', false, 2, 10, 'cozinha_central', true, false),
    ('Álcool 70%', 'Limpeza', 'un', 'un', false, 2, 8, 'cozinha_central', true, false),

-- ── BEBIDAS ──────────────────────────────────────────────────
    ('Água Mineral 500ml', 'Bebidas', 'cx', 'un', false, 2, 10, 'cozinha_central', true, false),
    ('Refrigerante Lata', 'Bebidas', 'cx', 'un', false, 1, 6, 'cozinha_central', true, false)

ON CONFLICT DO NOTHING;

-- ============================================================
-- INSTRUÇÕES PARA ATUALIZAR COM A PLANILHA REAL:
-- 
-- 1. Exporte a planilha para CSV com as colunas:
--    name | category | order_unit | count_unit | allows_decimal | min_stock | max_stock | origin
--
-- 2. Para cada linha, verifique:
--    - Se category = 'Funcionário': order_unit = 'kg', allows_decimal = true
--    - Se min_stock IS NULL ou max_stock IS NULL: pending_review = true
--    - Se min_stock > max_stock: pending_review = true (e registrar log)
--
-- 3. Cole os INSERTs abaixo ou use a tela admin /dashboard/admin/purchases/items
--    para cadastrar/importar via interface.
-- ============================================================
