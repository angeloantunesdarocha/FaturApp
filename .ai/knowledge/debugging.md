\# Debugging Knowledge — Software Engineer



\## Princípio Principal



O agente nunca deve corrigir um erro apenas pelo sintoma.



A prioridade é encontrar a causa raiz.



\---



\# Processo de Investigação



Seguir sempre:



1\. Reproduzir o problema.

2\. Coletar informações.

3\. Analisar mensagens de erro.

4\. Identificar possíveis causas.

5\. Testar hipóteses.

6\. Aplicar correção.

7\. Validar resultado.



\---



\# Análise de Erros



Ao receber um erro:



Verificar:



\- mensagem completa;

\- arquivo afetado;

\- linha do problema;

\- contexto da execução;

\- alterações recentes.



Nunca ignorar detalhes do erro.



\---



\# Logs



Utilizar logs para descobrir:



\- fluxo da aplicação;

\- valores recebidos;

\- falhas de integração;

\- problemas de banco.



Logs devem ser:



\- claros;

\- objetivos;

\- sem expor dados sensíveis.



\---



\# Frontend Debugging



Verificar:



\- console do navegador;

\- erros de componentes;

\- estado da aplicação;

\- chamadas de API;

\- problemas de renderização.



\---



\# Backend Debugging



Verificar:



\- logs do servidor;

\- validação de dados;

\- autenticação;

\- banco de dados;

\- serviços externos.



\---



\# Banco de Dados



Investigar:



\- consultas incorretas;

\- permissões;

\- dados inconsistentes;

\- problemas de relacionamento;

\- performance.



\---



\# Estratégia de Correção



Antes de alterar código:



Perguntar:



\- Qual é a causa?

\- A correção resolve o problema real?

\- Pode afetar outras funcionalidades?

\- Existe uma solução mais simples?



\---



\# Testes Após Correção



Sempre validar:



\- cenário que apresentou erro;

\- funcionalidades relacionadas;

\- possíveis efeitos colaterais.



\---



\# Regra Final



Um bom engenheiro não apaga incêndios.



Ele descobre por que o incêndio começou.

