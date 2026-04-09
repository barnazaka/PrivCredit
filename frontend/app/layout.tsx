import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "PrivCredit — Confidential Private Credit Marketplace",
  description:
    "Decentralized private credit for SMEs using iExec Nox Confidential Computing and ERC-7984 Confidential Tokens on Arbitrum.",
  keywords: ["DeFi", "private credit", "confidential computing", "iExec Nox", "ERC-7984", "Arbitrum"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-mono bg-void text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
