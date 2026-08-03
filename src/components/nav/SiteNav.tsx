"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const LINKS = [
  { href: "/", label: "Chronicle" },
  { href: "/cast", label: "Cast" },
  { href: "/reddening", label: "The Reddening" },
  { href: "/bloodline", label: "Bloodline" },
  { href: "/write", label: "Scriptorium" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="relative z-20 border-b border-gilt/30 bg-soot/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-5 md:flex-row md:items-end md:justify-between">
        <Link href="/" className="group">
          <p className="font-ledger text-[0.65rem] tracking-[0.25em] text-gilt uppercase">
            A living chronicle
          </p>
          <h1 className="font-display text-3xl tracking-wide text-vellum transition-colors group-hover:text-arterial md:text-4xl">
            The Reddening
          </h1>
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "font-ledger text-xs tracking-[0.12em] uppercase transition-colors",
                  active
                    ? "text-arterial"
                    : "text-vellum-dim hover:text-vellum"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
