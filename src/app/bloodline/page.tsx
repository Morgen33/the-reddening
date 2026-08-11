import { getAllCharacters, getBonds } from "@/lib/characters";
import { getCharacterPortraitUrls } from "@/lib/character-images";
import { BloodlineTree } from "@/components/bloodline/BloodlineTree";
import { RedThread } from "@/components/atmosphere/RedThread";

export const dynamic = "force-dynamic";

export default async function BloodlinePage() {
  let nodes: {
    id: string;
    handle: string;
    name: string;
    status: string;
    sireId: string | null;
    portraitUrl?: string | null;
  }[] = [];
  let bonds: { fromId: string; toId: string; kind: string }[] = [];

  try {
    const chars = await getAllCharacters();
    const b = await getBonds();
    nodes = await Promise.all(
      chars.map(async (c) => {
        const urls = await getCharacterPortraitUrls(c);
        return {
          id: c.id,
          handle: c.handle,
          name: c.name,
          status: c.status,
          sireId: c.sireId,
          portraitUrl: urls[0] ?? null,
        };
      })
    );
    bonds = b.map((x) => ({
      fromId: x.fromId,
      toId: x.toId,
      kind: x.kind,
    }));
  } catch {
    // unseeded
  }

  return (
    <div className="relative px-6 py-12">
      <RedThread variant="bloodline" />
      <div className="mx-auto max-w-6xl">
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          From whom
        </p>
        <h2 className="font-display mb-3 text-4xl text-vellum">Rodokmen</h2>
        <p className="mb-10 max-w-prose text-vellum-dim">
          The globe answers where. This answers from whom — the structure the
          mythology hangs on.
        </p>
        <BloodlineTree nodes={nodes} bonds={bonds} />
      </div>
    </div>
  );
}
