"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Infinite horizontal "runner" band (borrowed from wc26aww's footer runner). */
export function Marquee({
  children,
  speed = 30,
  reverse = false,
  className,
}: {
  children: ReactNode;
  speed?: number; // seconds per loop
  reverse?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const items = [0, 1];
  return (
    <div className={cn("relative flex overflow-hidden", className)}>
      {items.map((i) => (
        <motion.div
          key={i}
          className="flex shrink-0 items-center gap-8 whitespace-nowrap pr-8"
          animate={reduce ? undefined : { x: reverse ? ["-100%", "0%"] : ["0%", "-100%"] }}
          transition={{ duration: speed, ease: "linear", repeat: Infinity }}
          aria-hidden={i === 1}
        >
          {children}
        </motion.div>
      ))}
    </div>
  );
}
