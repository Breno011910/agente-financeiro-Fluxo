export const brl = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number.isFinite(value) ? value : 0,
  );

export const brlCompact = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const pct = (value: number, digits = 1) =>
  `${value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

export const dateBR = (value: string | Date) =>
  new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const ASSET_CLASS_LABEL: Record<string, string> = {
  renda_fixa: "Renda fixa",
  renda_variavel: "Renda variável",
  outros: "Outros",
};

/** Juros compostos com aportes mensais. */
export function projectBalance(
  initial: number,
  monthlyContribution: number,
  monthlyRatePct: number,
  months: number,
) {
  const r = monthlyRatePct / 100;
  let balance = initial;
  const series: { month: number; balance: number; invested: number }[] = [];
  let invested = initial;
  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + r) + monthlyContribution;
    invested += monthlyContribution;
    series.push({ month: m, balance, invested });
  }
  return { final: balance, invested, series };
}

/** Rendimento diário equivalente a uma taxa mensal. */
export function dailyYield(amount: number, monthlyRatePct: number) {
  const daily = Math.pow(1 + monthlyRatePct / 100, 1 / 30) - 1;
  return amount * daily;
}
