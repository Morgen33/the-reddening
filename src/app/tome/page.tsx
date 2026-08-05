import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Svazek · Pokousaná",
  description: "Open the sealed book. Break nothing — only read.",
};

export default function TomePage() {
  return (
    <>
      {/* Book fills the space under the nav, above the exit bar */}
      <div className="fixed inset-x-0 top-[5.5rem] bottom-[4.75rem] z-10 bg-[#5a534c] md:top-[6.25rem]">
        <iframe
          src="/storybook.html"
          title="The sealed tome"
          className="h-full w-full border-0"
          allow="fullscreen"
        />
      </div>

      {/*
        Above atmosphere vignette (z-40) and grain (z-50) so the exit stays readable.
        Safe-area padding keeps it clear of iOS home indicator.
      */}
      <div className="fixed inset-x-0 bottom-0 z-[60] flex justify-center border-t border-gilt/40 bg-soot px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgba(0,0,0,0.55)]">
        <Link
          href="/"
          className="btn-seal inline-flex min-h-12 min-w-[14rem] items-center justify-center text-center text-base"
        >
          ← Home · Kronika
        </Link>
      </div>

      <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.25rem)]" aria-hidden />
    </>
  );
}
