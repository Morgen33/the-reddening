import Link from "next/link";
import { notFound } from "next/navigation";
import { PortraitSlider } from "@/components/cast/PortraitSlider";
import { PortraitUpload } from "@/components/cast/PortraitUpload";
import { getCharacterDossier } from "@/lib/characters";
import { COPY } from "@/lib/copy";
import { isAuthor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DossierPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const dossier = await getCharacterDossier(handle);
  if (!dossier) notFound();

  const { character, sire, bonds, appearances } = dossier;
  const author = await isAuthor();

  return (
    <div className="ink-wipe mx-auto max-w-5xl px-6 py-12">
      <Link
        href="/cast"
        className="font-ledger mb-8 inline-block text-xs tracking-[0.15em] text-gilt uppercase hover:text-arterial"
      >
        ← Cast
      </Link>

      <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <PortraitSlider
            mortalSrc={character.portraitMortalUrl}
            vampireSrc={character.portraitVampireUrl}
            alt={character.name}
          />
          {author && <PortraitUpload characterId={character.id} />}
        </div>

        <div>
          <p
            className={`font-ledger mb-2 text-xs tracking-[0.15em] uppercase ${
              character.status === "mortal" ? "status-mortal" : "status-vampire"
            }`}
          >
            ● {character.status}
          </p>
          <h1 className="font-display text-5xl text-vellum">{character.name}</h1>
          {character.epithet && (
            <p className="mt-2 text-xl text-vellum-dim italic">
              {character.epithet}
            </p>
          )}

          <dl className="mt-8 grid gap-3 font-ledger text-sm tracking-wide text-vellum-dim">
            {character.mortalName && (
              <div>
                <dt className="text-gilt">Mortal name</dt>
                <dd className="text-vellum">{character.mortalName}</dd>
              </div>
            )}
            {character.bornYear && (
              <div>
                <dt className="text-gilt">Born</dt>
                <dd className="text-vellum">{character.bornYear}</dd>
              </div>
            )}
            <div>
              <dt className="text-gilt">Turned</dt>
              <dd className="text-vellum">
                {character.turnedYear ?? "—"}
                {character.turnedPlace ? ` · ${character.turnedPlace}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-gilt">Sire</dt>
              <dd className="text-vellum">
                {sire ? (
                  <Link
                    href={`/cast/${sire.handle}`}
                    className="hover:text-arterial"
                  >
                    {sire.name}
                  </Link>
                ) : (
                  <span className="italic">{COPY.originUnrecorded}</span>
                )}
              </dd>
            </div>
          </dl>

          {character.bio && (
            <p className="mt-6 max-w-prose text-vellum-dim">{character.bio}</p>
          )}

          {bonds.length > 0 && (
            <div className="mt-8">
              <h2 className="font-ledger mb-3 text-xs tracking-[0.18em] text-gilt uppercase">
                Bonds
              </h2>
              <ul className="space-y-2">
                {bonds.map((b) => (
                  <li key={b.id} className="text-sm text-vellum-dim">
                    <span
                      className={
                        b.kind === "lover" ? "text-gilt" : "text-arterial"
                      }
                    >
                      {b.kind}
                    </span>
                    {" — "}
                    {b.other ? (
                      <Link
                        href={`/cast/${b.other.handle}`}
                        className="text-vellum hover:text-arterial"
                      >
                        {b.other.name}
                      </Link>
                    ) : (
                      "?"
                    )}
                    {b.note ? ` · ${b.note}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {appearances.length > 0 && (
            <div className="mt-8">
              <h2 className="font-ledger mb-3 text-xs tracking-[0.18em] text-gilt uppercase">
                Chapters
              </h2>
              <ul className="space-y-2">
                {appearances.map((ch) => (
                  <li key={ch.id}>
                    <Link
                      href={`/chapter/${ch.slug}`}
                      className="text-vellum underline decoration-gilt/30 underline-offset-4 hover:text-arterial"
                    >
                      {ch.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
