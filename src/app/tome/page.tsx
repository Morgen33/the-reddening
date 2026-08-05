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
      <div className="fixed inset-x-0 top-[5.5rem] bottom-16 z-10 bg-[#5a534c] md:top-[6.25rem]">
        <iframe
          src="/storybook.html"
          title="The sealed tome"
          className="h-full w-full border-0"
          allow="fullscreen"
        />
      </div>

      {/* Bottom exit — always visible */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center border-t border-gilt/30 bg-soot/95 px-4 py-3 backdrop-blur-sm">
        <Link
          href="/"
          className="btn-seal inline-flex min-w-[12rem] justify-center text-center"
        >
          ← Kronika
        </Link>
      </div>

      <div className="h-[calc(100dvh-5.5rem)] md:h-[calc(100dvh-6.25rem)]" aria-hidden />
    </>
  );
}
