import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { messagesQuery } from "@/lib/queries";
import { MetasCard, PatrimonioCard, RelatorioCard } from "@/components/painel/resumo-cards";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({
    meta: [
      { title: "Conversa — Fluxo" },
      {
        name: "description",
        content: "Registre gastos, metas e investimentos conversando em português com o Fluxo.",
      },
      { property: "og:title", content: "Conversa — Fluxo" },
      {
        property: "og:description",
        content: "Registre gastos, metas e investimentos conversando em português com o Fluxo.",
      },
    ],
  }),
  component: ChatPage,
});

const SUGESTOES = [
  "Gastei 45 no iFood hoje",
  "Quanto gastei este mês?",
  "Se eu investir R$ 500 por mês a 0,9% ao mês, quanto terei em 2 anos?",
  "O que é CDI?",
];

function ChatPage() {
  const { data: rows, isLoading } = useQuery(messagesQuery);

  const initialMessages = useMemo<UIMessage[]>(
    () =>
      (rows ?? []).map((r) => ({
        id: r.message_id ?? r.id,
        role: r.role as UIMessage["role"],
        parts: (r.parts ?? []) as UIMessage["parts"],
      })),
    [rows],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <section className="panel flex min-h-[640px] flex-col rounded-3xl lg:col-span-5">
        <div className="border-b border-card/60 px-6 py-4">
          <p className="font-display font-bold">Registrar gasto</p>
          <p className="text-xs text-muted-foreground">Fale como se fala com um amigo</p>
        </div>
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <Shimmer>Carregando sua conversa…</Shimmer>
          </div>
        ) : (
          <ChatWindow initialMessages={initialMessages} />
        )}
      </section>

      <div className="lg:col-span-4">
        <PatrimonioCard />
      </div>

      <div className="space-y-6 lg:col-span-3">
        <MetasCard />
        <RelatorioCard />
      </div>
    </div>
  );
}

function ChatWindow({ initialMessages }: { initialMessages: UIMessage[] }) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status, error } = useChat({
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: async () => {
        const { data } = await supabase.auth.getSession();
        return { Authorization: `Bearer ${data.session?.access_token ?? ""}` };
      },
    }),
    onFinish: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      textareaRef.current?.focus();
    },
    onError: (err) => toast.error(err.message || "Não consegui responder agora."),
  });

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const busy = status === "submitted" || status === "streaming";

  function send(text: string) {
    if (!text.trim() || busy) return;
    sendMessage({ text });
  }

  return (
    <>
      <Conversation className="flex-1">
        <ConversationContent className="gap-4">
          {messages.length === 0 && (
            <div className="space-y-4">
              <Message from="assistant">
                <MessageContent>
                  <MessageResponse>
                    {
                      "Oi! Sou o Fluxo. Me conte um gasto em português mesmo — por exemplo “paguei 45 no mercado” — que eu registro e organizo pra você."
                    }
                  </MessageResponse>
                </MessageContent>
              </Message>
              <div className="flex flex-wrap gap-2 px-2">
                {SUGESTOES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="chip rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, index) => {
                  if (part.type === "text") {
                    return <MessageResponse key={index}>{part.text}</MessageResponse>;
                  }
                  if (part.type.startsWith("tool-")) {
                    const toolPart = part as ToolUIPart;
                    return (
                      <Tool key={index} defaultOpen={false}>
                        <ToolHeader type={toolPart.type} state={toolPart.state} />
                        <ToolContent>
                          <ToolInput input={toolPart.input} />
                          <ToolOutput
                            output={toolPart.output}
                            errorText={toolPart.errorText}
                          />
                        </ToolContent>
                      </Tool>
                    );
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}

          {status === "submitted" && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer>Pensando…</Shimmer>
              </MessageContent>
            </Message>
          )}

          {error && (
            <p className="px-2 text-xs text-destructive">
              Algo deu errado ao falar com o assistente. Tente novamente.
            </p>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="p-4">
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            send(message.text);
            (event.currentTarget as HTMLFormElement).reset();
          }}
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder='Ex: "gastei 30 na feira"'
            disabled={busy}
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} disabled={busy} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
