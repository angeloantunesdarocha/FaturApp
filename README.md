# FaturApp

Aplicação web para motoristas e entregadores acompanharem receitas, despesas e lucro líquido do trabalho.

**Demonstração:** [fatur-app.vercel.app/comece](https://fatur-app.vercel.app/comece)

## O problema

O faturamento recebido nos aplicativos não representa o valor que sobra para o profissional. Taxas, combustível, manutenção e outras despesas precisam entrar na conta. O FaturApp organiza esses lançamentos e calcula indicadores do dia e do período.

## Funcionalidades

- Registro de receitas e taxas de diferentes aplicativos.
- Registro de quilômetros, horas trabalhadas, abastecimentos e despesas.
- Cálculo de lucro líquido, margem, custo por quilômetro e lucro por hora.
- Consolidação dos lançamentos do dia e consulta de relatórios por período.
- Exportação de relatórios para PDF e planilhas Excel.
- Autenticação, recuperação de senha e área administrativa.

## Destaques técnicos

- Motor financeiro isolado que recalcula os lançamentos do dia quando mudam o consumo ou o preço do combustível.
- Modos de cálculo de consumo por tanque cheio, média de perfil e estimativa inicial.
- Testes de regressão para o motor financeiro, geração de relatórios e controles de segurança.

## Tecnologias

- Next.js 15.5.25 e React 19.2.8
- TypeScript
- Supabase (Auth e banco de dados)
- Tailwind CSS
- ExcelJS e jsPDF para exportação

## Estrutura

- `app/`: páginas e rotas da aplicação Next.js.
- `components/`: componentes de interface.
- `lib/`: autenticação, cálculos financeiros, relatórios e integrações.
- `supabase/`: schema e migrações do banco de dados.
- `scripts/`: testes automatizados.

## Executar localmente

Requisitos: Node.js 22 e uma instância de desenvolvimento do Supabase.

```bash
git clone https://github.com/angeloantunesdarocha/FaturApp.git
cd FaturApp
npm ci
cp .env.example .env.local
```

Preencha as variáveis necessárias em `.env.local` com valores do seu ambiente de desenvolvimento. Nunca publique chaves reais: `SUPABASE_SERVICE_ROLE_KEY`, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` devem permanecer somente no servidor.

Para iniciar:

```bash
npm run dev
```

## Verificações

```bash
npm run test:financial
npm run test:reports
npm run test:security
npm run build
```

Os testes de segurança usam identidades e senhas sintéticas em banco local em memória. Eles não substituem testes de autenticação externa ou homologação dos serviços.

---

Projeto de portfólio de Ângelo Antunes da Rocha, estudante de Sistemas de Informação no IFNMG.
