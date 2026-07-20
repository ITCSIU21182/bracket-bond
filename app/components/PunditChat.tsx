"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { localAnswer } from "@/lib/punditFallback";

const SUGGESTIONS = [
  "How does Bracket Bond settle a match?",
  "What happens on a penalty shootout?",
  "Why is settlement permissionless?",
  "What is TxLINE?",
];

/** Floating AI-pundit: grounded on TxLINE / settlement / the live market via the
 *  server route's read-only tools. Never invents numbers. */
export function PunditChat() {
  const [open, setOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading, append, error, setMessages } = useChat({
    api: "/api/pundit",
    initialMessages: [
      {
        id: "seed",
        role: "assistant",
        content:
          "Hi - I'm the Bracket Bond pundit. Ask me about the markets, TxLINE data, or how proof-settlement works. I only speak from what I can verify.",
      },
    ],
  });

  // If the LLM route is unavailable (e.g. no OPENAI_API_KEY on the server), answer
  // from the curated offline pundit so the widget still responds.
  const answered = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!error) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser || answered.current.has(lastUser.id)) return;
    answered.current.add(lastUser.id);
    setMessages((prev) => [
      ...prev,
      { id: `fallback-${lastUser.id}`, role: "assistant", content: localAnswer(lastUser.content) },
    ]);
  }, [error, messages, setMessages]);

  return (
    <>
      <div className="group fixed bottom-5 right-5 z-40 flex items-center gap-3">
        {!open && (
          <span className="pointer-events-none hidden select-none rounded-full border border-line bg-panel/90 px-3.5 py-2 text-sm font-medium text-text opacity-0 shadow-card backdrop-blur transition-all duration-300 group-hover:opacity-100 sm:block sm:translate-x-2 sm:group-hover:translate-x-0">
            Ask the pundit
          </span>
        )}
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative grid h-14 w-14 place-items-center rounded-full transition-transform hover:scale-105"
          aria-label="Open the AI pundit"
        >
          <span
            aria-hidden
            className="absolute -inset-[3px] animate-spin-slow rounded-full opacity-80 blur-[6px]"
            style={{ background: "conic-gradient(from 0deg, #37d67a, #0054fa, #80c8e6, #37d67a)" }}
          />
          <span className="relative grid h-14 w-14 place-items-center rounded-full bg-accent text-[#04110a] shadow-glow">
            {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed bottom-24 right-5 z-40 flex h-[560px] max-h-[80vh] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-card"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent/15 text-accent">
                <MessageSquare className="h-4 w-4" />
              </span>
              <div>
                <div className="text-sm font-semibold">Bracket Bond Pundit</div>
                <div className="text-[11px] text-muted">grounded on TxLINE · never invents numbers</div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm",
                      m.role === "user"
                        ? "bg-accent/15 text-text"
                        : "border border-line bg-panel-2/50 text-text",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-line bg-panel-2/50 px-3.5 py-2 text-sm text-muted">
                    thinking…
                  </div>
                </div>
              )}
              {messages.length <= 1 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => append({ role: "user", content: s })}
                      className="rounded-full border border-line bg-panel-2/50 px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent/50 hover:text-text"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-line p-3">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Ask the pundit…"
                className="h-10 flex-1 rounded-xl border border-line bg-panel-2 px-3.5 text-sm outline-none focus:border-accent/60"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-[#04110a] disabled:opacity-40"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
