import { getTurningsForGlobe } from "@/lib/characters";
import { ReddeningGlobe } from "@/components/reddening/ReddeningGlobe";
import { RedThread } from "@/components/atmosphere/RedThread";

export const dynamic = "force-dynamic";

export default async function ReddeningPage() {
  let points: Awaited<ReturnType<typeof getTurningsForGlobe>> = [];
  try {
    points = await getTurningsForGlobe();
  } catch {
    // unseeded
  }

  return (
    <div className="relative py-10">
      <RedThread variant="globe" />
      <div className="mx-auto mb-6 max-w-6xl px-6">
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          Where the blood went
        </p>
        <h2 className="font-display text-4xl text-vellum md:text-5xl">
          The Reddening
        </h2>
        <p className="mt-3 max-w-prose text-vellum-dim">
          The Earth itself. Every turning is a pulse; every sire-bond a blood
          string. Seal another chapter and the world swells redder.
        </p>
      </div>
      <ReddeningGlobe points={points} />
    </div>
  );
}
