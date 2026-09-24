import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { assetsQuery, summarize, transactionsQuery } from "@/lib/queries";
import { ASSET_CLASS_LABEL, brl, brlCompact, pct, projectBalance } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/patrimonio")({
  head: () => ({
    meta: [
      { title: "Patrimônio — Fluxo" },
      {
        name: "description",
        content:
          "Veja seu patrimônio dividido em renda fixa, renda variável e outros, com rendimento estimado e simulações.",
      },
      { property: "og:title", content: "Patrimônio — Fluxo" },
      {
        property: "og:description",
        content:
          "Veja seu patrimônio dividido em renda fixa, renda variável e outros, com rendimento estimado e simulações.",
      },
    ],
  }),
  component: PatrimonioPage,
});

function PatrimonioPage() {
  const { data: assets = [] } = useQuery(assetsQuery);
  const { data: txs = [] } = useQuery(transactionsQuery);
  const s = summarize(txs, assets);

  const [initial, setInitial] = useState("0");
  const [monthly, setMonthly] = useState("500");
  const [rate, setRate] = useState("0.9");
  const [months, setMonths] = useState("24");

  const sim = useMemo(
    () =>
      projectBalance(
        Number(initial) || 0,
        Number(monthly) || 0,
        Number(rate) || 0,
        Math.max(1, Math.min(600, Number(months) || 1)),
      ),
    [initial, monthly, rate, months],
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold tracking-tight">Patrimônio</h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que você já contou no chat, somado e organizado.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Total investido</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{brl(s.total)}</p>
        </div>
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            Rendimento estimado no mês
          </p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-mint">
            +{brl(s.monthlyYield)}
          </p>
        </div>
        <div className="panel rounded-3xl p-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Por dia</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums text-mint">
            +{brl(s.dailyYield)}
          </p>
        </div>
      </div>

      <section className="panel rounded-3xl p-6">
        <p className="font-display font-bold">Seus investimentos</p>
        {assets.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nada por aqui ainda. No chat, diga algo como “tenho R$ 5.000 no Tesouro Selic rendendo
            0,9% ao mês”.
          </p>
        ) : (
          <div className="mt-4 divide-y divide-border">
            {assets.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-semibold">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ASSET_CLASS_LABEL[a.class]} · {pct(a.monthly_rate, 2)} ao mês
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{brl(a.amount)}</p>
                  <p className="text-xs text-mint tabular-nums">
                    +{brl((a.amount * a.monthly_rate) / 100)}/mês
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel rounded-3xl p-6">
        <p className="font-display font-bold">Simulador de juros compostos</p>
        <p className="text-sm text-muted-foreground">
          Teste cenários. Você também pode perguntar isso direto no chat.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="ini">Valor inicial (R$)</Label>
            <Input id="ini" value={initial} onChange={(e) => setInitial(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mens">Aporte mensal (R$)</Label>
            <Input id="mens" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tx">Taxa ao mês (%)</Label>
            <Input id="tx" value={rate} onChange={(e) => setRate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mes">Meses</Label>
            <Input id="mes" value={months} onChange={(e) => setMonths(e.target.value)} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-card/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Você terá</p>
            <p className="font-display text-xl font-bold tabular-nums">{brl(sim.final)}</p>
          </div>
          <div className="rounded-2xl bg-card/60 px-4 py-3">
            <p className="text-xs text-muted-foreground">Você terá investido</p>
            <p className="font-display text-xl font-bold tabular-nums">{brl(sim.invested)}</p>
          </div>
          <div className="rounded-2xl bg-mint/15 px-4 py-3">
            <p className="text-xs text-muted-foreground">Juros</p>
            <p className="font-display text-xl font-bold tabular-nums text-mint">
              +{brl(sim.final - sim.invested)}
            </p>
          </div>
        </div>

        <div className="mt-6 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sim.series}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                stroke="var(--muted-foreground)"
              />
              <YAxis
                tickFormatter={(v: number) => brlCompact(v)}
                tickLine={false}
                axisLine={false}
                width={78}
                fontSize={12}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                formatter={(v: number) => brl(v)}
                labelFormatter={(m) => `Mês ${m}`}
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Area
                type="monotone"
                dataKey="balance"
                name="Saldo"
                stroke="var(--brand)"
                strokeWidth={2}
                fill="url(#fill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <p className="mt-4 rounded-2xl bg-card/60 px-4 py-3 text-xs text-muted-foreground">
          Dica: o CDI é a referência da renda fixa no Brasil. Um investimento que rende “100% do
          CDI” acompanha essa taxa. Já o IPCA mede a inflação — se seu dinheiro rende menos que o
          IPCA, o poder de compra diminui.
        </p>
      </section>
    </div>
  );
}
