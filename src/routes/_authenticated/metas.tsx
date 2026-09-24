import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { goalsQuery } from "@/lib/queries";
import { brl, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Fluxo" },
      {
        name: "description",
        content: "Acompanhe visualmente o progresso das suas metas financeiras no Fluxo.",
      },
      { property: "og:title", content: "Metas — Fluxo" },
      {
        property: "og:description",
        content: "Acompanhe visualmente o progresso das suas metas financeiras no Fluxo.",
      },
    ],
  }),
  component: MetasPage,
});

const BADGES = [
  { label: "Primeira meta criada", need: (n: number) => n >= 1 },
  { label: "Três metas ativas", need: (n: number) => n >= 3 },
];

function MetasPage() {
  const { data: goals = [] } = useQuery(goalsQuery);
  const concluidas = goals.filter((g) => g.current_amount >= g.target_amount).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Metas</h1>
        <p className="text-sm text-muted-foreground">
          Crie e alimente suas metas conversando: “guardei 200 na meta da viagem”.
        </p>
      </header>

      {goals.length === 0 ? (
        <div className="panel rounded-3xl p-8 text-center">
          <p className="font-display font-bold">Nenhuma meta ainda</p>
          <p className="mt-2 text-sm text-muted-foreground">
            No chat, diga: “quero juntar R$ 10.000 para uma viagem até dezembro”.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {goals.map((g, i) => {
            const p = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const done = p >= 100;
            return (
              <div key={g.id} className="panel rounded-3xl p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display font-bold">{g.title}</p>
                    {g.deadline && (
                      <p className="text-xs text-muted-foreground">
                        Prazo: {new Date(g.deadline).toLocaleDateString("pt-BR")}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      done
                        ? "rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint"
                        : "rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand-deep"
                    }
                  >
                    {done ? "Concluída" : pct(p, 0)}
                  </span>
                </div>
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      i % 2 === 0
                        ? "h-full rounded-full bg-[image:var(--gradient-brand)]"
                        : "h-full rounded-full bg-[image:var(--gradient-aqua)]"
                    }
                    style={{ width: `${Math.min(p, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-muted-foreground tabular-nums">
                  {brl(g.current_amount)} de {brl(g.target_amount)} · faltam{" "}
                  {brl(Math.max(0, g.target_amount - g.current_amount))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <section className="panel rounded-3xl p-6">
        <p className="font-display font-bold">Suas conquistas</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {BADGES.map((b) => (
            <span
              key={b.label}
              className={
                b.need(goals.length)
                  ? "chip rounded-full px-3 py-1.5 text-xs font-semibold text-brand-deep"
                  : "chip rounded-full px-3 py-1.5 text-xs text-muted-foreground opacity-60"
              }
            >
              {b.label}
            </span>
          ))}
          <span
            className={
              concluidas >= 1
                ? "chip rounded-full px-3 py-1.5 text-xs font-semibold text-mint"
                : "chip rounded-full px-3 py-1.5 text-xs text-muted-foreground opacity-60"
            }
          >
            Primeira meta concluída
          </span>
        </div>
      </section>
    </div>
  );
}
