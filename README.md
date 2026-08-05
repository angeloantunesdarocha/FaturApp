# 🚗 FaturApp

Aplicativo web para motoristas de aplicativo calcularem o **lucro líquido diário e mensal** das corridas, com relatórios exportáveis.

## Tecnologias

- **Next.js 14** (App Router + Server Actions)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL)
- **Vercel** (deploy)

## Funcionalidades

- Lançamento diário com dois modos: *Valor com taxa* ou *Valor já líquido*
- Registro de gastos com Gasolina, Álcool, Manutenção e até 5 Gastos extras (JSON)
- Cálculo automático do lucro do dia e do mês em tempo real
- Relatórios com filtro por período e categorias (checkboxes)
- Envio do resumo por **WhatsApp** e **e-mail**
- Download do relatório em **CSV** (compatível com Excel, com BOM UTF-8)

## Configurando o Supabase

1. Crie um projeto em [https://supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o arquivo `supabase/schema.sql` deste repositório.
   - Isso cria a tabela `daily_entries` e desabilita o RLS (uso pessoal).
3. Copie a **URL** e a **anon/public key** do projeto.

## Rodando localmente

```bash
# 1. Instale dependências
npm install

# 2. Crie o .env copiando o exemplo
cp .env.example .env.local

# 3. Edite .env.local com suas credenciais do Supabase
# NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# 4. Rode em modo dev
npm run dev