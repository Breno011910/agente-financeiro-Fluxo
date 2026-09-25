import { createFileRoute } from "@tanstack/react-router";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import {
  convertToModelMessages,
  streamText,
  stepCountIs,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import { createLovableAiGatewayRunIdFetch } from "@/lib/ai-gateway.server";
import { projectBalance } from "@/lib/format";
import type { Database } from "@/integrations/supabase/types";

const SYSTEM_PROMPT = `Você é o Fluxo, um assistente financeiro brasileiro, educativo e acolhedor.

Regras:
- Fale sempre em português do Brasil, com linguagem simples e acessível. Nada de jargão sem explicar.
- Quando a pessoa contar um gasto ou uma entrada em linguagem natural ("gastei 45 no ifood", "recebi 3000 de salário"), registre com a ferramenta registrar_transacao, escolhendo uma categoria adequada (Alimentação, Transporte, Moradia, Saúde, Lazer, Educação, Assinaturas, Compras, Salário, Investimentos, Outros).
- Use consultar_resumo antes de dar conselhos sobre a situação atual, comparar com o limite mensal ou responder "quanto gastei/tenho".
- Use as ferramentas de metas e patrimônio quando a pessoa pedir para criar, atualizar ou registrar algo.
- Use simular_investimento para cenários do tipo "se eu investir X por mês...". Explique o resultado em uma ou duas frases.
- Dê alertas quando os gastos do mês passarem do limite e comemore quando as metas avançarem (gamificação leve, sem exagero).
- Ensine de leve: explique CDI, IPCA, juros compostos e diversificação quando fizer sentido.
- Respostas curtas: 1 a 3 frases, mais um detalhe só quando for pedido. Valores sempre em reais (R$).
- Nunca invente dados: consulte antes de afirmar números.`;

const CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Lazer",
  "Educação",
  "Assinaturas",
  "Compras",
  "Salário",
  "Investimentos",
  "Outros",
] as const;

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return jsonError("Assistente indisponível: chave de IA ausente.", 500);

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
        if (!token) return jsonError("Você precisa estar logado.", 401);

        const supabaseUrl = process.env["SUPABASE_URL"]!;
        const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
          global: {
            fetch: (input, init) => {
              const headers = new Headers(init?.headers);
              headers.set("apikey", supabaseKey);
              headers.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers });
            },
          },
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (claimsError || !userId) return jsonError("Sessão inválida.", 401);

        const body = (await request.json()) as { messages: UIMessage[] };
        const messages = body.messages ?? [];

        const persist = async (message: UIMessage) => {
          const { error } = await supabase.from("messages").insert({
            user_id: userId,
            message_id: message.id,
            role: message.role,
            parts: message.parts as unknown as Database["public"]["Tables"]["messages"]["Insert"]["parts"],
          });
          if (error) console.error("[chat] falha ao salvar mensagem", error);
        };

        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.role === "user") await persist(lastMessage);

        const runIdFetch = createLovableAiGatewayRunIdFetch();
        const lovable = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });

        const tools = {
          registrar_transacao: tool({
            description: "Registra um gasto ou uma entrada de dinheiro da pessoa.",
            inputSchema: z.object({
              description: z.string().describe("Descrição curta, ex: almoço com a Ana"),
              amount: z.number().describe("Valor positivo em reais"),
              category: z.enum(CATEGORIES),
              kind: z.enum(["gasto", "entrada"]),
            }),
            execute: async ({ description, amount, category, kind }) => {
              const { data, error } = await supabase
                .from("transactions")
                .insert({ user_id: userId, description, amount, category, kind })
                .select()
                .single();
              if (error) return { ok: false, erro: error.message };
              return { ok: true, registro: data };
            },
          }),
          consultar_resumo: tool({
            description:
              "Retorna o resumo financeiro atual: gastos do mês por categoria, entradas, patrimônio, metas e limite mensal.",
            inputSchema: z.object({}),
            execute: async () => {
              const start = new Date();
              start.setDate(1);
              start.setHours(0, 0, 0, 0);
              const [txs, assets, goals, profile] = await Promise.all([
                supabase
                  .from("transactions")
                  .select("amount, category, kind, occurred_at, description")
                  .gte("occurred_at", start.toISOString()),
                supabase.from("assets").select("name, class, amount, monthly_rate"),
                supabase.from("goals").select("title, target_amount, current_amount, deadline"),
                supabase.from("profiles").select("monthly_limit, display_name").maybeSingle(),
              ]);
              const rows = txs.data ?? [];
              const gastos = rows.filter((r) => r.kind === "gasto");
              const porCategoria: Record<string, number> = {};
              for (const g of gastos) {
                porCategoria[g.category] = (porCategoria[g.category] ?? 0) + Number(g.amount);
              }
              return {
                mes_atual: {
                  total_gastos: gastos.reduce((s, g) => s + Number(g.amount), 0),
                  total_entradas: rows
                    .filter((r) => r.kind === "entrada")
                    .reduce((s, g) => s + Number(g.amount), 0),
                  por_categoria: porCategoria,
                },
                limite_mensal: profile.data?.monthly_limit ?? null,
                patrimonio: assets.data ?? [],
                metas: goals.data ?? [],
              };
            },
          }),
          criar_meta: tool({
            description: "Cria uma meta financeira com valor alvo e prazo opcional.",
            inputSchema: z.object({
              title: z.string(),
              target_amount: z.number(),
              current_amount: z.number().nullable(),
              deadline: z.string().nullable().describe("Data no formato AAAA-MM-DD ou nulo"),
            }),
            execute: async ({ title, target_amount, current_amount, deadline }) => {
              const { data, error } = await supabase
                .from("goals")
                .insert({
                  user_id: userId,
                  title,
                  target_amount,
                  current_amount: current_amount ?? 0,
                  deadline: deadline ?? null,
                })
                .select()
                .single();
              if (error) return { ok: false, erro: error.message };
              return { ok: true, meta: data };
            },
          }),
          guardar_na_meta: tool({
            description: "Adiciona um valor ao que já foi guardado em uma meta existente.",
            inputSchema: z.object({
              title: z.string().describe("Título da meta, como a pessoa falou"),
              amount: z.number(),
            }),
            execute: async ({ title, amount }) => {
              const { data: goal } = await supabase
                .from("goals")
                .select("id, title, current_amount, target_amount")
                .ilike("title", `%${title}%`)
                .limit(1)
                .maybeSingle();
              if (!goal) return { ok: false, erro: "Meta não encontrada." };
              const next = Number(goal.current_amount) + amount;
              const { error } = await supabase
                .from("goals")
                .update({ current_amount: next })
                .eq("id", goal.id);
              if (error) return { ok: false, erro: error.message };
              return {
                ok: true,
                meta: goal.title,
                guardado: next,
                alvo: Number(goal.target_amount),
                concluida: next >= Number(goal.target_amount),
              };
            },
          }),
          registrar_ativo: tool({
            description:
              "Adiciona ou atualiza um item do patrimônio (renda fixa, renda variável ou outros).",
            inputSchema: z.object({
              name: z.string(),
              asset_class: z.enum(["renda_fixa", "renda_variavel", "outros"]),
              amount: z.number(),
              monthly_rate: z.number().nullable().describe("Taxa de juros mensal em %, ou nulo"),
            }),
            execute: async ({ name, asset_class, amount, monthly_rate }) => {
              const { data, error } = await supabase
                .from("assets")
                .insert({
                  user_id: userId,
                  name,
                  class: asset_class,
                  amount,
                  monthly_rate: monthly_rate ?? 0,
                })
                .select()
                .single();
              if (error) return { ok: false, erro: error.message };
              return { ok: true, ativo: data };
            },
          }),
          simular_investimento: tool({
            description:
              "Simula juros compostos: valor inicial, aporte mensal, taxa mensal e prazo em meses.",
            inputSchema: z.object({
              initial: z.number(),
              monthly_contribution: z.number(),
              monthly_rate: z.number().describe("Taxa mensal em %, ex: 0.9"),
              months: z.number().int(),
            }),
            execute: async ({ initial, monthly_contribution, monthly_rate, months }) => {
              const capped = Math.min(Math.max(months, 1), 600);
              const { final, invested } = projectBalance(
                initial,
                monthly_contribution,
                monthly_rate,
                capped,
              );
              return {
                meses: capped,
                total_investido: invested,
                valor_final: final,
                juros: final - invested,
              };
            },
          }),
          definir_limite_mensal: tool({
            description: "Define o limite de gastos mensal da pessoa.",
            inputSchema: z.object({ monthly_limit: z.number() }),
            execute: async ({ monthly_limit }) => {
              const { error } = await supabase
                .from("profiles")
                .update({ monthly_limit })
                .eq("id", userId);
              if (error) return { ok: false, erro: error.message };
              return { ok: true, limite: monthly_limit };
            },
          }),
        };

        const result = streamText({
          model: lovable.responses("openai/gpt-6-astra"),
          system: `${SYSTEM_PROMPT}\n\nHoje é ${new Date().toLocaleDateString("pt-BR")}.`,
          messages: await convertToModelMessages(messages),
          tools,
          stopWhen: stepCountIs(50),
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return result.toUIMessageStreamResponse({
          originalMessages: messages,
          onFinish: async ({ responseMessage }) => {
            if (responseMessage) await persist(responseMessage);
          },
        });
      },
    },
  },
});
