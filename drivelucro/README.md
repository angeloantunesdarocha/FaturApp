# DriveLucro

Aplicativo web para motoristas de aplicativo calcularem o lucro líquido diário e mensal.

## Nomes Sugeridos para o Aplicativo

1. **DriveLucro** - Combinação de "Drive" (dirigir) e "Lucro", direto e fácil de lembrar
2. **RotaCerteira** - Sugere controle financeiro na rota de trabalho
3. **MotoristaLucrativo** - Foco no resultado final para o motorista

## Funcionalidades

- **Lançamento Diário**: Registro de receitas (com cálculo automático de taxas) e despesas
- **Cálculo Automático**: Lucro líquido do dia e do mês em tempo real
- **Relatórios**: Filtro por período, seleção de categorias de gastos
- **Exportação**: Envio por WhatsApp, E-mail ou download em CSV
- **Design Responsivo**: Funciona bem em dispositivos móveis e desktop

## Tecnologias

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (banco de dados)

## Configuração do Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. No SQL Editor, execute o seguinte script para criar a tabela:

```sql
CREATE TABLE daily_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date DATE UNIQUE NOT NULL,
  gross_amount NUMERIC,
  fee_percent NUMERIC,
  net_fare NUMERIC,
  gas_expense NUMERIC DEFAULT 0,
  alcohol_expense NUMERIC DEFAULT 0,
  maintenance_expense NUMERIC DEFAULT 0,
  extra_expenses JSONB DEFAULT '[]'::jsonb
);

-- Disable RLS for personal use (no authentication)
ALTER TABLE daily_entries DISABLE ROW LEVEL SECURITY;
```

4. Vá para Settings > API e copie:
   - Project URL
   - anon public key

## Instalação e Configuração

1. Clone o repositório e instale as dependências:

```bash
cd drivelucro
npm install
```

2. Crie um arquivo `.env.local` na raiz do projeto com suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Execute o servidor de desenvolvimento:

```bash
npm run dev
```

4. Abra [http://localhost:3000](http://localhost:3000) no seu navegador.

## Deploy na Vercel

1. Instale a Vercel CLI ou use a interface web:

```bash
npm install -g vercel
vercel login
vercel
```

2. Ou conecte seu repositório GitHub à Vercel em [vercel.com](https://vercel.com)

3. Configure as variáveis de ambiente no painel da Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Estrutura do Projeto

```
drivelucro/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── DailyForm.tsx
│   │   └── ReportsPage.tsx
│   └── lib/
│       ├── supabase.ts
│       └── utils.ts
├── .env.local.example
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## Uso

### Lançar Dia

1. Selecione a data (padrão: data atual)
2. Escolha o modo de receita:
   - **Valor com taxa**: Informe o valor bruto e a porcentagem da taxa do app
   - **Valor já líquido**: Informe diretamente o valor recebido após taxas
3. Preencha as despesas do dia (gasolina, álcool, manutenção)
4. Adicione gastos extras se necessário (até 5 itens)
5. O lucro do dia e do mês são calculados automaticamente
6. Clique em "Salvar Lançamento"

### Relatórios

1. Selecione o período desejado (data inicial e final)
2. Marque as categorias de gastos que deseja incluir
3. Visualize a tabela com os registros do período
4. Use os botões de ação:
   - **Enviar por WhatsApp**: Abre o WhatsApp com o resumo formatado
   - **Enviar por E-mail**: Abre o cliente de e-mail com o resumo
   - **Baixar relatório CSV**: Download da planilha com os dados

## Licença

MIT
