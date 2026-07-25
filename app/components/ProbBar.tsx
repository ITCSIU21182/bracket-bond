"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

// Probability color ramp: long-shot (blue) → contender (cyan) → favorite (green).
// The fill color animates with the mark, so the bar "runs" as odds move.
const STOPS: [number, [number, number, number]][] = [
  [0.0, [71, 133, 252]], // #4785fc brand blue
  [0.5, [128, 200, 230]], // #80c8e6 cyan
  [1.0, [55, 214, 122]], // #37d67a accent green
];

function rampColor(v: number): string {
  const t = Math.max(0, Math.min(1, v));
  let a = STOPS[0];
  let b = STOPS[STOPS.length - 1];
  for (let i = 0; i < STOPS.length - 1; i++) {
    if (t >= STOPS[i][0] && t <= STOPS[i + 1][0]) {
      a = STOPS[i];
      b = STOPS[i + 1];
      break;
    }
  }
  const span = b[0] - a[0] || 1;
  const f = (t - a[0]) / span;
  const c = a[1].map((ch, i) => Math.round(ch + (b[1][i] - ch) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** Implied-probability bar; width + color spring to the new value. */
export function ProbBar({
  value,
  status = "alive",
  className,
}: {
  value: number; // [0,1]
  status?: "alive" | "eliminated" | "won";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value * 100));
  const color =
    status === "won" ? "#f5c451" : status === "eliminated" ? "rgba(240,80,80,0.4)" : rampColor(value);
  const width = status === "eliminated" ? Math.min(pct, 6) : pct;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <motion.div
        className="h-full rounded-full"
        initial={false}
        animate={{ width: `${width}%`, backgroundColor: color }}
        transition={{
          width: { type: "spring", stiffness: 120, damping: 20 },
          backgroundColor: { duration: 0.4 },
        }}
      />
    </div>
  );
}
