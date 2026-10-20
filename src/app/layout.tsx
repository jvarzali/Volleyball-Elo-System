import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

const bigShoulders = Big_Shoulders({
  subsets: ["latin"],
  variable: "--font-big-shoulders",
  axes: ["opsz"],
  adjustFontFallback: false,
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Volleyball Elo",
  description: "Find pickup volleyball near you, get in line to play winners, and track your rating.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1d4e9e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bigShoulders.variable} ${archivo.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <AppNav />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10">
          {children}
        </main>
      </body>
    </html>
  );
}
