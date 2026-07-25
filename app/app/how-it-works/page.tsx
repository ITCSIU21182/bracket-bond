"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Binary,
  Bot,
  Coins,
  Cpu,
  Flag,
  HandCoins,
  LayoutGrid,
  MessageSquare,
  Radio,
  ShieldCheck,
  Ticket,
  TrendingUp,
  User,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

// Vertical-stepper explainer: each step is (mono number + bold title) over a glass
// card whose upper half is a gradient-tinted mini flow-diagram (boxed icons + arrows
// + labels) and whose lower half is one paragraph. The diagram is the explanation.

function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

type Tone = { c: string; eyebrow: string };
const TONES = {
  blue: { c: "#4785fc", eyebrow: "#8fb4fd" },
  green: { c: "#37d67a", eyebrow: "#6ee3a3" },
  cyan: { c: "#80c8e6", eyebrow: "#a8dcef" },
  violet: { c: "#8b7ff5", eyebrow: "#b1a8f9" },
  gold: { c: "#f5c451", eyebrow: "#f8d789" },
  teal: { c: "#57b6b2", eyebrow: "#84cecb" },
} satisfies Record<string, Tone>;

function FlowBox({ icon: Icon, label, tone }: { icon: typeof Wallet; label: string; tone: Tone }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-xl border"
        style={{ background: rgba(tone.c, 0.14), borderColor: rgba(tone.c, 0.32), color: tone.c }}
      >
        <Icon size={22} />
      </div>
      <span className="text-[10px] text-muted-2">{label}</span>
    </div>
  );
}

function FlowArrow({ tone }: { tone: Tone }) {
  return <ArrowRight className="-mt-5 h-4 w-4 shrink-0" style={{ color: rgba(tone.c, 0.5) }} />;
}

function Step({
  num,
  title,
  tone,
  prose,
  children,
  delay,
}: {
  num: string;
  title: string;
  tone: Tone;
  prose: React.ReactNode;
  children: React.ReactNode;
  delay: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ delay, duration: 0.4 }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="tnum font-mono text-sm" style={{ color: tone.eyebrow }}>
          {num}
        </span>
        <h2 className="text-base font-bold tracking-tight text-text">{title}</h2>
      </div>
      <div className="ml-9 overflow-hidden rounded-xl border border-line bg-panel/50 backdrop-blur-sm sm:ml-10">
        <div
          className="flex w-full items-center justify-center gap-2.5 px-4 py-8 sm:gap-3 sm:px-6"
          style={{ background: `linear-gradient(to bottom right, ${rgba(tone.c, 0.12)}, transparent)` }}
        >
          {children}
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted">{prose}</p>
        </div>
      </div>
    </motion.section>
  );
}

export default function HowItWorksPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 55% at 50% 0%, rgba(71, 133, 252, 0.16) 0%, rgba(71, 133, 252, 0) 60%)",
        }}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-14">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="mb-12 text-center">
            <div className="eyebrow mb-3 text-brand-2">How it works</div>
            <h1 className="display text-4xl sm:text-5xl">Bet the bracket. Settled by proof.</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              Buy into a team, let the crowd price the odds, and let a cryptographic proof from
              TxLINE - not a human - decide the winner. Here is the whole loop.
            </p>
          </div>

          <div className="space-y-8">
            <Step
              num="01"
              title="Pick a team to back"
              tone={TONES.blue}
              delay={0}
              prose={
                <>
                  Each market is one shared <span className="text-text">parimutuel pot</span> on a
                  knockout bracket. You buy shares in the team you think advances - the price you pay
                  is that team&apos;s live implied probability. No order book, no counterparty: your
                  stake simply joins the pot.
                </>
              }
            >
              <FlowBox icon={User} label="You" tone={TONES.blue} />
              <FlowArrow tone={TONES.blue} />
              <FlowBox icon={LayoutGrid} label="Market" tone={TONES.blue} />
              <FlowArrow tone={TONES.blue} />
              <FlowBox icon={Ticket} label="Shares" tone={TONES.blue} />
            </Step>

            <Step
              num="02"
              title="The pot sets the odds"
              tone={TONES.green}
              delay={0.06}
              prose={
                <>
                  Every buy grows the single pot and nudges the marks. So the odds you see are not set
                  by a bookmaker - they are the crowd&apos;s live estimate of who reaches the final,
                  priced by real money on-chain.
                </>
              }
            >
              <FlowBox icon={Users} label="Buyers" tone={TONES.green} />
              <FlowArrow tone={TONES.green} />
              <FlowBox icon={Coins} label="One pot" tone={TONES.green} />
              <FlowArrow tone={TONES.green} />
              <FlowBox icon={TrendingUp} label="Marks" tone={TONES.green} />
            </Step>

            <Step
              num="03"
              title="TxLINE publishes the result"
              tone={TONES.cyan}
              delay={0.12}
              prose={
                <>
                  When a knockout finishes, TxODDS&apos; <span className="text-text">TxLINE</span>{" "}
                  oracle publishes the score - penalty shootouts included - as signed data under a
                  daily Merkle root. Nobody types a winner into an admin panel.
                </>
              }
            >
              <FlowBox icon={Flag} label="Full-time" tone={TONES.cyan} />
              <FlowArrow tone={TONES.cyan} />
              <FlowBox icon={Radio} label="TxLINE" tone={TONES.cyan} />
              <FlowArrow tone={TONES.cyan} />
              <FlowBox icon={Binary} label="Signed proof" tone={TONES.cyan} />
            </Step>

            <Step
              num="04"
              title="Settled by proof, by anyone"
              tone={TONES.violet}
              delay={0.18}
              prose={
                <>
                  Any wallet can submit the settle transaction. The program rebuilds the{" "}
                  <span className="text-text">&ldquo;did the opponent advance?&rdquo;</span> test
                  itself and pins the exact stat keys, so a caller can only relay the one correct
                  proof - never eliminate the winning team. Permissionless, but not exploitable.
                </>
              }
            >
              <FlowBox icon={Binary} label="Proof" tone={TONES.violet} />
              <FlowArrow tone={TONES.violet} />
              <FlowBox icon={Cpu} label="Program" tone={TONES.violet} />
              <FlowArrow tone={TONES.violet} />
              <FlowBox icon={ShieldCheck} label="Verified" tone={TONES.violet} />
            </Step>

            <Step
              num="05"
              title="Redeem your winnings"
              tone={TONES.gold}
              delay={0.24}
              prose={
                <>
                  Eliminated teams drop to zero and the pot is split{" "}
                  <span className="text-text">pro-rata</span> across the surviving shares. Winners
                  redeem for their slice. The only protocol fee is skimmed from the pot at settlement
                  - never from your buy.
                </>
              }
            >
              <FlowBox icon={Ticket} label="Winning shares" tone={TONES.gold} />
              <FlowArrow tone={TONES.gold} />
              <FlowBox icon={HandCoins} label="Redeem" tone={TONES.gold} />
              <FlowArrow tone={TONES.gold} />
              <FlowBox icon={Wallet} label="Payout" tone={TONES.gold} />
            </Step>

            <Step
              num="06"
              title="It runs itself"
              tone={TONES.teal}
              delay={0.3}
              prose={
                <>
                  An <span className="text-text">autonomous keeper</span> watches TxLINE and settles
                  each round the moment it is provable - no admin, no downtime. And an AI pundit can
                  explain any market or settlement, grounded only on data it can verify.
                </>
              }
            >
              <FlowBox icon={Bot} label="Keeper" tone={TONES.teal} />
              <FlowArrow tone={TONES.teal} />
              <FlowBox icon={Zap} label="Auto-settle" tone={TONES.teal} />
              <FlowArrow tone={TONES.teal} />
              <FlowBox icon={MessageSquare} label="Pundit" tone={TONES.teal} />
            </Step>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/markets"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-[#04110a] transition-transform hover:scale-[1.03]"
            >
              Explore markets →
            </Link>
            <Link
              href="/live"
              className="rounded-full border border-line bg-panel px-6 py-2.5 text-sm font-medium text-text transition-colors hover:border-brand-2/50"
            >
              Watch it settle live
            </Link>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
