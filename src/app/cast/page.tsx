import Link from "next/link";
import { getAllCharacters } from "@/lib/characters";
import { COPY } from "@/lib/copy";
import { RedThread } from "@/components/atmosphere/RedThread";
import { AddCharacterForm } from "@/components/cast/AddCharacterForm";
import { isAuthor } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function CastPage() {
  let cast: Awaited<ReturnType<typeof getAllCharacters>> = [];
  try {
    cast = await getAllCharacters();
  } catch {
    // unseeded
  }
  const author = await isAuthor();

  return (
    <div className="relative px-6 py-12">
      <RedThread variant="cast" />
      <div className="mx-auto max-w-6xl">
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          Postavy
        </p>
        <h2 className="font-display mb-3 text-4xl text-vellum">Dossiers</h2>
        <p className="mb-6 max-w-prose text-vellum-dim">
          Likenesses and bonds. Seal a chapter in the Skriptorium and it is
          written into the Svazek.
        </p>

        {author && (
          <div className="mb-10">
            <AddCharacterForm characters={cast} />
          </div>
        )}

        {cast.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-vellum-dim">
              {COPY.emptyCast}
            </p>
            {author && (
              <Link href="/write" className="btn-seal mt-6 inline-flex">
                {COPY.beginFirstTurning}
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cast.map((c) => (
              <Link key={c.id} href={`/cast/${c.handle}`} className="dossier-card block">
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`font-ledger text-[0.65rem] tracking-[0.15em] uppercase ${
                      c.status === "mortal" ? "status-mortal" : "status-vampire"
                    }`}
                  >
                    ● {c.status}
                  </span>
                  {c.turnedYear && (
                    <span className="font-ledger text-xs text-vellum-dim">
                      {c.turnedYear}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-2xl text-vellum">{c.name}</h3>
                {c.epithet && (
                  <p className="mt-1 text-sm text-vellum-dim italic">
                    {c.epithet}
                  </p>
                )}
                {c.turnedPlace && (
                  <p className="font-ledger mt-4 text-xs tracking-wider text-gilt uppercase">
                    {c.turnedPlace}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
