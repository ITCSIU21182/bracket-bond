"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { Connection } from "@solana/web3.js";
import { solscanTx, truncate } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { SettlementEvent } from "@/lib/types";

/** The emotional peak: a drawn-in check, the match, the proven predicate, the
 *  Merkle root, and the on-chain tx - "settled by proof, no human oracle". */
export function ProofReceipt({
  event,
  onClose,
}: {
  event: SettlementEvent | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {event && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-accent/30 bg-panel p-7 shadow-glow"
            initial={{ scale: 0.94, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-muted transition-colors hover:text-text"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <motion.div
              className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-accent/10"
              animate={{ boxShadow: ["0 0 0 0 rgba(55,214,122,0)", "0 0 44px 8px rgba(55,214,122,0.45)", "0 0 0 0 rgba(55,214,122,0)"] }}
              transition={{ duration: 1.3, times: [0, 0.4, 1] }}
            >
              <svg viewBox="0 0 52 52" className="h-11 w-11">
                <motion.path
                  d="M14 27 L23 36 L38 18"
                  fill="none"
                  stroke="#37d67a"
                  strokeWidth={4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
                />
              </svg>
            </motion.div>

            <h2 className="mt-5 text-center text-lg font-semibold">Settled by proof</h2>
            {event.real && (
              <p className="mt-1 text-center text-xs font-medium text-accent">
                verified live on devnet
              </p>
            )}

            <div className="mt-5 space-y-3 text-sm">
              <Row label="Match">
                <span className="tnum">{event.fixture}</span>
              </Row>
              <Row label="Round">{event.round}</Row>
              <Row label="Eliminated">
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden>{event.flag}</span>
                  {event.team}
                </span>
              </Row>
              <Row label="Predicate">
                <span className="tnum text-right text-[13px] text-muted">{event.predicate}</span>
              </Row>
              {event.wentToPenalties && (
                <Row label="Path">
                  <span className="text-gold">penalty shootout (keys 6001/6002)</span>
                </Row>
              )}
              <Row label="Merkle root">
                <span className="tnum text-[13px] text-muted">{truncate(event.merkleRoot, 10, 6)}</span>
              </Row>
              <Row label="Transaction">
                <a
                  href={solscanTx(event.txSig)}
                  target="_blank"
                  rel="noreferrer"
                  className="tnum inline-flex items-center gap-1 text-accent hover:underline"
                >
                  {truncate(event.txSig, 8, 6)}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Row>
            </div>

            {event.real && <VerifyButton sig={event.txSig} />}

            <p className="mt-6 border-t border-line pt-4 text-center text-xs text-muted">
              no human oracle · no dispute window
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type VState = "idle" | "verifying" | "verified" | "failed";

/** Re-verify the settlement tx against devnet RPC, live. Four visual states. */
function VerifyButton({ sig }: { sig: string }) {
  const [state, setState] = useState<VState>("idle");

  useEffect(() => setState("idle"), [sig]);

  const verify = async () => {
    if (state === "verifying" || state === "verified") return;
    setState("verifying");
    try {
      const rpc = process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";
      const conn = new Connection(rpc, "confirmed");
      const res = await conn.getSignatureStatuses([sig], { searchTransactionHistory: true });
      const info = res.value[0];
      const ok =
        !!info && !info.err && (info.confirmationStatus === "confirmed" || info.confirmationStatus === "finalized");
      setState(ok ? "verified" : "failed");
    } catch {
      setState("failed");
    }
  };

  const view = {
    idle: {
      icon: <ShieldCheck className="h-4 w-4" />,
      label: "Verify on-chain",
      cls: "border-accent/40 bg-accent/10 text-accent hover:border-accent/70",
    },
    verifying: {
      icon: <Loader2 className="h-4 w-4 animate-spin" />,
      label: "Verifying on devnet…",
      cls: "border-line bg-panel-2 text-muted",
    },
    verified: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: "Verified on-chain",
      cls: "border-accent/60 bg-accent/15 text-accent",
    },
    failed: {
      icon: <AlertCircle className="h-4 w-4" />,
      label: "Couldn't confirm - retry or open Solscan",
      cls: "border-gold/50 bg-gold/10 text-gold hover:border-gold/70",
    },
  }[state];

  return (
    <button
      onClick={verify}
      disabled={state === "verifying" || state === "verified"}
      className={cn(
        "mt-5 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-medium transition-all enabled:active:scale-[0.98] disabled:cursor-default",
        view.cls,
      )}
    >
      {view.icon}
      {view.label}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}
