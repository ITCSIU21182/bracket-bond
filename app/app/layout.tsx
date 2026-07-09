import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bracket Bond",
  description: "A World Cup position that settles itself — by proof, not by vote.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
