import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Fluxo — organize suas finanças conversando" },
      {
        name: "description",
        content:
          "Registre gastos por conversa, acompanhe patrimônio, rendimento e metas em um só lugar. Sem planilhas.",
      },
      { property: "og:title", content: "Fluxo — organize suas finanças conversando" },
      {
        property: "og:description",
        content:
          "Registre gastos por conversa, acompanhe patrimônio, rendimento e metas em um só lugar. Sem planilhas.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/chat", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 top-60 size-[460px] rounded-full bg-aqua/30 blur-3xl" />

      <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <div className="grid size-12 place-items-center rounded-2xl bg-[image:var(--gradient-brand)] font-display text-xl font-bold text-primary-foreground shadow-[var(--shadow-brand)]">
          F
        </div>
        <h1 className="mt-8 font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Suas finanças organizadas <span className="text-gradient-brand">por conversa</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Diga “gastei 45 no mercado” e pronto. O Fluxo classifica seus gastos, acompanha seu
          patrimônio e rendimento e ainda te ensina finanças no caminho.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center justify-center rounded-2xl bg-[image:var(--gradient-brand)] px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-brand)] transition-opacity hover:opacity-90"
        >
          Começar agora
        </Link>

        <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
          {[
            {
              t: "Gastos no chat",
              d: "Escreva em português como você fala. A categoria sai automática.",
            },
            {
              t: "Patrimônio e rendimento",
              d: "Renda fixa, variável e outros, com ganho diário estimado.",
            },
            {
              t: "Metas e simulações",
              d: "Veja o progresso e teste cenários de juros compostos.",
            },
          ].map((f) => (
            <div key={f.t} className="panel rounded-3xl p-6">
              <p className="font-display font-bold">{f.t}</p>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
