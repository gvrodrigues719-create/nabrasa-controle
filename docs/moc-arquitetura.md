# MOC - Módulo Operacional do Colaborador

O MOC é o centro de operações do colaborador no sistema NaBrasa. Ele foi projetado para consolidar todas as rotinas diárias em uma única interface modular e mobile-first.

## Pilares do MOC
- **Centralização**: Um hub único para todas as tarefas operacionais.
- **Rastreabilidade**: Garantia de que cada ação (contagem, checklist, etc.) seja pausável e auditável.
- **Continuidade**: Permite que o colaborador retome o trabalho de onde parou.

## Rotinas Atuais e Futuras
1.  **Contagem (Atual)**: Primeira rotina migrada para o modelo MOC.
2.  **Checklist (Futuro)**: Próxima expansão planejada.
3.  **Auditoria Móvel (Futuro)**: Verificação rápida no chão de loja.

## Arquitetura
O Módulo segue uma estrutura modular para evitar o acoplamento excessivo:
- `moc/core`: Lógica de transição e estado global do módulo.
- `moc/components`: Componentes UI reaproveitáveis entre rotinas.
- `moc/types`: Definições comuns.
- `moc/services`: Integrações com APIs específicas do colaborador.
