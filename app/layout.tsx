import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rocket Atlas — Small steps. Giant leaps.",
  description:
    "An interactive 3D exhibit of Mercury-Redstone, Gemini-Titan II and Saturn V at true scale, with an AI guide.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 26 26'%3E%3Crect width='26' height='26' rx='6' fill='%23030405'/%3E%3Cellipse cx='13' cy='13' rx='9' ry='3.4' transform='rotate(-32 13 13)' stroke='%23d8c39a' fill='none'/%3E%3Ccircle cx='13' cy='13' r='3' fill='%23ece8df'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: "#030405", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
