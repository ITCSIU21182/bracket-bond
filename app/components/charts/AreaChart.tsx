"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/** Lightweight dependency-free area/line chart (SVG). Values are plotted evenly
 *  on x; y auto-scales to the data. A pulsing dot marks the latest point. */
export function AreaChart({
  points,
  color = "#37d67a",
  height = 180,
  className,
}: {
  points: number[];
  color?: string;
  height?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const W = 600;
  const H = 200;
  const pad = 6;
  const n = points.length;
  if (n < 2) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const xAt = (i: number) => pad + (i / (n - 1)) * (W - 2 * pad);
  const yAt = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);

  const line = points.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
  const area = `${line} L${xAt(n - 1).toFixed(1)},${H} L${xAt(0).toFixed(1)},${H} Z`;

  // Last-point position as % of the box (HTML overlay → no SVG scale distortion).
  const lastLeft = (xAt(n - 1) / W) * 100;
  const lastTop = (yAt(points[n - 1]) / H) * 100;
  const gid = `ac-${color.replace("#", "")}`;

  return (
    <div className={cn("relative w-full", className)} style={{ height }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#1a3570" strokeWidth="1" strokeOpacity="0.5" vectorEffect="non-scaling-stroke" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <motion.path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <span
        className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ left: `${lastLeft}%`, top: `${lastTop}%`, background: color, boxShadow: `0 0 0 4px ${color}33` }}
      />
    </div>
  );
}
