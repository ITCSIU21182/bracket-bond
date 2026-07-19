"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

function parts(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

/** Countdown to a target ISO date (e.g. the World Cup final). Client-only clock. */
export function Countdown({ target, className }: { target: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const targetMs = new Date(target).getTime();
  const p = now === null ? { d: 0, h: 0, m: 0, s: 0 } : parts(targetMs - now);

  const Cell = ({ v, label }: { v: number; label: string }) => (
    <div className="flex flex-col items-center">
      <span className="tnum text-2xl font-bold sm:text-3xl">{String(v).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-widest text-muted">{label}</span>
    </div>
  );

  return (
    <div className={cn("flex items-center gap-4 sm:gap-6", className)}>
      <Cell v={p.d} label="days" />
      <span className="text-2xl text-muted">:</span>
      <Cell v={p.h} label="hrs" />
      <span className="text-2xl text-muted">:</span>
      <Cell v={p.m} label="min" />
      <span className="text-2xl text-muted">:</span>
      <Cell v={p.s} label="sec" />
    </div>
  );
}
