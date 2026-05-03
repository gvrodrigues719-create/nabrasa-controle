# CONTEXTO MESTRE — NABRASA CONTROLE

## 1. O que é este projeto
O **NaBrasa Controle** é um sistema operacional modular para gestão real de restaurante.

Ele não é um app genérico de tarefas.
Ele não é um dashboard bonito.
Ele não é uma vitrine de IA.

Ele existe para:
- organizar a operação
- dar clareza ao gestor
- padronizar execução
- controlar custo, rotina, pendência e desempenho
- usar IA como apoio operacional

**Regra central:** a operação é o centro. A tecnologia é meio. IA acelera método, não substitui gestão.

---

## 2. Como pensar este sistema
Sempre tratar o NaBrasa Controle como um **sistema operacional de restaurante**.

### Mentalidade obrigatória
- pensar em uso real no dia a dia da loja
- priorizar o que ajuda gerente e colaborador a executar melhor
- evitar features decorativas, gimmicks ou estética acima da execução
- manter arquitetura modular e expansível
- preservar coerência com o que já existe no projeto
- fazer mudanças conservadoras e bem encaixadas
- não quebrar estrutura existente sem necessidade real

### O que evitar
- inventar moda
- criar telas “bonitas” sem utilidade operacional
- duplicar lógica
- fazer refatoração grande sem necessidade
- criar abstrações demais
- transformar operação em joguinho
- usar hype de IA como protagonista

---

## 3. Lógica obrigatória do produto
### MOC
O MOC é o **Módulo Operacional do Colaborador**.

### Estrutura de rotinas
- contagem é a primeira rotina real do MOC
- checklist é a segunda rotina
- novas rotinas devem respeitar essa arquitetura plugável
- nunca tratar checklist como módulo separado do resto da operação

### Visões diferentes
- gerente e operador têm visões diferentes
- a home do gerente é uma **torre de controle do turno**
- a home do operador mostra **o que ele precisa fazer agora**

### Camadas secundárias
- gamificação e engajamento são camadas secundárias
- progresso visível, clareza, justiça e simplicidade têm prioridade
- a camada de engajamento nunca pode ficar acima da execução real

---

## 4. Como o sistema deve ser organizado hoje
### Camada 1 — Operação do Dia
Home principal do gerente:
- Espelho do Turno
- Equipe em Atenção
- Setores em tempo real
- Intervenção Operacional
- Ver como operador

### Camada 2 — Áreas do Sistema
Arquitetura visual atual do NaBrasa Controle:

1. **Rotinas Operacionais**
   - Checklist
   - Contagem
   - Auditoria Operacional
   - Abertura/Fechamento (em desenvolvimento)

2. **Estoque, CMV e Produção**
   - CMV & Compras
   - Registro de Perdas
   - Estoque
   - Ficha Técnica (em desenvolvimento)

3. **Vendas, Delivery e Atendimento**
   - Módulo de Vendas
   - Delivery / iFood
   - Atendimento / WhatsApp (em desenvolvimento)

4. **Equipe & Performance**
   - Ranking
   - Gestão da Equipe
   - Onboarding / trilhas (em desenvolvimento)

5. **Equipamentos & Manutenção**
   - Ativos
   - Plano de Manutenção
   - Chamados Técnicos (em breve)

6. **Processos e Regras**
   - Templates
   - Regras de Atribuição
   - Configuração Operacional

7. **Indicadores & Análises**
   - Relatórios Operacionais
   - Painéis
   - Histórico / análises por área (em desenvolvimento)

---

## 5. Como pensar UX/UI
### Regras visuais
- visual limpo, executivo, premium e funcional
- mobile-first quando fizer sentido operacional
- evitar excesso de cards, excesso de texto e excesso de cores
- priorizar hierarquia visual clara
- buscar leitura rápida em 3 segundos

### Para dashboards do gerente
Priorizar:
- status do turno
- alertas
- atrasos
- exceções
- áreas
- ações rápidas

### Para telas do operador
Priorizar:
- tarefa atual
- pendências
- progresso
- execução simples

### Paleta visual
- base neutra e executiva
- branco, off-white, cinzas quentes, grafite, marinho escuro
- usar cor apenas como acento sutil
- contraste forte só quando houver problema operacional real

---

## 6. Como pensar o gerente
O gerente não entra para “navegar sistema”.
Ele entra para:
- entender o turno em segundos
- saber o que está travando
- agir
- redistribuir
- cobrar
- fechar exceções

### Regra
O dashboard do gerente nunca pode virar mistura de:
- painel de operador
- gamificação
- administração solta
- BI bonito e vazio

Ele é uma **torre de controle**.

---

## 7. Como pensar o operador
O operador entra para:
- ver o que precisa fazer agora
- executar sem dúvida
- registrar progresso
- receber orientação curta e clara

### Regra
O operador não deve navegar por arquitetura.
Ele deve ver:
- minhas rotinas
- meus checklists
- minhas pendências
- ajuda da operação

---

## 8. Diretrizes técnicas
- reutilizar componentes e lógica existentes sempre que possível
- evitar duplicação de lógica
- respeitar schema, actions e fluxo atual antes de propor novo padrão
- pensar em idempotência, rastreabilidade e segurança operacional
- quando criar novas estruturas, manter nomes claros e aderentes ao domínio do restaurante
- não criar abstrações desnecessárias

### Em mudanças estruturais
Antes de implementar:
1. entender o contexto atual no código
2. propor a melhor solução
3. implementar de forma enxuta
4. entregar o que mudou, por que mudou, como testar e limitações

---

## 9. Regras para IA dentro do produto
A IA do NaBrasa Controle deve ser:
- apoio operacional
- curta, prática e objetiva
- baseada em contexto real
- nunca inventar regra
- nunca substituir liderança
- nunca virar “chat genérico”

### Prioridades da IA
- tirar dúvida operacional
- consultar pendências
- responder com base em dados reais
- apoiar checklist, contagem, perdas e rotina

---

## 10. Forma esperada de trabalho no projeto
Sempre que atuar neste projeto:

### primeiro
entender o contexto atual no código e nos documentos

### depois
propor a melhor solução aderente ao sistema

### depois
implementar de forma conservadora e bem encaixada

### ao final
sempre entregar:
1. o que foi alterado
2. por que foi alterado
3. como testar
4. riscos ou limitações remanescentes

---

## 11. Tom esperado
Direto, prático, sem hype tech, sem enfeite e sem inventar moda.

---

# DOCUMENTOS PRIORITÁRIOS PARA ANEXAR AO PROJETO

## 1. Documento-base do MOC
Mais importante.
Define:
- lógica do módulo operacional do colaborador
- contagem como primeira rotina
- checklist como segunda rotina
- arquitetura modular e expansível

## 2. Base Mestra de Permanência, Engajamento e Sistema Operacional do Colaborador
Importante para:
- não transformar o sistema em joguinho
- manter operação como centro
- usar engajamento como camada secundária
- priorizar progresso visível, justiça e simplicidade

## 3. Relatório-base de visão, ferramentas e arquitetura do Felipe Severino
Importante para:
- modularidade
- integração prática
- aderência a dores reais da operação
- visão de módulos operacionais conectados

## 4. Resumo atual da arquitetura do NaBrasa Controle
Se não existir, criar.
Esse resumo deve mostrar:
- áreas do sistema
- home do gerente
- home do operador
- módulos já ativos
- módulos em desenvolvimento
- lógica do produto

## 5. Walkthrough recente do estado do projeto
Para o Claude entender rápido:
- o que já existe
- o que já funciona
- o que foi refinado
- o que ainda está em desenvolvimento

## 6. Prints/telas atuais
Muito útil para:
- UX/UI
- não inventar layout desconectado
- manter coerência visual

## 7. Schema ou migrations principais
Importante para quem vai mexer em:
- actions
- tabelas
- regras
- distribuição
- copiloto
- painel do gerente

## 8. Documento de tom de voz do Guilherme / Guiga
Útil para:
- microcopy
- nomes de blocos
- textos internos
- mensagens operacionais

---

# ORDEM IDEAL DOS ANEXOS

1. Documento-base do MOC
2. Base Mestra de Permanência / Engajamento
3. Relatório-base do Felipe Severino
4. Resumo da arquitetura atual do NaBrasa Controle
5. Walkthrough do estado atual
6. Prints das telas
7. Schema / migrations principais
8. Tom de voz

---

# TEXTO CURTO PARA O CAMPO “INSTRUÇÕES” DO CLAUDE

Use este projeto como contexto vivo do NaBrasa Controle, um sistema operacional modular para gestão real de restaurante. A operação é o centro. IA é apoio. Contagem é a primeira rotina do MOC, checklist é a segunda. Gerente e operador têm visões diferentes. O gerente usa uma torre de controle do turno. O operador vê o que precisa fazer agora. Evite features decorativas, hype tech e abstrações desnecessárias. Preserve a arquitetura modular existente, leia os arquivos relacionados antes de alterar algo grande e faça mudanças conservadoras, claras e aderentes ao uso real da loja.
