import Link from "next/link";
import { ScrollThread } from "@/components/chronicle/ScrollThread";
import { getSealedChapters, getCharacterMap } from "@/lib/chapters";
import { COPY, toRoman } from "@/lib/copy";

export const dynamic = "force-dynamic";

export default async function ChroniclePage() {
  let chapters: Awaited<ReturnType<typeof getSealedChapters>> = [];
  let charMap: Awaited<ReturnType<typeof getCharacterMap>> = {};

  try {
    chapters = await getSealedChapters();
    charMap = await getCharacterMap();
  } catch {
    // DB not seeded yet
  }

  return (
    <div className="ink-wipe relative px-6 py-12">
      <ScrollThread />
      <div className="mx-auto max-w-3xl">
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          Kronika
        </p>
        <h2 className="font-display mb-3 text-4xl text-vellum md:text-5xl">
          Turnings set in ink
        </h2>
        <p className="mb-10 max-w-prose text-vellum-dim">
          Each chapter is a bite remembered: who, when, where — and what was
          said before the Space ended. Seal one in the Skriptorium and it is
          also written into the{" "}
          <Link href="/tome" className="text-gilt underline hover:text-arterial">
            Svazek
          </Link>
          .
        </p>
        <hr className="gilt-rule mb-10" />

        {chapters.length === 0 ? (
          <div className="space-y-4 py-16 text-center">
            <p className="font-display text-2xl text-vellum-dim">
              {COPY.noChapters}
            </p>
            <Link href="/write" className="btn-seal inline-flex">
              {COPY.beginFirstTurning}
            </Link>
          </div>
        ) : (
          <ul className="space-y-8">
            {chapters.map((ch) => {
              const turned = ch.turnedId ? charMap[ch.turnedId] : null;
              return (
                <li key={ch.id}>
                  <Link
                    href={`/chapter/${ch.slug}`}
                    className="group block border border-transparent border-b-gilt/20 pb-8 transition-colors hover:border-b-arterial/50"
                  >
                    <div className="mb-2 flex items-baseline gap-4">
                      <span className="font-numeral text-3xl text-gilt">
                        {toRoman(ch.numeral)}
                      </span>
                      <h3 className="font-display text-2xl text-vellum transition-colors group-hover:text-arterial">
                        {ch.title}
                      </h3>
                    </div>
                    <p className="font-ledger text-xs tracking-wider text-vellum-dim uppercase">
                      {[ch.place, ch.occurredYear, ch.occurredFuzzy]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {turned && (
                      <p className="mt-2 text-sm text-vellum-dim">
                        The turning of{" "}
                        <span className="text-vellum">{turned.name}</span>
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
