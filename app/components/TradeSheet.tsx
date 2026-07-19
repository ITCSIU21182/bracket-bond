"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/Button";
import { cn } from "@/lib/cn";
import { sol } from "@/lib/format";
import type { TeamOutcome } from "@/lib/types";

export type TradeMode = "buy" | "exit";
type Status = "idle" | "submitting" | "success" | "error";

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 70,
    spread: 68,
    origin: { y: 0.7 },
    colors: ["#37d67a", "#f5c451", "#e6e9ef"],
    disableForReducedMotion: true,
  });
}

export function TradeSheet({
  open,
  mode,
  outcome,
  feeBps,
  connected,
  positionShares = 0,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: TradeMode;
  outcome: TeamOutcome | null;
  feeBps: number;
  connected: boolean;
  positionShares?: number;
  onClose: () => void;
  /** Perform the trade; resolve on success. `amount` is in SOL (buy) or shares (exit). */
  onConfirm: (amount: number) => Promise<string | void>;
}) {
  const [amount, setAmount] = useState("0.50");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setAmount(mode === "buy" ? "0.50" : String(positionShares.toFixed(3)));
    }
  }, [open, mode, positionShares]);

  if (!outcome) return null;
  const amt = Number(amount) || 0;
  const mark = outcome.mark || 0.01;

  // Buy: shares = amount / mark, fee on notional. Exit: payout = shares * mark.
  const shares = mode === "buy" ? amt / mark : amt;
  const fee = mode === "buy" ? amt * (feeBps / 10_000) : 0;
  const payout = mode === "exit" ? amt * mark : 0;

  const submit = async () => {
    if (status === "submitting") return;
    setStatus("submitting");
    try {
      await onConfirm(amt);
      setStatus("success");
      await fireConfetti();
      toast.success(
        mode === "buy" ? `Bought ${outcome.team}` : `Exited ${outcome.team}`,
        { description: mode === "buy" ? `${shares.toFixed(3)} shares @ ${mark.toFixed(2)}` : `+${sol(payout)}` },
      );
      setTimeout(onClose, 850);
    } catch (e) {
      setStatus("error");
      toast.error("Transaction failed", { description: String((e as Error)?.message ?? e).slice(0, 120) });
    }
  };

  const title = mode === "buy" ? "Buy" : "Exit";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-md rounded-t-2xl border border-line bg-panel p-6 shadow-card sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-lg font-semibold">
                <span aria-hidden>{outcome.flag}</span>
                {title} · {outcome.team}
              </div>
              <button onClick={onClose} className="text-muted hover:text-text" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5">
              <label className="text-xs uppercase tracking-wide text-muted">
                {mode === "buy" ? "Amount (◎)" : "Shares to sell"}
              </label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  inputMode="decimal"
                  className="tnum h-12 w-full rounded-xl border border-line bg-panel-2 px-4 text-lg font-semibold outline-none focus:border-accent/60"
                />
                <button
                  onClick={() =>
                    setAmount(
                      mode === "buy" ? (amt / 2 || 0.25).toFixed(2) : (positionShares / 2).toFixed(3),
                    )
                  }
                  className="h-12 rounded-xl border border-line bg-panel-2 px-3 text-sm text-muted hover:text-text"
                >
                  ½
                </button>
                <button
                  onClick={() => setAmount(mode === "buy" ? "1.00" : positionShares.toFixed(3))}
                  className="h-12 rounded-xl border border-line bg-panel-2 px-3 text-sm text-muted hover:text-text"
                >
                  max
                </button>
              </div>
            </div>

            <div className="mt-5 space-y-2.5 rounded-xl border border-line bg-panel-2/40 p-4 text-sm">
              <Line label="Price (mark)" value={mark.toFixed(2)} />
              {mode === "buy" ? (
                <>
                  <Line label="You get" value={`${shares.toFixed(3)} shares`} />
                  <Line label={`Fee (${(feeBps / 100).toFixed(0)}%)`} value={sol(fee, 3)} />
                </>
              ) : (
                <>
                  <Line label="You receive" value={sol(payout, 3)} accent />
                  <p className="pt-1 text-xs text-muted">Payout is clamped to the pool - a late exit may receive less than mark.</p>
                </>
              )}
            </div>

            <Button
              onClick={submit}
              variant="success"
              disabled={!connected || status === "submitting" || status === "success" || amt <= 0}
              className={cn("relative mt-5 w-full overflow-hidden", status === "success" && "bg-accent")}
              size="lg"
            >
              {status === "submitting" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : status === "success" ? (
                <motion.span
                  className="flex items-center gap-2"
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                >
                  <Check className="h-5 w-5" /> Confirmed
                </motion.span>
              ) : !connected ? (
                "Connect a wallet"
              ) : (
                `Confirm ${title.toLowerCase()}`
              )}
              {status === "success" && (
                <motion.span
                  className="absolute inset-0 rounded-xl bg-accent/40"
                  initial={{ scale: 0, opacity: 0.6 }}
                  animate={{ scale: 2.4, opacity: 0 }}
                  transition={{ duration: 0.7 }}
                />
              )}
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Line({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className={cn("tnum font-medium", accent && "text-accent")}>{value}</span>
    </div>
  );
}
