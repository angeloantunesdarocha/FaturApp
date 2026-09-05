# Correções críticas de identidade e acesso

Escopo: autenticação, isolamento de dados e dependências de segurança. As fórmulas, lançamentos, relatórios e regras de contribuição não são alterados.

## Comportamento

- OAuth confere o ID e o e-mail confirmado na identidade Supabase, incluindo a existência da sessão no servidor. Parâmetros externos não escolhem uma conta diferente.
- O administrador é ancorado no ID da conta existente de `angeloantunesdarocha@gmail.com`, verificada no momento da migração. Cadastro público cria apenas `user`. Trigger e índice impedem outro admin e impedem excluir, rebaixar ou substituir a identidade do proprietário.
- A migração não altera nenhuma senha, sessão existente ou lançamento. Ela aborta se não encontrar exatamente um administrador verificado ou se encontrar e-mails duplicados.
- Recuperação resolve uma única conta pela identidade autenticada. Ao concluir uma troca de senha, revoga apenas sessões próprias daquela conta e retorna uma sessão nova ao navegador. Os demais usuários continuam conectados. O cliente também solicita ao Supabase a saída das outras sessões Auth.
- E-mail de recuperação existente só pode ser alterado por identidade vinculada que tenha confirmado o novo endereço. A identidade administrativa permanece fixa.
- URLs de autenticação usam origens configuradas e caminhos internos. Previews Vercel reconhecem `VERCEL_URL` e `VERCEL_BRANCH_URL`; ambientes com domínio adicional devem definir `NEXT_PUBLIC_APP_URL` corretamente e configurar a allowlist OAuth do Supabase.
- Next.js 15.5.25, React/React DOM 19.2.8 e PostCSS 8.5.28. Ajustes de cookies e parâmetros assíncronos são de compatibilidade. `xlsx` foi removido porque não era utilizado; ExcelJS continua responsável pelas planilhas.

## Validação reproduzível

- `npm ci`
- `npm run test:security`: PostgreSQL local em memória (PGlite), somente identidades e senhas sintéticas. Reproduz o problema anterior e verifica rejeição após a migração; confirma preservação de dados na instalação, admin único, login comum/Google, recuperação e revogação seletiva.
- `npm run test:financial`
- `npm run test:reports`
- `npm run build`

A fixture SQL registra somente definições de funções anteriores, sem dados ou credenciais de produção. A migração de segurança assume o esquema existente; o repositório histórico não contém todas as migrações de bootstrap do banco.

## Implantação e preservação de acesso

1. Confirmar o proprietário, unicidade de e-mails, versão implantada e backup/PITR. Conferir que não houve alteração concorrente nas funções que serão substituídas.
2. Testar a migração em ambiente isolado. A migração é transacional e tem timeout curto para aquisição de locks.
3. Aplicar apenas `20260905030858_critical_identity_owner_security.sql` ao projeto correto. Não executar novamente todas as migrações históricas nem usar `schema.sql` para atualizar produção.
4. Publicar o frontend testado. A nova tela de recuperação depende da RPC `app_complete_password_recovery`, portanto o banco deve preceder o frontend.
5. Conferir login comum, Google, admin, recuperação e relatórios; comparar contagens de usuários, sessões e lançamentos. Não registrar valores de tokens/senhas nas verificações.

Clientes antigos continuam compatíveis com as assinaturas das RPCs existentes. Uma aba antiga de recuperação que use a RPC booleana anterior precisará fazer login com a nova senha depois da troca, pois essa operação agora revoga as sessões anteriores da própria conta.

Em falha de build, não publicar. Em falha transacional de migração, o banco permanece inalterado. Depois de aplicar com sucesso, preferir correção incremental: remover a proteção de identidade para reverter código reabriria a falha. Rollback do frontend mantém logins existentes, mas a versão antiga do Next.js possui avisos de segurança conhecidos.

## Limites

Os testes isolados não substituem uma autenticação Google real ou entrega de e-mail em homologação. Não usar credenciais de usuários reais nem copiar tokens de produção para testes. Não há promessa de ausência de toda vulnerabilidade: este conjunto cobre os riscos críticos definidos no escopo. Dependências indiretas de ExcelJS podem continuar com alertas que exigem revisão separada; não fazer downgrade automático da exportação para satisfazer `npm audit`.
