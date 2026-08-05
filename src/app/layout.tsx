import type { Metadata } from "next";
import {
  Bodoni_Moda,
  EB_Garamond,
  Courier_Prime,
  UnifrakturCook,
} from "next/font/google";
import { Atmosphere } from "@/components/atmosphere/Atmosphere";
import { SiteNav } from "@/components/nav/SiteNav";
import { SiteFooter } from "@/components/nav/SiteFooter";
import { Providers } from "@/components/Providers";
import { ColdOpen } from "@/components/cold-open/ColdOpen";
import "./globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  display: "swap",
});

const courier = Courier_Prime({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-courier",
  display: "swap",
});

const fraktur = UnifrakturCook({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-fraktur",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pokousaná",
  description:
    "Every soul has a life before the bite—and a legend after it. Authored by Veronika.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodoni.variable} ${garamond.variable} ${courier.variable} ${fraktur.variable} antialiased`}
      >
        <Providers>
          <Atmosphere />
          <ColdOpen />
          <div className="relative z-10 flex min-h-screen flex-col">
            <SiteNav />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}
