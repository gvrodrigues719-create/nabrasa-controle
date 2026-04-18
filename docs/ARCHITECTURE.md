# Arquitetura do Sistema: NaBrasa Controle (MOC/Manager)

Este documento descreve o estado atual da arquitetura, maturidade dos módulos e diretrizes técnicas estabelecidas após a Fase S3.

## 1. Visão Geral
O NaBrasa Controle é um sistema bimodal (Operador/Gerente) construído em **Next.js 16 (App Router)** com **Supabase** como backend escalável.

## 2. Camadas de Implementação

### 2.1 Server Actions (H hardened S1/S2)
Localizadas em `src/app/actions`:
- **Segurança**: Todas as ações críticas resolvem o `userId` no servidor. Nunca se confia no ID vindo do cliente.
- **Observabilidade**: Logs padronizados `[ACTION]` e `[AUTH_FAIL]` implementados para Checklist, Perdas e Recompensas.

### 2.2 Hooks de Dashboard (Modularização S3)
A lógica da Dashboard foi desacoplada em hooks especializados (`src/app/dashboard/hooks`):
- `useDashboardIdentity`: Resolução de sessão (PIN/Supabase) e roles.
- `useDashboardData`: Orquestração de buscas (Efficiency, Metrics, Focus).
- `useDashboardUI`: Gestão de estado de gavetas (Drawers) e visão bimodal.

## 3. Maturidade dos Módulos (S2 Taxonomy)

| Módulo | Status | Descrição |
| :--- | :--- | :--- |
| **Checklist** | `ativo` | Fluxo completo (Lista -> Execução -> Conclusão). |
| **Contagem** | `ativo parcial` | Execução funcional (Operador); Gestão de Agendas (Admin) funcional. |
| **Perdas** | `ativo parcial` | Registro individual e gamificação integrados. |
| **CMV** | `ativo parcial` | Visualização de saúde financeira operacional iniciada. |
| **Vendas** | `ativo parcial` | Integração Takeat para faturamento e ticket médio. |
| **Gamificação** | `demo` | Sistema de pontos funcional; Resgate de recompensas em modo demo. |
| **IA Copilot** | `ativo parcial` | Auxílio operacional blindado contra vazamento de contexto. |

## 4. Performance Baseline
- **Tempo Médio de Load (Dashboard)**: ~300ms a 700ms (Data fetching paralelo via Hooks).
- **Métrica**: Logada no console do navegador como `[PERF] Dashboard data loaded`.

## 5. Próximos Passos (Próximas Sprints)
- Auditoria de CMV por Nota Fiscal.
- Automação de Escalas e Performance de Equipe.
