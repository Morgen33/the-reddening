import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Svazek · Pokousaná",
  description: "Open the sealed book. Break nothing — only read.",
};

export default function TomePage() {
  return (
    <>
      {/* Always-visible exit — sits above the book iframe */}
      <Link
        href="/"
        className="fixed top-[5.75rem] left-4 z-30 rounded-sm border border-gilt/40 bg-soot/90 px-3 py-2 font-ledger text-[0.65rem] tracking-[0.18em] text-gilt uppercase backdrop-blur-sm transition-colors hover:border-arterial/60 hover:text-arterial md:top-[6.5rem] md:left-6"
      >
        ← Kronika
      </Link>

      {/* Fills the viewport under the site nav */}
      <div className="fixed inset-x-0 top-[5.5rem] bottom-0 z-10 bg-[#5a534c] md:top-[6.25rem]">
        <iframe
          src="/storybook.html"
          title="The sealed tome"
          className="h-full w-full border-0"
          allow="fullscreen"
        />
      </div>
      <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.25rem)]" aria-hidden />
    </>
  );
}
