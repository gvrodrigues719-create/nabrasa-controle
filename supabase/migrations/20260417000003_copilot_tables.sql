-- Migration for Copilot Operational AI MVP

-- 1. Bases de Conhecimento
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  body text not null,
  tags text[],
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id uuid primary key default uuid_generate_v4(),
  document_id uuid references knowledge_documents(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- FAQ imediata para o MVP
CREATE TABLE IF NOT EXISTS knowledge_faq (
  id uuid primary key default uuid_generate_v4(),
  question text not null,
  answer text not null,
  tags text[],
  created_at timestamptz default now()
);

-- 2. Histórico de Conversas
CREATE TABLE IF NOT EXISTS copilot_conversations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  title text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS copilot_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references copilot_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'data')),
  content text not null,
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS copilot_feedback (
  id uuid primary key default uuid_generate_v4(),
  message_id uuid references copilot_messages(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  is_helpful boolean not null,
  feedback_text text,
  created_at timestamptz default now()
);

-- RLS Policies
ALTER TABLE knowledge_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "FAQ read for authenticated" ON knowledge_faq FOR SELECT USING (auth.role() = 'authenticated');

ALTER TABLE copilot_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users map conversations" ON copilot_conversations FOR ALL USING (auth.uid() = user_id);

ALTER TABLE copilot_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users map messages config" ON copilot_messages FOR ALL USING (
  exists (
    select 1 from copilot_conversations cc 
    where cc.id = copilot_messages.conversation_id 
    and cc.user_id = auth.uid()
  )
);

ALTER TABLE copilot_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users write feedback" ON copilot_feedback FOR ALL USING (auth.uid() = user_id);

-- Popular dados iniciais FAQ MVP
INSERT INTO knowledge_faq (question, answer, tags) VALUES
('O que fazer se sobrar carne após terminar as postas da cozinha e do salão?', 'Armazene nos refrigeradores secundários com etiqueta de manipulação com o peso restante atualizado.', ARRAY['estoque', 'contagem']),
('Encontrei um item perto da validade, onde deve ser alocado?', 'A regra FIFO do NaBrasa exige que o item mais próximo do vencimento fique na frente da prateleira. Se estiver no dia do vencimento e com uso improvável, deve ser descartado no Módulo de Perdas e retirado imediatamente da circulação.', ARRAY['validade', 'perdas']),
('Tem diferença entre item tracionado e inteiro na contagem?', 'Sim. Itens estritamente em gramas (como carnes fatiadas na praça) são marcados em gramas exatas. Itens fracionados (como caixa de creme de leite pela metade) consideram volume parcial ou embalagem inteira dependendo da métrica (unidade vs peso) definida na aba "Detalhes Técnicos" daquela rotina de checklist.', ARRAY['checklist', 'contagem']);
