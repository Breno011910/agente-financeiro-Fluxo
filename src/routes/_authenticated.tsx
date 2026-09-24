import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/chat", label: "Chat" },
  { to: "/patrimonio", label: "Patrimônio" },
  { to: "/metas", label: "Metas" },
  { to: "/relatorios", label: "Relatórios" },
] as const;

function AuthenticatedLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useQuery({ ...profileQuery, enabled: !!session });

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  const name =
    profile?.display_name || session.user.email?.split("@")[0] || "por aqui";
  const initials = name.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-60 size-[460px] rounded-full bg-aqua/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 size-[420px] rounded-full bg-mint/20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/chat" className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[image:var(--gradient-brand)] text-lg font-bold text-primary-foreground shadow-[var(--shadow-brand)] font-display">
              F
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none tracking-tight">Fluxo</p>
              <p className="mt-1 text-xs text-muted-foreground">Finanças conversacionais</p>
            </div>
          </Link>

          <nav className="chip flex items-center gap-1 rounded-full p-1 text-sm font-medium text-muted-foreground">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-full px-4 py-1.5 transition-colors hover:text-foreground"
                activeProps={{ className: "bg-card/80 text-brand-deep shadow-sm" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
              Olá, {name}
            </span>
            <div className="grid size-10 place-items-center rounded-full bg-[image:var(--gradient-aqua)] text-sm font-bold text-primary-foreground outline outline-card/70">
              {initials}
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sair
            </button>
          </div>
        </header>

        <div className="mt-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
