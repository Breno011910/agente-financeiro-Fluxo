import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Tx = {
  id: string;
  description: string;
  amount: number;
  category: string;
  kind: "gasto" | "entrada";
  occurred_at: string;
};

export type Asset = {
  id: string;
  name: string;
  class: "renda_fixa" | "renda_variavel" | "outros";
  amount: number;
  monthly_rate: number;
};

export type Goal = {
  id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
};

export type Profile = {
  id: string;
  display_name: string | null;
  monthly_limit: number | null;
};

const num = (v: unknown) => Number(v ?? 0);

export const transactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: async (): Promise<Tx[]> => {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, description, amount, category, kind, occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((t) => ({ ...t, amount: num(t.amount) })) as Tx[];
  },
});

export const assetsQuery = queryOptions({
  queryKey: ["assets"],
  queryFn: async (): Promise<Asset[]> => {
    const { data, error } = await supabase
      .from("assets")
      .select("id, name, class, amount, monthly_rate")
      .order("amount", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((a) => ({
      ...a,
      amount: num(a.amount),
      monthly_rate: num(a.monthly_rate),
    })) as Asset[];
  },
});

export const goalsQuery = queryOptions({
  queryKey: ["goals"],
  queryFn: async (): Promise<Goal[]> => {
    const { data, error } = await supabase
      .from("goals")
      .select("id, title, target_amount, current_amount, deadline")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((g) => ({
      ...g,
      target_amount: num(g.target_amount),
      current_amount: num(g.current_amount),
    })) as Goal[];
  },
});

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async (): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, monthly_limit")
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      monthly_limit: data.monthly_limit === null ? null : num(data.monthly_limit),
    } as Profile;
  },
});

export const messagesQuery = queryOptions({
  queryKey: ["messages"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("id, message_id, role, parts, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
});

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  return { start, end };
}

export function summarize(txs: Tx[], assets: Asset[]) {
  const { start } = monthRange();
  const monthTxs = txs.filter((t) => new Date(t.occurred_at) >= start);
  const spent = monthTxs.filter((t) => t.kind === "gasto").reduce((s, t) => s + t.amount, 0);
  const income = monthTxs.filter((t) => t.kind === "entrada").reduce((s, t) => s + t.amount, 0);
  const byCategory = new Map<string, number>();
  for (const t of monthTxs.filter((x) => x.kind === "gasto")) {
    byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
  }
  const total = assets.reduce((s, a) => s + a.amount, 0);
  const byClass = {
    renda_fixa: assets.filter((a) => a.class === "renda_fixa").reduce((s, a) => s + a.amount, 0),
    renda_variavel: assets
      .filter((a) => a.class === "renda_variavel")
      .reduce((s, a) => s + a.amount, 0),
    outros: assets.filter((a) => a.class === "outros").reduce((s, a) => s + a.amount, 0),
  };
  const monthlyYield = assets.reduce((s, a) => s + (a.amount * a.monthly_rate) / 100, 0);
  return {
    spent,
    income,
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
    total,
    byClass,
    monthlyYield,
    dailyYield: assets.reduce(
      (s, a) => s + a.amount * (Math.pow(1 + a.monthly_rate / 100, 1 / 30) - 1),
      0,
    ),
  };
}
