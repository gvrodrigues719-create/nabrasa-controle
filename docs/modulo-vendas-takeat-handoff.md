# Handoff — Módulo de Vendas (Takeat)

**Projeto:** NaBrasa Controle  
**Data:** Abril 2026  
**Status:** Rascunho visual e funcional · Integração real pendente

---

## 1. Objetivo do Módulo

Integrar o NaBrasa Controle com a API da Takeat para puxar dados reais de vendas (sessões, comandas, pagamentos, itens) e cruzá-los com os módulos existentes de estoque, contagem e CMV.

Este módulo é o **novo eixo de Vendas** do sistema — separado e independente dos módulos de operação já existentes.

---

## 2. Rota Criada

```
/dashboard/admin/vendas
```

Acessível via: **Dashboard → Configurar (admin) → Módulo de Vendas**

---

## 3. Arquivos Criados e Alterados

### Novos arquivos:

| Arquivo | Descrição |
|---|---|
| `src/app/dashboard/admin/vendas/page.tsx` | Página principal do módulo |
| `src/lib/takeat/takeatTypes.ts` | Tipos TypeScript baseados na documentação confirmada da API |
| `src/lib/takeat/takeatMockData.ts` | Mock data estruturado para demonstração |
| `src/lib/takeat/takeatService.ts` | Service stub — assinaturas reais, implementação HTTP pendente |
| `docs/modulo-vendas-takeat-handoff.md` | Este arquivo |

### Arquivos alterados:

| Arquivo | O que mudou |
|---|---|
| `src/app/dashboard/admin/page.tsx` | Adicionado card "Módulo de Vendas" em seção separada "Vendas" |

---

## 4. O que Está Real Hoje

- Estrutura de rotas e navegação funcionando
- Tipos TypeScript completos baseados na documentação da API Takeat
- Assinaturas de função do `TakeatService` com comentários detalhados de implementação
- Visual completo com todos os 7 blocos (A–G) renderizando corretamente
- Card de acesso no admin separado dos módulos existentes
- Build sem erros

---

## 5. O que Está Mockado Hoje

| Dado | Arquivo do Mock |
|---|---|
| 5 sessões de mesa/comanda | `takeatMockData.ts` → `MOCK_SESSIONS` |
| Resumo agregado do período | `takeatMockData.ts` → `MOCK_SUMMARY` |
| Período de demonstração | `takeatMockData.ts` → `MOCK_PERIOD` |
| Métodos de pagamento | `takeatMockData.ts` → `MOCK_PAYMENT_METHODS` |

O mock foi estruturado com base na documentação confirmada da API. Campos e nomes respeitam o retorno esperado; a hierarquia `bill → order_baskets → orders → order_products` está corretamente representada. Complementos são simplificados (campo único em vez de `complement_categories → order_complements`) para fins de demonstração visual.

---

## 6. O que Ainda NÃO Foi Implementado

- [ ] Autenticação real com a API Takeat (POST `/public/api/sessions`)
- [ ] Chamada HTTP real para `/table-sessions`
- [ ] Cache/refresh do token JWT (expira em 15 dias)
- [ ] Tratamento de timezone UTC-0 → America/Sao_Paulo
- [ ] Persistência dos dados brutos (raw) no Supabase
- [ ] Normalização para modelo interno
- [ ] Filtro de datas real na UI (período hardcoded no mock)
- [ ] Paginação (se a API suportar)
- [ ] Tratamento de erros de rede e feedback para o usuário
- [ ] Endpoints `/payment-methods` e `/products` implementados
- [ ] Cruzamento com estoque e CMV
- [ ] Dashboard gerencial real
- [ ] Análise por IA

---

## 7. Estrutura Pensada para Evoluir

```
src/lib/takeat/
├── takeatTypes.ts        ← tipos definitivos, não mudar estrutura
├── takeatMockData.ts     ← substituir pela chamada real no service
└── takeatService.ts      ← implementar os TODOs aqui

src/app/dashboard/admin/vendas/
└── page.tsx              ← trocar MOCK_SESSIONS/MOCK_SUMMARY por chamada ao service
```

**Padrão de evolução:**
1. Implementar `TakeatService.authenticate()` e `getTableSessions()`
2. Criar estado de loading + error na `page.tsx`
3. Substituir `MOCK_SESSIONS` e `MOCK_SUMMARY` pelos dados reais retornados
4. Adicionar seletor de período na UI (respeitando janela de 3 dias)
5. Persistir dados brutos no Supabase (tabela `takeat_raw_sessions` ou similar)
6. Criar job/trigger de normalização

---

## 8. Endpoints da API Takeat Confirmados

| Endpoint | Método | Descrição | Status |
|---|---|---|---|
| `/public/api/sessions` | POST | Autenticação, retorna JWT | Documentado |
| `/api/v1/table-sessions` | GET | Sessões por período (máx 3 dias) | Documentado |
| `/api/v1/payment-methods` | GET | Métodos de pagamento cadastrados | Documentado |
| `/api/v1/products` | GET | Produtos cadastrados | Documentado |
| `/api/v1/complements` | GET | Complementos cadastrados | Documentado |

**Regras confirmadas:**
- Token JWT expira em **15 dias**
- Timezone da API: **UTC-0** (Brasília = UTC-3 → ajuste necessário)
- Janela máxima por consulta: **3 dias**
- Base autenticada: `https://backend-pdv.takeat.app/api/v1`

---

## 9. Próximos Passos para Plugar a Integração Real

**Passo 1 — Variáveis de ambiente**
```
# .env.local (nunca commitar)
TAKEAT_EMAIL=email-da-conta-takeat
TAKEAT_PASSWORD=senha-da-conta-takeat
```

**Passo 2 — Implementar `authenticate()` em `takeatService.ts`**

Descomentar o bloco `fetch` já escrito no service e remover o `throw`.

**Passo 3 — Implementar `getTableSessions()` em `takeatService.ts`**

Descomentar o bloco `fetch` já escrito. Adicionar tratamento de token expirado (auto-renovação ou aviso).

**Passo 4 — Atualizar `vendas/page.tsx`**

Substituir:
```typescript
// De:
import { MOCK_SESSIONS, MOCK_SUMMARY } from '@/lib/takeat/takeatMockData'

// Para:
import { getTableSessions, aggregatePeriodSummary } from '@/lib/takeat/takeatService'
```

Adicionar `useEffect` para carregar dados reais com loading state.

**Passo 5 — Adicionar seletor de período na UI**

Respeitar janela de 3 dias. Validar no service (já tem o check de `MAX_DAYS`).

**Passo 6 — Persistência raw (opcional mas recomendado)**

Criar tabela `takeat_raw_sessions` no Supabase para guardar o retorno bruto e evitar re-consultas desnecessárias.

---

## 10. Observações para Continuidade no Antigravity

- **Não alterar `takeatTypes.ts`** sem verificar os campos do retorno real — a estrutura foi mapeada com cuidado
- **O mock data é estruturalmente fiel** ao retorno esperado — campos, nomes e hierarquia estão corretos
- **O visual está finalizado** — não precisa mexer no layout da `page.tsx` para plugar a integração, apenas substituir as importações de mock por chamadas reais
- **Os comentários `TODO` no `takeatService.ts`** indicam exatamente onde e como implementar cada função
- **O card no admin** está em seção separada "Vendas" — não conflita com os módulos existentes
- A UI usa `max-w-md` e é mobile-first, consistente com o restante do sistema
- Não há dependências novas — apenas os pacotes já existentes no projeto

---

*Handoff gerado em: Abril 2026 · NaBrasa Controle · Módulo de Vendas v0.1*
