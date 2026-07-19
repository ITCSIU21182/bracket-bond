"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Implied-probability bar; width springs to the new value. */
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
  const fill =
    status === "won"
      ? "bg-gold"
      : status === "eliminated"
        ? "bg-danger/40"
        : "bg-accent";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-line", className)}>
      <motion.div
        className={cn("h-full rounded-full", fill)}
        initial={false}
        animate={{ width: `${status === "eliminated" ? Math.min(pct, 6) : pct}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}
