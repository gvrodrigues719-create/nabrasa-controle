# Scripts Auxiliares (NaBrasa Controle)

Este diretório centraliza todos os scripts em Node.js (extensão `.mjs`) utilizados para apoiar o desenvolvimento, diagnosticar problemas e popular os bancos de dados do Supabase. Todo script deve idealmente ser executado a partir da **raiz do projeto** para garantir que os arquivos de ambiente `.env.local` e diretórios subjacentes como `data/` sejam encontrados.

## Estrutura

- **/checks**: Scripts de leitura para testar APIs da web, Row Level Security (RLS), checar dados migrados e reportar logs. Não causam destruição de dados.
- **/migrations**: Scripts para forçar injeções ou deleções destrutivas/massivas, como CSV parsing (`importCsv.mjs`) e setups manuais.
- **/utils**: Pequenos canivetes-suíços, como *patchers* de sessão e reset de PINs em lotes de usuários de teste.

## Como Executar
```bash
# Na verdade a execução deve ser feita do root do projeto:
node ./scripts/checks/check_data.mjs
node ./scripts/migrations/importCsv.mjs
```
