import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { assetsQuery, profileQuery, summarize, transactionsQuery } from "@/lib/queries";
import { brl, dateBR, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — Fluxo" },
      {
        name: "description",
        content: "Gastos por categoria, entradas e alertas do mês, em linguagem simples.",
      },
      { property: "og:title", content: "Relatórios — Fluxo" },
      {
        property: "og:description",
        content: "Gastos por categoria, entradas e alertas do mês, em linguagem simples.",
      },
    ],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: txs = [] } = useQuery(transactionsQuery);
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: profile } = useQuery(profileQuery);
  const s = summarize(txs, assets);
  const limit = profile?.monthly_limit ?? null;
  const maior = s.byCategory[0]?.[1] ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Seu mês, sem planilha e sem complicação.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Gastos do mês</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{brl(s.spent)}</p>
          {limit !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              Limite de {brl(limit)} · {pct(limit > 0 ? (s.spent / limit) * 100 : 0, 0)} usado
            </p>
          )}
        </div>
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Entradas</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-mint">
            {brl(s.income)}
          </p>
        </div>
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Saldo do mês</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {brl(s.income - s.spent)}
          </p>
        </div>
      </div>

      <section className="panel rounded-3xl p-6">
        <p className="font-display font-bold">Para onde foi o dinheiro</p>
        {s.byCategory.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Ainda não há gastos neste mês. Registre o primeiro no chat.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {s.byCategory.map(([cat, value]) => (
              <div key={cat}>
                <div className="flex items-center justify-between text-sm">
                  <span>{cat}</span>
                  <span className="font-semibold tabular-nums">{brl(value)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-[image:var(--gradient-brand)]"
                    style={{ width: `${maior > 0 ? (value / maior) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel rounded-3xl p-6">
        <p className="font-display font-bold">Últimos lançamentos</p>
        {txs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum lançamento por enquanto.</p>
        ) : (
          <div className="mt-3 divide-y divide-border">
            {txs.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.category} · {dateBR(t.occurred_at)}
                  </p>
                </div>
                <p
                  className={
                    t.kind === "entrada"
                      ? "text-sm font-semibold tabular-nums text-mint"
                      : "text-sm font-semibold tabular-nums"
                  }
                >
                  {t.kind === "entrada" ? "+" : "-"}
                  {brl(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
