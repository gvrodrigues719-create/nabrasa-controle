# NaBrasa Controle — Checklist Operacional de Implantação

## 1. Preparação do Cadastro

### Antes de ligar o sistema
- [ ] Mapear todos os locais físicos do restaurante (câmara fria, almoxarifado, bar, cozinha, etc.)
- [ ] Criar grupos no sistema correspondendo 1:1 aos locais físicos
- [ ] Cadastrar todos os itens de estoque em seus respectivos grupos
- [ ] Conferir a **unidade** de cada item (kg, un, L, pct, etc.) — a unidade deve ser a de **contagem**, não a de compra
- [ ] Preencher o campo **"Observação da Contagem"** em itens que geram dúvida (ex: "Contar garrafas abertas em décimos", "Contar sacos fechados")
- [ ] Definir **mínimo** e **máximo esperado** para os 20 itens mais caros ou mais críticos

### Revisão semanal do cadastro
- [ ] Verificar se algum item novo entrou no restaurante e não está cadastrado
- [ ] Verificar se algum item foi descontinuado e deve ser inativado
- [ ] Conferir se itens com nomes parecidos não estão duplicados (o sistema alerta, mas precisa de olho humano)
- [ ] Revisar min/max de itens sazonais (ex: espetos no inverno vs verão)

---

## 2. Rotina Diária de Contagem

### Fluxo padrão
1. **Gerente** acessa o painel → clica na rotina → clica em **"Iniciar Ciclo Oficial"** → digita PIN
2. O estoque teórico é congelado naquele momento
3. **Operadores** acessam pelo celular → selecionam o local → **confirmam que estão fisicamente lá**
4. Contam item por item → sistema salva automaticamente
5. Itens com estoque zero: usar o botão **"Zerado"** (não deixar em branco)
6. Ao terminar todos os itens, clicar em **"Concluir Grupo"**
7. O sistema mostra um **resumo** → operador revisa → confirma

### Regras de ouro para o operador
- **Vazio NÃO é zero.** Campo em branco = não contado. Botão Zerado = confirmei que tem zero.
- **Não chutar.** Se não sabe a quantidade, pergunte antes de digitar.
- **Se o celular apagar**, os dados estão salvos. Reabra o link e continue.
- **Se der alerta amarelo**, pare e confira. O sistema só alerta quando o valor é muito diferente do esperado.

---

## 3. Regras de Validação Humana

### Para o gerente — após cada contagem
- [ ] Revisar o relatório gerado: itens com variação grande precisam de investigação
- [ ] Se um item aparece como "zerado", confirmar presencialmente se realmente acabou
- [ ] Se um item aparece com valor muito alto, verificar se o operador não confundiu a unidade
- [ ] Identificar padrões: se o mesmo item aparece com variação toda semana, há perda recorrente

### Red flags comuns
| Sinal | O que pode estar acontecendo |
|-------|------------------------------|
| Item zerado toda semana | Não está sendo reposto, ou está sendo contado no local errado |
| Variação > 20% em proteínas | Possível desvio, erro de porcionamento ou falha de contagem |
| Vários itens não contados | Operador pulou itens — retreinar |
| Contagem concluída em < 5 min para 30+ itens | Contagem fajuta — recontar |

---

## 4. Como Reportar um Bug

Se algo estranho acontecer durante a contagem:

1. **Tirar print da tela** (celular)
2. Anotar:
   - Qual rotina estava usando
   - Qual grupo/local
   - O que fez antes do erro
   - Horário aproximado
3. Enviar para o responsável técnico com a frase: **"Bug no NaBrasa Controle"**
4. **Não tentar "consertar" sozinho** — o gerente deve lidar

---

## 5. Microtreino do Operador (5 minutos)

### Passo a passo visual para ensinar um operador novo:

1. **"Você vai abrir o link no celular."** → Mostrar a URL salva na tela inicial
2. **"Escolha a rotina que o gerente mandou."** → Tela de rotinas
3. **"Toque no local onde você está."** → Bottom sheet de confirmação
4. **"Conte item por item. Digite o número e passe pro próximo."** → Lista de cards
5. **"Se o item acabou, aperte Zerado. Não deixe em branco."** → Botão vermelho
6. **"Quando terminar todos, aperte Concluir e confira o resumo."** → Tela de resumo
7. **"Pronto. O sistema salva sozinho."**

### Frases proibidas do operador:
- ❌ "Deixei em branco porque não tinha" → Tem que apertar **Zerado**
- ❌ "Coloquei mais ou menos" → Tem que **contar de verdade**
- ❌ "Não vi o alerta amarelo" → Se apareceu, **parar e conferir**

---

## 6. Checklist de Teste Manual (Pós-Deploy)

### Fluxo básico
- [ ] Login com PIN funciona
- [ ] Rotinas ativas aparecem na listagem
- [ ] "Iniciar Ciclo Oficial" congela estoque e libera grupos
- [ ] Bottom sheet de confirmação aparece antes de contar
- [ ] Contagem salva automaticamente (indicador "Sincronizado" fica verde)
- [ ] Botão "Zerado" marca o card como cinza e badge aparece
- [ ] Digitar manualmente em item zerado remove o estado zerado
- [ ] "Concluir Grupo" mostra resumo com contagem correta de contados/zerados/vazios
- [ ] Após concluir, grupo aparece como "Finalizado" na tela de rotina
- [ ] Alerta de valor fora do padrão aparece se min/max estiver configurado

### Resiliência
- [ ] Fechar e reabrir o navegador: dados persistem
- [ ] Trocar de dispositivo: dados do banco são carregados
- [ ] Desligar WiFi → contar → religar WiFi: dados sincronizam
- [ ] Item zerado persiste após trocar de dispositivo (is_zeroed no banco)

### Cadastro
- [ ] Criar item novo funciona
- [ ] Editar item existente mantém dados
- [ ] Alerta de nome duplicado aparece ao digitar nome igual no mesmo grupo
- [ ] Select de unidade mostra as 8 opções fixas
- [ ] Unidade legada aparece como "(legado)" se existir
