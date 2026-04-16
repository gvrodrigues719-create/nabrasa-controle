# Auditoria Detalhada: Importação de Base de Custos

Este documento contém a auditoria exata dos 29 itens atualizados no grupo **Match Forte**.

## 1. Confirmação de Integridade
- **Operação**: 29 chamadas `UPDATE` individuais via UUID.
- **Itens Recuperados para Auditoria**: 29 de 29.
- **Status de Proteção**: O filtro `.eq('id', uuid)` garantiu que apenas os registros mapeados fossem alterados.

## 2. Tabela Completa de Valores Aplicados

| Item Sistema | ID | Match CSV | Score | Preço (avg_cost) | Categoria | CMV? | Custo Médio? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Espeto de Baby Beef | `5dd76ed5-2081-4fb3-95ce-595d1527935f` | ESPETO DE BABY BEEF | 100.0% | R$ 12.00 | cmv | SIM | SIM |
| Espeto de Linguiça Mineira | `659e3a8b-1c43-46cf-9098-6018d7bf7cb3` | ESPETO LINGUIÇA MINEIRA | 93.3% | R$ 5.12 | cmv | SIM | SIM |
| Espeto Misto | `63ef8d5b-bd5c-446e-9e40-2f80f1513afd` | ESPETO MISTO | 100.0% | R$ 5.62 | cmv | SIM | SIM |
| Espeto de Queijo Coalho | `d0a05e53-439b-4ecd-9774-83fae83db6c6` | ESPETO QUEIJO COALHO | 92.3% | R$ 28.95 | cmv | SIM | SIM |
| Espeto Vegetariano | `1897b038-8d2b-4364-a2d0-b8dd4469a954` | ESPETO VEGETARIANO | 100.0% | R$ 4.92 | cmv | SIM | SIM |
| Queijo Coalho Festival | `c97bc4b9-7f8c-4d96-b6d3-55918c00f41e` | QUEIJO COALHO FESTIVAL | 100.0% | R$ 2.45 | cmv | SIM | SIM |
| Costelinha Suína | `1999e69d-e56d-47e3-a632-e2120dc6eaf7` | COSTELINHA SUÍNA | 100.0% | R$ 35.98 | cmv | SIM | SIM |
| Meio Pão de Alho | `8934a93f-387a-4df7-b3c2-a45797693815` | MEIO PÃO DE ALHO | 100.0% | R$ 1.22 | cmv | SIM | SIM |
| Pão de Alho | `65c14bbb-bc97-49be-8d53-f7cab5bd6a6d` | PÃO DE ALHO | 100.0% | R$ 2.92 | cmv | SIM | SIM |
| Maionese Temperada | `4c7ed1a4-db37-4cc2-b7dc-abcd7a372206` | MAIONESE TEMPERADA | 100.0% | R$ 2.69 | cmv | SIM | SIM |
| Farofa 2,5 kg | `96c71703-cee4-466f-a400-6e5ccb2d4ac5` | FAROFA 2,5 KG | 100.0% | R$ 31.15 | cmv | SIM | SIM |
| Açúcar Refinado | `98c91c90-e5c1-4031-b23c-9e7ac3ba8d76` | AÇÚCAR REFINADO | 100.0% | R$ 4.98 | cmv | SIM | SIM |
| Alecrim | `ea0776c7-97d1-44c5-8a25-88cd0b8f4a72` | ALECRIM | 100.0% | R$ 2.95 | cmv | SIM | SIM |
| Alface Americana | `66759d01-8ea9-4a1e-b547-b4947b76395f` | ALFACE AMERICANA | 100.0% | R$ 4.45 | cmv | SIM | SIM |
| Alface Crespa | `cf13d304-1854-4a4b-b0c9-31576e4b63cc` | ALFACE CRESPA | 100.0% | R$ 2.45 | cmv | SIM | SIM |
| Batata Asterix | `0020fc7b-1a43-41f9-b5fc-7230b4d430e4` | BATATA ASTERIX | 100.0% | R$ 3.95 | cmv | SIM | SIM |
| Batata Calabresa | `bdd34e09-27e2-4efe-83ad-4753c73e7f53` | BATATA CALABRESA | 100.0% | R$ 3.95 | cmv | SIM | SIM |
| Brócolis Comum | `92cb8513-1aac-4bd0-a3b0-30591aaffaf7` | BRÓCOLIS COMUM | 100.0% | R$ 4.95 | cmv | SIM | SIM |
| Cebola Roxa | `5a818f55-eab3-4e0d-8104-fb6041f973e8` | CEBOLA ROXA | 100.0% | R$ 6.95 | cmv | SIM | SIM |
| Salsa Crespa | `6ca63fbf-4363-4c90-9d0f-7b696de92a47` | SALSA CRESPA | 100.0% | R$ 3.95 | cmv | SIM | SIM |
| Tomate Grape | `ed60a68e-762c-4d8c-8acd-1bde82693072` | TOMATE GRAPE | 100.0% | R$ 7.99 | cmv | SIM | SIM |
| Rúcula | `7a93d810-1c42-438f-9c09-9df842091fda` | RUCULA | 100.0% | R$ 1.99 | cmv | SIM | SIM |
| Pimenta Tabasco | `815d273e-ef31-43cc-b249-39985a687295` | PIMENTA TABASCO | 100.0% | R$ 20.97 | cmv | SIM | SIM |
| Sal Temperado 200g | `6bfd303b-a8df-4285-a2ba-eaf5d65f4675` | SAL TEMPERADO 200G | 100.0% | R$ 5.47 | cmv | SIM | SIM |
| Guardanapo Simples | `a6f2ec2e-3abe-4ea1-95ef-69befdf2f42a` | GUARDANAPO SIMPLES | 100.0% | R$ 1.40 | embalagem | NÃO | NÃO |
| Sacola Verde P 110unid | `d7c1eeb3-ca8b-4e11-b070-43092d14eb5c` | SACOLA VERDE P - 110unid | 97.7% | R$ 6.34 | embalagem | NÃO | NÃO |
| Bobina Picotada 16x30 Rolo | `9e16e020-49f3-4077-937e-7d9103d1b70a` | BOBINA PICOTADA 16X30 ROLO | 100.0% | R$ 5.22 | uso_consumo | NÃO | NÃO |
| Bobina Térmica Amarela 79x30 CX30 | `7fa70459-d582-485c-87c2-e962ce6751c7` | BOBINA TERMICA AMARELA 79X30 CX30- UNI | 93.3% | R$ 59.40 | uso_consumo | NÃO | NÃO |
| Esponja Fibraco 3M Limpeza Pesada | `c189efbe-61d3-428a-a780-6ddbac3da400` | ESPONJA FIBRACO 3M LIMPEZA PESADA Grande | 92.1% | R$ 5.95 | limpeza | NÃO | NÃO |

## 3. Log de Execução Detalhado

| Item | Status | Detalhe |
| :--- | :--- | :--- |
| Espeto de Baby Beef | ✅ Sucesso | Atualizado com novo custo |
| Espeto de Linguiça Mineira | ✅ Sucesso | Atualizado com novo custo |
| Espeto Misto | ✅ Sucesso | Atualizado com novo custo |
| Espeto de Queijo Coalho | ✅ Sucesso | Atualizado com novo custo |
| Espeto Vegetariano | ✅ Sucesso | Atualizado com novo custo |
| Queijo Coalho Festival | ✅ Sucesso | Atualizado com novo custo |
| Costelinha Suína | ✅ Sucesso | Atualizado com novo custo |
| Meio Pão de Alho | ✅ Sucesso | Atualizado com novo custo |
| Pão de Alho | ✅ Sucesso | Atualizado com novo custo |
| Maionese Temperada | ✅ Sucesso | Atualizado com novo custo |
| Farofa 2,5 kg | ✅ Sucesso | Atualizado com novo custo |
| Açúcar Refinado | ✅ Sucesso | Atualizado com novo custo |
| Alecrim | ✅ Sucesso | Atualizado com novo custo |
| Alface Americana | ✅ Sucesso | Atualizado com novo custo |
| Alface Crespa | ✅ Sucesso | Atualizado com novo custo |
| Batata Asterix | ✅ Sucesso | Atualizado com novo custo |
| Batata Calabresa | ✅ Sucesso | Atualizado com novo custo |
| Brócolis Comum | ✅ Sucesso | Atualizado com novo custo |
| Cebola Roxa | ✅ Sucesso | Atualizado com novo custo |
| Salsa Crespa | ✅ Sucesso | Atualizado com novo custo |
| Tomate Grape | ✅ Sucesso | Atualizado com novo custo |
| Rúcula | ✅ Sucesso | Atualizado com novo custo |
| Pimenta Tabasco | ✅ Sucesso | Atualizado com novo custo |
| Sal Temperado 200g | ✅ Sucesso | Atualizado com novo custo |
| Guardanapo Simples | ✅ Sucesso | Atualizado com novo custo |
| Sacola Verde P 110unid | ✅ Sucesso | Atualizado com novo custo |
| Bobina Picotada 16x30 Rolo | ✅ Sucesso | Atualizado com novo custo |
| Bobina Térmica Amarela 79x30 CX30 | ✅ Sucesso | Atualizado com novo custo |
| Esponja Fibraco 3M Limpeza Pesada | ✅ Sucesso | Atualizado com novo custo |
