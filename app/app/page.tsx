import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Bot,
  Gavel,
} from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { Reveal } from "@/components/fx/Reveal";
import { Marquee } from "@/components/fx/Marquee";
import { Countdown } from "@/components/fx/Countdown";
import { Parallax } from "@/components/fx/Parallax";
import { Swirl } from "@/components/fx/Swirl";
import { MARKETS, REAL_SETTLE_TX } from "@/lib/mockData";
import { solscanTx, truncate } from "@/lib/format";

const RUNNER = [
  "PROOF-SETTLED",
  "EXIT ANYTIME",
  "SHOOTOUT-AWARE",
  "PERMISSIONLESS",
  "ON SOLANA",
  "NO HUMAN ORACLE",
];

export default function Landing() {
  const featured = MARKETS[0];

  return (
    <div>
      {/* ───────────────────────── HERO ───────────────────────── */}
      <section className="relative flex min-h-[92svh] items-end overflow-hidden">
        {/* backdrop layers */}
        <img
          src="/wc/skyline.webp"
          alt=""
          aria-hidden
          decoding="async"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.28]"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-bg/60 via-bg/40 to-bg" />
        <div aria-hidden className="absolute inset-0 bg-grid opacity-60" />
        <div aria-hidden className="radial-navy absolute inset-0" />
        <div
          aria-hidden
          className="absolute -left-40 top-20 h-96 w-96 animate-float rounded-full bg-brand/20 blur-3xl"
        />
        <Swirl
          className="right-[-8rem] top-16 h-[44rem] w-[44rem]"
          colors="#0054fa, #37d67a, #57b6b2, #0054fa"
          opacity={0.2}
        />
        <img
          src="/wc/wheel.svg"
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 h-[38rem] w-[38rem] animate-spin-slow opacity-[0.06]"
        />
        {/* trophy */}
        <Parallax amount={40} className="pointer-events-none absolute -right-6 bottom-0 hidden h-[86%] md:block">
          <img src="/wc/trophy.webp" alt="" aria-hidden decoding="async" className="h-full w-auto object-contain drop-shadow-[0_0_60px_rgba(245,196,81,0.25)]" />
        </Parallax>

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-20 pt-28">
          <div className="max-w-3xl animate-blur-out">
            <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-line bg-panel/70 py-1.5 pl-2 pr-4 backdrop-blur">
              <span className="checker h-6 w-6 rounded-full ring-1 ring-white/10" aria-hidden />
              <span className="text-sm font-medium text-text">
                Prediction Markets <span className="text-muted-2">·</span>{" "}
                <span className="text-brand-2">World Cup 2026</span>
              </span>
            </div>

            <h1 className="display text-5xl leading-[0.86] sm:text-7xl lg:text-8xl">
              Hold a World Cup position that{" "}
              <span className="text-proof">settles itself</span> - by proof, not by vote.
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted">
              A tradeable, tournament-long market on Solana. Every knockout round resolves on a
              cryptographic proof of the real match data - including penalty shootouts.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/markets"
                className="shine inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 font-semibold text-[#04070f] transition-all hover:shadow-glow-white"
              >
                Enter markets <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/judge"
                className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-panel/60 px-6 font-medium text-text backdrop-blur hover:border-brand-2"
              >
                <Gavel className="h-4 w-4" /> Judge Mode
              </Link>
            </div>

            <a
              href={solscanTx(REAL_SETTLE_TX)}
              target="_blank"
              rel="noreferrer"
              className="group mt-8 inline-flex items-center gap-3 rounded-2xl border border-accent/40 bg-accent/10 px-4 py-3 transition-all hover:border-accent/70 hover:shadow-glow"
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-xl bg-accent/30 opacity-50" />
                <CheckCircle2 className="relative h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-semibold text-text">Settled by proof - live on devnet</span>
                <span className="tnum block text-xs text-accent">
                  tx {truncate(REAL_SETTLE_TX, 8, 6)} · view on Solscan
                </span>
              </span>
              <ExternalLink className="ml-1 h-4 w-4 text-muted transition-colors group-hover:text-accent" />
            </a>

            <div className="mt-10">
              <div className="eyebrow mb-2.5 text-muted-2">Tournament final · kickoff</div>
              <Countdown target="2026-07-19T19:00:00Z" />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── RUNNER MARQUEE ─────────────────── */}
      <div className="border-y border-line/70 bg-panel/40 py-4">
        <Marquee speed={28}>
          {RUNNER.map((w) => (
            <span key={w} className="display flex items-center gap-8 text-2xl text-muted-2">
              {w}
              <span className="text-brand-2">✦</span>
            </span>
          ))}
        </Marquee>
      </div>

      {/* ─────────────────── SPOTLIGHT ─────────────────── */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-40" />
        <div className="relative mx-auto max-w-6xl px-5 py-24">
          <Reveal>
            <div className="eyebrow mb-3 text-brand-2">Featured market</div>
            <h2 className="display max-w-2xl text-4xl leading-[0.9] sm:text-6xl">
              Race to the Final -{" "}
              <span className="text-icy">one position, seven rounds.</span>
            </h2>
            <p className="mt-4 max-w-xl text-muted">
              Back a team, ride it through the knockouts, and exit whenever you want. Each round is
              eliminated by a TxLINE proof - no committee, no dispute window.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <MarketCard market={featured} featured />
          </Reveal>
        </div>
      </section>

      {/* ─────────────────── HOW IT WORKS ─────────────────── */}
      <section className="relative border-y border-line/60 bg-bg-2">
        <div className="checker h-1.5 w-full opacity-70" aria-hidden />
        <div className="mx-auto max-w-6xl px-5 py-24">
          <Reveal>
            <div className="eyebrow mb-3 text-brand-2">How it works</div>
            <h2 className="display text-4xl sm:text-5xl">Three steps, zero trust</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Buy a team", d: "Take a position at the oracle-priced mark. Shares scale with the implied probability." },
              { n: "02", t: "Settle by proof", d: "When a fixture ends, a TxLINE Merkle proof is verified on-chain and the loser is eliminated." },
              { n: "03", t: "Exit or redeem", d: "Sell at the live mark anytime, or hold the winner and redeem a pro-rata slice of the pot." },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <div className="h-full rounded-2xl border border-line bg-panel p-6">
                  <div className="display text-5xl text-brand/40">{s.n}</div>
                  <h3 className="mt-3 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm text-muted">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FEATURES ─────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: <ShieldCheck className="h-5 w-5" />, t: "Proof-settled", d: "Rounds resolve via a TxLINE Merkle proof verified on-chain - no human oracle, no dispute window." },
            { icon: <LogOut className="h-5 w-5" />, t: "Exit anytime", d: "Sell your position at the live mark before the tournament ends. A real, tradeable market." },
            { icon: <Bot className="h-5 w-5" />, t: "Runs itself", d: "Permissionless settlement + an autonomous keeper: anyone or the bot can settle the instant a proof exists." },
          ].map((f, i) => (
            <Reveal key={f.t} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-panel p-6">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand-2">{f.icon}</span>
                <h3 className="mt-3 font-semibold">{f.t}</h3>
                <p className="mt-1 text-sm text-muted">{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────────── CTA ─────────────────── */}
      <section className="relative overflow-hidden border-t border-line/60">
        <img src="/wc/player.webp" alt="" aria-hidden loading="lazy" decoding="async" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-cover opacity-20 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div aria-hidden className="radial-navy absolute inset-0" />
        <Swirl className="left-1/2 top-[-6rem] h-[34rem] w-[34rem] -translate-x-1/2" opacity={0.14} />
        <div className="relative mx-auto max-w-6xl px-5 py-24 text-center">
          <Reveal>
            <h2 className="display mx-auto max-w-3xl text-4xl leading-[0.92] sm:text-6xl">
              The only market that settles a shootout <span className="text-proof">correctly.</span>
            </h2>
            <div className="mt-8 flex justify-center">
              <Link
                href="/markets"
                className="shine inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 font-semibold text-[#04070f] transition-all hover:shadow-glow-white"
              >
                Enter markets <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
