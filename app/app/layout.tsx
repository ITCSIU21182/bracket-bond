import type { Metadata } from "next";
import { Anton, Space_Grotesk, DM_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PunditChat } from "@/components/PunditChat";

// Manuka-style condensed display → Anton; body → DM Sans; labels/mono → DM Mono.
const display = Anton({ subsets: ["latin"], weight: "400", variable: "--font-display", display: "swap" });
const sans = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-sans", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Bracket Bond",
  description: "Hold a World Cup position that settles itself - by proof, not by vote. On Solana.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>
          <Nav />
          <main>{children}</main>
          <Footer />
          <PunditChat />
          <Toaster
            theme="dark"
            position="bottom-center"
            toastOptions={{
              style: { background: "#0b1430", border: "1px solid #1a3570", color: "#e9eeff" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
