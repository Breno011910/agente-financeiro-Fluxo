Fluxo

Assistente financeiro pessoal em português. Você conversa com o Fluxo ("gastei 45 no iFood", "recebi 3000 de salário") e ele registra, consulta e simula tudo por você.

Demo: https://look-alike-capturer.lovable.app

Funcionalidades
Chat com agente de IA que registra gastos e entradas em linguagem natural
Metas financeiras com acompanhamento de progresso
Patrimônio com simulação de juros compostos
Relatórios do mês por categoria
Login com dados isolados por usuário
Tecnologias
TanStack Start (React)
Supabase (banco, auth e RLS)
Vercel AI SDK
Tailwind CSS e shadcn/ui
Como rodar
sh
git clone https://github.com/Breno011910/agente-financeiro-Fluxo.git
cd agente-financeiro-Fluxo
bun install
bun run dev

Crie um .env com as chaves do seu projeto Supabase:

env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
LOVABLE_API_KEY=

Aplique as migrations da pasta supabase/migrations/ no seu projeto
