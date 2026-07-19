import Link from "next/link";
import { Marquee } from "./fx/Marquee";
import { REAL_SETTLE_TX } from "@/lib/mockData";
import { solscanTx } from "@/lib/format";

const RUNNER = ["PROOF, NOT VOTE", "SETTLED ON SOLANA", "RACE TO THE FINAL", "WORLD CUP 2026"];

export function Footer() {
  return (
    <footer className="relative mt-16 overflow-hidden border-t border-line/70 bg-bg-2">
      {/* runner */}
      <div className="border-b border-line/60 py-4">
        <Marquee speed={26}>
          {RUNNER.map((w) => (
            <span key={w} className="display flex items-center gap-8 text-2xl text-muted-2">
              {w}
              <span className="text-brand-2">✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* big slogan wordmark */}
      <div className="relative mx-auto max-w-6xl px-5 pt-16">
        <div className="eyebrow mb-4 text-brand-2">Bracket Bond</div>
        <h2 className="display tracking-tightest">
          <span className="block text-[15vw] leading-[0.95] text-text lg:text-[11rem]">Settled by</span>
          <span className="text-flow mt-2 block animate-gradient-x text-[15vw] leading-[0.95] lg:mt-3 lg:text-[11rem]">
            proof.
          </span>
        </h2>
        <p className="mt-6 max-w-md text-muted">
          A tradeable, tournament-long World Cup market on Solana. Every round resolves on a
          cryptographic proof - no human oracle, no dispute window.
        </p>
      </div>

      {/* columns */}
      <div className="mx-auto mt-14 grid max-w-6xl gap-10 px-5 pb-14 sm:grid-cols-2 lg:grid-cols-4">
        <FooterCol
          title="Product"
          links={[
            { label: "Markets", href: "/markets" },
            { label: "Portfolio", href: "/portfolio" },
            { label: "Activity", href: "/activity" },
            { label: "Judge Mode", href: "/judge" },
          ]}
        />
        <FooterCol
          title="Proof"
          links={[
            { label: "Live settle tx", href: solscanTx(REAL_SETTLE_TX), external: true },
            { label: "TxLINE (TxODDS)", href: "https://txline-docs.txodds.com", external: true },
          ]}
        />
        <div className="sm:col-span-2 lg:col-span-2">
          <div className="eyebrow mb-3 text-muted-2">Built for</div>
          <p className="max-w-sm text-sm text-muted">
            TxODDS × Superteam World Cup Hackathon - Prediction Markets &amp; Settlement. Play-money,
            devnet only.
          </p>
        </div>
      </div>

      <div className="border-t border-line/50 py-5 text-center text-xs text-muted-2">
        Settle by math, not by vote · no human oracle, no dispute window.
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="eyebrow mb-3 text-muted-2">{title}</div>
      <ul className="space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-muted transition-colors hover:text-text"
              >
                {l.label}
              </a>
            ) : (
              <Link href={l.href} className="text-sm text-muted transition-colors hover:text-text">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
