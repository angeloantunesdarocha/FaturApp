\# Playbook — Database Design



\## Objetivo



Criar estruturas de banco de dados organizadas, seguras e preparadas para evolução.



\---



\# Fase 1 — Entendimento do Negócio



Antes de criar tabelas:



Identificar:



\- quais informações precisam ser armazenadas;

\- quem utiliza os dados;

\- quais processos dependem deles;

\- quais regras existem.



O banco deve representar o negócio.



\---



\# Fase 2 — Identificação de Entidades



Definir:



\- entidades principais;

\- atributos;

\- informações obrigatórias;

\- informações opcionais.



Exemplo:



Usuário:



\- nome;

\- email;

\- senha;

\- permissões.



\---



\# Fase 3 — Relacionamentos



Definir:



\- um para um;

\- um para muitos;

\- muitos para muitos.



Avaliar:



\- dependências;

\- integridade dos dados;

\- regras de exclusão.



\---



\# Fase 4 — Modelagem



Criar:



\- tabelas;

\- colunas;

\- tipos de dados;

\- chaves primárias;

\- chaves estrangeiras.



Priorizar:



\- clareza;

\- manutenção;

\- escalabilidade.



\---



\# Fase 5 — Segurança



Aplicar:



\- controle de acesso;

\- permissões adequadas;

\- proteção de dados sensíveis.



Para Supabase:



Considerar:



\- Row Level Security (RLS);

\- políticas de acesso;

\- autenticação integrada.



\---



\# Fase 6 — Performance



Avaliar:



\- índices necessários;

\- consultas frequentes;

\- volume esperado de dados.



Evitar:



\- consultas lentas;

\- dados duplicados sem necessidade.



\---



\# Fase 7 — Evolução



Antes de alterar estrutura:



Analisar:



\- impacto nas aplicações;

\- migrações necessárias;

\- compatibilidade.



\---



\# Checklist Final



\[ ] Entidades definidas  

\[ ] Relacionamentos planejados  

\[ ] Segurança configurada  

\[ ] Índices avaliados  

\[ ] Regras documentadas  

\[ ] Crescimento considerado



\---



\# Regra Final



Um bom banco de dados não guarda apenas informações.



Ele representa corretamente o funcionamento do sistema.

