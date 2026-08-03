"use client";

import { replayColdOpen } from "@/components/cold-open/ColdOpen";

export function SiteFooter() {
  return (
    <footer className="relative z-20 mt-24 border-t border-gilt/20 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="font-ledger text-xs tracking-wider text-vellum-dim">
          Authored by Veronika · set in ink so the Spaces do not take them
        </p>
        <button
          type="button"
          onClick={replayColdOpen}
          className="font-ledger text-xs tracking-[0.15em] text-gilt uppercase transition-colors hover:text-arterial"
        >
          Replay the opening
        </button>
      </div>
    </footer>
  );
}
