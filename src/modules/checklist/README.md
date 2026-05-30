# Módulo de Checklist - Engine MOC

Este módulo define a estrutura para a execução de checklists operacionais no MOC (Módulo Operacional do Colaborador).

## Visão Geral
Checklists são rotinas de verificação vinculadas a contextos específicos. Diferente da contagem, o checklist lida com múltiplos tipos de dados (binário, escala, temperatura) e pode exigir evidências fotográficas.

## Contextos Operacionais
- **Abertura (opening)**: Verificações antes da operação.
- **Fechamento (closing)**: Verificações de encerramento de turno.
- **Diário (daily)**: Rotinas recorrentes de manutenção.
- **Recebimento (receiving)**: Conferência de mercadorias.
- **Personalizado (custom)**: Contextos sob demanda.

## Regras de Negócio (Contrato)
1. **Obrigatiedade**: Itens marcados como `required` impedem o fechamento da sessão se não forem respondidos.
2. **Evidências**: Itens com `evidence_required` devem ter uma `evidence_url` vinculada na resposta.
3. **Fechamento**: Uma sessão só pode ser marcada como `completed` se todos os itens obrigatórios (`mandatory_filled == mandatory_total`) estiverem resolvidos.

## Modelagem de Dados Proposta

### Tabelas Sugeridas (Supabase)

#### `checklist_templates`
- `id`: uuid (PK)
- `name`: text
- `context`: checklist_context (enum)
- `active`: boolean

#### `checklist_template_items`
- `id`: uuid (PK)
- `template_id`: uuid (FK)
- `label`: text
- `type`: checklist_item_type (enum)
- `required`: boolean
- `evidence_required`: boolean
- `display_order`: int

#### `checklist_sessions`
- `id`: uuid (PK)
- `routine_id`: uuid (FK routines, opcional)
- `template_id`: uuid (FK)
- `user_id`: uuid (FK users)
- `group_id`: uuid (FK groups, opcional)
- `status`: session_status (enum)
- `started_at`: timestamptz

#### `checklist_session_items` (Respostas)
- `id`: uuid (PK)
- `session_id`: uuid (FK)
- `item_id`: uuid (FK)
- `value`: jsonb (para suportar diferentes tipos de resposta)
- `evidence_url`: text (opcional)
- `is_na`: boolean (não se aplica)
