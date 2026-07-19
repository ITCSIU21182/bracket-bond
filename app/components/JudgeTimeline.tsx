import { CheckCircle2, Database, FileCheck2, GitBranch, ExternalLink } from "lucide-react";
import { solscanTx, truncate } from "@/lib/format";
import type { SettlementEvent } from "@/lib/types";

/** Verified-replay timeline for a settled round: source proof → on-chain CPI →
 *  elimination → bracket advance, each with its data receipt. */
export function JudgeTimeline({ event }: { event: SettlementEvent }) {
  const steps = [
    {
      icon: Database,
      title: "TxLINE proof received",
      body: (
        <>
          fixture <span className="tnum text-text">{event.fixtureId}</span> · Merkle root{" "}
          <span className="tnum text-text">{truncate(event.merkleRoot, 10, 6)}</span>
        </>
      ),
    },
    {
      icon: FileCheck2,
      title: "validateStatV2 verified on-chain",
      body: (
        <>
          predicate <span className="tnum text-text">{event.predicate}</span>
          {event.wentToPenalties && (
            <span className="text-gold"> · shootout path (PE keys 6001/6002)</span>
          )}
        </>
      ),
    },
    {
      icon: CheckCircle2,
      title: `${event.team} eliminated by proof`,
      body: (
        <>
          relayed through <span className="tnum text-text">settle_round</span> - the CPI must
          return true or the tx reverts
        </>
      ),
    },
    {
      icon: GitBranch,
      title: "Bracket advanced",
      body: <>{event.round} · opponent progresses, pot redistributed to survivors</>,
    },
  ];

  return (
    <div>
      <ol className="space-y-0">
        {steps.map((s, i) => {
          const last = i === steps.length - 1;
          return (
            <li key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-brand/40 bg-brand/10 text-brand-2">
                  <s.icon className="h-[18px] w-[18px]" />
                </span>
                {!last && <span className="my-1.5 w-px flex-1 bg-line" />}
              </div>
              <div className={last ? "pt-1.5" : "pb-8 pt-1.5"}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="eyebrow text-muted-2">{String(i + 1).padStart(2, "0")}</span>
                  {s.title}
                </div>
                <div className="mt-1.5 text-sm leading-relaxed text-muted">{s.body}</div>
              </div>
            </li>
          );
        })}
      </ol>

      <a
        href={solscanTx(event.txSig)}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-2 rounded-xl border border-line bg-panel-2 px-4 py-2.5 text-sm text-brand-2 transition-colors hover:border-brand-2/60"
      >
        <span className="tnum">View settle_round on Solscan · {truncate(event.txSig, 8, 6)}</span>
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
