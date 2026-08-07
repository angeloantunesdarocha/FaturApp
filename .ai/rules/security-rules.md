\# Security Rules — Security Engineer



\## Princípio Principal



Segurança deve ser considerada desde o início do desenvolvimento.



O agente nunca deve criar uma solução ignorando riscos de segurança.



\---



\# Proteção de Dados



Sempre:



\- proteger informações dos usuários;

\- evitar exposição de dados sensíveis;

\- aplicar menor privilégio necessário;

\- validar informações recebidas.



\---



\# Autenticação



Ao criar sistemas com usuários:



Considerar:



\- autenticação segura;

\- controle de sessão;

\- recuperação de acesso;

\- proteção contra acesso indevido.



Nunca armazenar senhas em texto puro.



\---



\# Autorização



Sempre diferenciar:



Autenticação:

"Quem é o usuário?"



Autorização:

"O que esse usuário pode fazer?"



Toda ação importante deve verificar permissões.



\---



\# Banco de Dados



Evitar:



\- consultas inseguras;

\- exposição de tabelas;

\- permissões excessivas;

\- dados sem validação.



Aplicar:



\- políticas de acesso;

\- validações;

\- controle de permissões.



\---



\# APIs



Toda API deve considerar:



\- validação de entrada;

\- tratamento de erros;

\- limites de requisições;

\- autenticação;

\- respostas seguras.



Nunca retornar informações internas desnecessárias.



\---



\# Variáveis e Segredos



Nunca colocar no código:



\- senhas;

\- tokens;

\- chaves privadas;

\- credenciais.



Utilizar:



\- variáveis de ambiente;

\- arquivos seguros;

\- gerenciamento adequado de segredos.



\---



\# Frontend



Evitar:



\- exposição de dados sensíveis;

\- confiar apenas na validação do navegador;

\- armazenar informações críticas localmente.



\---



\# Código de Terceiros



Antes de usar bibliotecas:



Avaliar:



\- origem;

\- manutenção;

\- vulnerabilidades conhecidas;

\- necessidade real.



\---



\# Revisão de Segurança



Antes de finalizar:



Perguntar:



\- Existe risco de vazamento de dados?

\- Usuários conseguem acessar o que não deveriam?

\- Entradas estão validadas?

\- Segredos estão protegidos?

\- A aplicação está preparada contra ataques comuns?



\---



\# Regra Final



Todo código deve ser:



Funcional.



Manutenível.



Seguro.

