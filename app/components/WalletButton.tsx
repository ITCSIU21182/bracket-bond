"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";

function short(addr: string) {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

export function WalletButton({ full = false }: { full?: boolean }) {
  const { publicKey, connected, connecting, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const base = cn(
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition-all",
    full && "w-full",
  );

  // Stable placeholder during SSR / before mount (avoids hydration mismatch).
  if (!mounted) {
    return <div className={cn("h-10 rounded-xl bg-panel", full ? "w-full" : "w-[150px]")} />;
  }

  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className={cn(
          "shine group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.02]",
          full ? "w-full" : "",
        )}
      >
        {/* rotating conic-gradient rim (concierge style) */}
        <span
          aria-hidden
          className="absolute inset-0 animate-spin-slow"
          style={{ background: "conic-gradient(from 0deg, #0054fa, #37d67a, #80c8e6, #4785fc, #0054fa)" }}
        />
        <span
          aria-hidden
          className="absolute inset-[1.5px] rounded-[10px] bg-brand transition-colors group-hover:bg-brand-2"
        />
        {/* football that rolls across on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:animate-roll"
          style={{ ["--roll-x" as string]: "150px" } as React.CSSProperties}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4">
            <circle cx="12" cy="12" r="11" fill="#fff" stroke="#04070f" strokeWidth="1.2" />
            <circle cx="12" cy="8.4" r="2.1" fill="#04070f" />
            <circle cx="7.4" cy="14.6" r="1.6" fill="#04070f" />
            <circle cx="16.6" cy="14.6" r="1.6" fill="#04070f" />
          </svg>
        </span>
        <span className="relative inline-flex items-center gap-2 px-4">
          <Wallet className="h-4 w-4" />
          {connecting ? "Connecting…" : "Connect Wallet"}
        </span>
      </button>
    );
  }

  const addr = publicKey.toBase58();
  return (
    <div className={cn("relative", full && "w-full")}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(base, "border-line bg-panel text-text hover:border-brand-2")}
      >
        <span className="grid h-5 w-5 place-items-center rounded-md bg-brand/20 text-brand-2">
          <Wallet className="h-3 w-3" />
        </span>
        <span className="tnum">{short(addr)}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-line bg-panel shadow-card">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(addr);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3.5 py-2.5 text-sm text-muted transition-colors hover:bg-panel-2 hover:text-text"
            >
              <Copy className="h-4 w-4" /> Copy address
            </button>
            <button
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-line/60 px-3.5 py-2.5 text-sm text-danger transition-colors hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" /> Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
