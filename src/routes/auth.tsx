import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Fluxo" },
      {
        name: "description",
        content: "Acesse sua conta do Fluxo para conversar sobre seus gastos, metas e patrimônio.",
      },
      { property: "og:title", content: "Entrar — Fluxo" },
      {
        property: "og:description",
        content: "Acesse sua conta do Fluxo para conversar sobre seus gastos, metas e patrimônio.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/chat", replace: true });
  }, [loading, session, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { display_name: name },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setConfirmSent(true);
          toast.success("Confira seu e-mail para confirmar a conta.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/chat", replace: true });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-brand/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-[460px] rounded-full bg-aqua/30 blur-3xl" />

      <div className="panel relative w-full max-w-md rounded-3xl p-8">
        <div className="grid size-10 place-items-center rounded-xl bg-[image:var(--gradient-brand)] font-display text-lg font-bold text-primary-foreground shadow-[var(--shadow-brand)]">
          F
        </div>
        <h1 className="mt-6 font-display text-2xl font-bold tracking-tight">
          {mode === "entrar" ? "Entrar no Fluxo" : "Criar sua conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Suas finanças organizadas por conversa.
        </p>

        {confirmSent ? (
          <div className="mt-6 rounded-2xl bg-card/60 p-4 text-sm">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar,
            volte aqui e entre normalmente.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "criar" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Como quer ser chamado</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Marina"
                  required
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@email.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full rounded-xl" disabled={busy}>
              {busy ? "Aguarde…" : mode === "entrar" ? "Entrar" : "Criar conta"}
            </Button>
          </form>
        )}

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full rounded-xl"
          onClick={handleGoogle}
        >
          Continuar com o Google
        </Button>

        <button
          type="button"
          className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setConfirmSent(false);
            setMode(mode === "entrar" ? "criar" : "entrar");
          }}
        >
          {mode === "entrar" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
