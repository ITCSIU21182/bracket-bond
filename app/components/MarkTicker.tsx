"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Signature mark display: a large tabular number in ¢ that count-animates to its
 * new value and flashes accent (up) / danger (down) for ~500ms on change.
 */
export function MarkTicker({
  value,
  className,
  showArrow = true,
  size = "md",
}: {
  value: number; // implied probability in [0,1]
  className?: string;
  showArrow?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const [display, setDisplay] = useState(() => Math.round(value * 100));
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const prev = useRef(value);

  useEffect(() => {
    const from = Math.round(prev.current * 100);
    const to = Math.round(value * 100);
    if (from === to) {
      prev.current = value;
      return;
    }
    setFlash(value > prev.current ? "up" : "down");
    const controls = animate(from, to, {
      duration: 0.5,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    const t = setTimeout(() => setFlash(null), 520);
    prev.current = value;
    return () => {
      controls.stop();
      clearTimeout(t);
    };
  }, [value]);

  const sizeCls = size === "lg" ? "text-3xl" : size === "sm" ? "text-sm" : "text-lg";
  const rising = flash === "up";
  const falling = flash === "down";

  return (
    <span
      className={cn(
        "tnum inline-flex items-center gap-1 font-semibold",
        sizeCls,
        rising && "animate-flash-up",
        falling && "animate-flash-down",
        className,
      )}
    >
      {display}¢
      {showArrow && (rising || falling) && (
        <span className={rising ? "text-accent" : "text-danger"}>
          {rising ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
        </span>
      )}
    </span>
  );
}
