import Link from "next/link";
import { notFound } from "next/navigation";
import { NarrationHorn } from "@/components/chronicle/NarrationHorn";
import { ScrollThread } from "@/components/chronicle/ScrollThread";
import { getChapterWithNames } from "@/lib/chapters";
import { toRoman } from "@/lib/copy";
import { isAuthor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getChapterWithNames(slug);
  if (!data) notFound();
  const author = await isAuthor();

  const { chapter, turned, sire, recording } = data;
  const dateline = [chapter.place, chapter.occurredYear, chapter.occurredFuzzy]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="ink-wipe relative px-6 py-12">
      <ScrollThread />
      <div className="prose-chapter">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="font-ledger text-xs tracking-[0.15em] text-gilt uppercase hover:text-arterial"
          >
            ← Chronicle
          </Link>
          {author && (
            <Link
              href={`/write?edit=${chapter.slug}`}
              className="font-ledger text-xs tracking-[0.15em] text-arterial uppercase hover:text-vellum"
            >
              Revise this chapter
            </Link>
          )}
        </div>

        <p className="font-numeral mb-2 text-5xl text-gilt">
          {toRoman(chapter.numeral)}
        </p>
        <h1 className="font-display mb-4 text-4xl leading-tight text-vellum md:text-5xl">
          {chapter.title}
        </h1>
        {dateline && (
          <p className="font-ledger mb-2 text-xs tracking-[0.18em] text-vellum-dim uppercase">
            {dateline}
          </p>
        )}
        {(turned || sire) && (
          <p className="mb-6 text-sm text-vellum-dim">
            {turned && (
              <>
                Turned:{" "}
                <Link
                  href={`/cast/${turned.handle}`}
                  className="text-vellum underline decoration-gilt/40 underline-offset-4 hover:text-arterial"
                >
                  {turned.name}
                </Link>
              </>
            )}
            {turned && sire && " · "}
            {sire && (
              <>
                Sire:{" "}
                <Link
                  href={`/cast/${sire.handle}`}
                  className="text-vellum underline decoration-gilt/40 underline-offset-4 hover:text-arterial"
                >
                  {sire.name}
                </Link>
              </>
            )}
          </p>
        )}

        <hr className="gilt-rule mb-8" />

        {recording?.audioUrl && (
          <NarrationHorn audioUrl={recording.audioUrl} />
        )}

        <div
          className="drop-cap space-y-5 text-vellum [&_p]:mb-5"
          dangerouslySetInnerHTML={{
            __html:
              chapter.bodyHtml ??
              "<p>This chapter waits to be set in ink.</p>",
          }}
        />
      </div>
    </article>
  );
}
