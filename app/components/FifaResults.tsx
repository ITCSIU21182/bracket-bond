"use client";

import { Trophy } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FifaMatch, FifaSide, FifaTeam } from "@/lib/fifa";

function dateLabel(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function Score({ side }: { side: FifaSide }) {
  return (
    <span className="flex flex-col items-center">
      <span className={cn("tnum text-2xl leading-none", side.winner ? "font-bold text-text" : "text-muted-2")}>
        {side.score}
      </span>
      {side.winner && <span className="mt-1 h-0.5 w-4 rounded-full bg-accent" />}
    </span>
  );
}

function MatchRow({ m }: { m: FifaMatch }) {
  return (
    <div className="rounded-xl border border-line bg-panel-2/30 px-4 py-4">
      <div className="flex items-center justify-center gap-2.5 sm:gap-4">
        <span className="min-w-0 flex-1 truncate text-right font-semibold">{m.home.name}</span>
        <span className="text-lg" aria-hidden>{m.home.flag}</span>
        <Score side={m.home} />
        <span className="w-9 text-center text-[11px] font-medium uppercase tracking-wide text-muted-2">
          {m.status}
        </span>
        <Score side={m.away} />
        <span className="text-lg" aria-hidden>{m.away.flag}</span>
        <span className="min-w-0 flex-1 truncate font-semibold">{m.away.name}</span>
      </div>
      <div className="mt-2.5 text-center text-xs text-muted">
        {m.round}
        {m.stadium ? ` · ${m.stadium}` : ""}
        {m.status === "PENS" && m.home.pen != null ? ` · pens ${m.home.pen}-${m.away.pen}` : ""}
      </div>
    </div>
  );
}

export function FifaResults({ matches, winner }: { matches: FifaMatch[]; winner: FifaTeam | null }) {
  const map = new Map<string, FifaMatch[]>();
  for (const m of matches) {
    const k = (m.date || "").slice(0, 10);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(m);
  }
  const groups = [...map.keys()].sort().map((k) => ({ key: k, label: dateLabel(k), items: map.get(k)! }));

  return (
    <div className="space-y-6">
      {winner && (
        <div className="flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/[0.06] px-4 py-3 shadow-glow-gold">
          <Trophy className="h-5 w-5 text-gold" />
          <span className="text-sm">
            Champion: <span aria-hidden>{winner.flag}</span>{" "}
            <span className="font-semibold">{winner.name}</span>
          </span>
        </div>
      )}
      {groups.map((g) => (
        <div key={g.key}>
          <div className="mb-2.5 text-sm font-semibold">{g.label}</div>
          <div className="space-y-2">
            {g.items.map((m) => (
              <MatchRow key={m.id} m={m} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
