"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Dependency-free bar chart. Bars grow from the baseline; hover shows the value. */
export function BarChart({
  data,
  color = "#4785fc",
  height = 140,
  unit = "",
  className,
}: {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  unit?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((d) => d.value)) || 1;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <motion.div
              className="w-full rounded-t-[3px]"
              style={{ background: `linear-gradient(180deg, ${color}, ${color}66)` }}
              initial={reduce ? false : { height: 0 }}
              whileInView={{ height: `${Math.max(4, (d.value / max) * 100)}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.02, ease: "easeOut" }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel px-1.5 py-0.5 text-[10px] tnum opacity-0 transition-opacity group-hover:opacity-100">
              {d.value}
              {unit}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
