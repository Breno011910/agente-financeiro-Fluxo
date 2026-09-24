import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { assetsQuery, goalsQuery, profileQuery, summarize, transactionsQuery } from "@/lib/queries";
import { brl, brlCompact, pct } from "@/lib/format";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-muted-foreground">{children}</p>;
}

export function PatrimonioCard() {
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: txs = [] } = useQuery(transactionsQuery);
  const s = summarize(txs, assets);
  const share = (v: number) => (s.total > 0 ? (v / s.total) * 100 : 0);

  return (
    <section className="panel rounded-3xl">
      <div className="flex items-start justify-between px-6 pt-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Patrimônio
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight tabular-nums">
            {brlCompact(s.total)}
          </p>
        </div>
        <span className="rounded-full bg-mint/15 px-2.5 py-1 text-xs font-semibold text-mint">
          +{brl(s.dailyYield)}/dia
        </span>
      </div>

      {assets.length === 0 ? (
        <div className="px-6 pb-6">
          <Empty>
            Nenhum investimento registrado ainda. Conte no chat: “tenho R$ 5.000 no Tesouro Selic a
            0,9% ao mês”.
          </Empty>
        </div>
      ) : (
        <div className="px-6 pb-6 pt-3">
          <div className="flex h-6 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-brand" style={{ width: `${share(s.byClass.renda_fixa)}%` }} />
            <div
              className="h-full bg-aqua"
              style={{ width: `${share(s.byClass.renda_variavel)}%` }}
            />
            <div className="h-full bg-mint" style={{ width: `${share(s.byClass.outros)}%` }} />
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {(
              [
                ["Renda fixa", s.byClass.renda_fixa, "bg-brand"],
                ["Renda variável", s.byClass.renda_variavel, "bg-aqua"],
                ["Outros", s.byClass.outros, "bg-mint"],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${color}`} /> {label}
                </span>
                <span className="font-semibold tabular-nums">{brlCompact(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-card/60 px-4 py-3 text-sm">
            <span className="text-muted-foreground">Rendimento no mês</span>
            <span className="font-semibold tabular-nums text-mint">+{brl(s.monthlyYield)}</span>
          </div>
          <Link
            to="/patrimonio"
            className="mt-3 inline-block text-xs font-medium text-brand-deep hover:underline"
          >
            Ver detalhes do patrimônio
          </Link>
        </div>
      )}
    </section>
  );
}

export function MetasCard() {
  const { data: goals = [] } = useQuery(goalsQuery);

  return (
    <section className="panel rounded-3xl p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Metas</p>
      {goals.length === 0 ? (
        <Empty>Peça no chat: “quero juntar R$ 10.000 para uma viagem até dezembro”.</Empty>
      ) : (
        <div className="mt-4 space-y-5">
          {goals.slice(0, 3).map((g, i) => {
            const p = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{g.title}</span>
                  <span className="text-muted-foreground tabular-nums">{pct(p, 0)}</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={
                      i % 2 === 0
                        ? "h-full rounded-full bg-[image:var(--gradient-brand)]"
                        : "h-full rounded-full bg-[image:var(--gradient-aqua)]"
                    }
                    style={{ width: `${Math.min(p, 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                  {brlCompact(g.current_amount)} de {brlCompact(g.target_amount)}
                </p>
              </div>
            );
          })}
          <Link to="/metas" className="block text-xs font-medium text-brand-deep hover:underline">
            Ver todas as metas
          </Link>
        </div>
      )}
    </section>
  );
}

export function RelatorioCard() {
  const { data: txs = [] } = useQuery(transactionsQuery);
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: profile } = useQuery(profileQuery);
  const s = summarize(txs, assets);
  const limit = profile?.monthly_limit ?? null;
  const overLimit = limit !== null && s.spent > limit;

  return (
    <section className="panel rounded-3xl p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        Resumo do mês
      </p>
      <div className="mt-4 flex items-center justify-between rounded-2xl bg-card/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Gastos</span>
        <span className="text-sm font-semibold tabular-nums">{brl(s.spent)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-2xl bg-card/60 px-4 py-3">
        <span className="text-sm text-muted-foreground">Entradas</span>
        <span className="text-sm font-semibold tabular-nums text-mint">{brl(s.income)}</span>
      </div>

      <div
        className={
          overLimit
            ? "mt-4 rounded-2xl bg-coral/15 px-4 py-3"
            : "mt-4 rounded-2xl bg-[image:linear-gradient(135deg,color-mix(in_oklab,var(--brand)_12%,transparent),color-mix(in_oklab,var(--aqua)_12%,transparent))] px-4 py-3"
        }
      >
        <p className="text-sm font-semibold">
          {limit === null
            ? "Defina um limite mensal"
            : overLimit
              ? "Atenção: limite estourado"
              : "Dentro do limite"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {limit === null
            ? "Diga no chat: “meu limite é R$ 3.000 por mês”."
            : `${brl(s.spent)} de ${brl(limit)} usados neste mês.`}
        </p>
      </div>

      <Link
        to="/relatorios"
        className="mt-3 inline-block text-xs font-medium text-brand-deep hover:underline"
      >
        Ver relatórios completos
      </Link>
    </section>
  );
}
