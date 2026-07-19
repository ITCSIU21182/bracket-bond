import { cn } from "@/lib/cn";

/** APECHAIN-style ambient swirl: a slow-rotating conic-gradient orb, heavily
 *  blurred - a "living" background element (our own asset, not a video). */
export function Swirl({
  className,
  colors = "#0054fa, #37d67a, #80c8e6, #0054fa",
  opacity = 0.5,
}: {
  className?: string;
  colors?: string;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute animate-spin-slow rounded-full blur-3xl", className)}
      style={{
        background: `conic-gradient(from 0deg, ${colors})`,
        opacity,
      }}
    />
  );
}
