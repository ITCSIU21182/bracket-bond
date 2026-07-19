"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
import { MarkTicker } from "./MarkTicker";
import { ProbBar } from "./ProbBar";
import { StatusPill } from "./StatusPill";
import { Button } from "./ui/Button";
import { cn } from "@/lib/cn";
import type { TeamOutcome } from "@/lib/types";

export function OutcomeRow({
  outcome,
  resolved,
  connected,
  onBuy,
  onExit,
  onRedeem,
}: {
  outcome: TeamOutcome;
  resolved: boolean;
  connected: boolean;
  onBuy: (o: TeamOutcome) => void;
  onExit: (o: TeamOutcome) => void;
  onRedeem: (o: TeamOutcome) => void;
}) {
  const eliminated = outcome.status === "eliminated";
  const won = outcome.status === "won";

  return (
    <motion.div
      layout
      className={cn(
        "flex items-center gap-4 rounded-xl border px-4 py-3.5 transition-colors",
        won
          ? "border-gold/40 bg-gold/[0.04] shadow-glow-gold"
          : eliminated
            ? "border-line/60 bg-panel-2/30 opacity-55"
            : "border-line bg-panel-2/40 hover:border-line",
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {outcome.flag}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("truncate font-semibold", eliminated && "line-through")}>
              {outcome.team}
            </span>
            {won && <Trophy className="h-4 w-4 shrink-0 text-gold" />}
            <StatusPill status={outcome.status} />
          </div>
          <ProbBar value={outcome.mark} status={outcome.status} className="mt-2 max-w-[240px]" />
        </div>
      </div>

      <div className="flex w-24 flex-col items-end">
        <MarkTicker value={outcome.mark} size="lg" className={cn(eliminated && "text-muted")} />
        {!eliminated && outcome.mark > 0 && (
          <span className="tnum text-[11px] text-muted-2">{(1 / outcome.mark).toFixed(2)}x odds</span>
        )}
      </div>

      <div className="flex w-[150px] justify-end gap-2">
        {resolved ? (
          won ? (
            <Button size="sm" variant="success" onClick={() => onRedeem(outcome)} disabled={!connected}>
              Redeem
            </Button>
          ) : (
            <span className="text-xs text-muted">-</span>
          )
        ) : eliminated ? (
          <span className="text-xs text-muted">out</span>
        ) : (
          <>
            <Button size="sm" variant="success" onClick={() => onBuy(outcome)}>
              Buy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onExit(outcome)}>
              Exit
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}
