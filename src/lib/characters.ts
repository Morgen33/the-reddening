import { eq } from "drizzle-orm";
import { db } from "@/db";
import { bonds, characters, chapters } from "@/db/schema";

export async function getAllCharacters() {
  return db.select().from(characters).orderBy(characters.name);
}

export async function getCharacterByHandle(handle: string) {
  const rows = await db
    .select()
    .from(characters)
    .where(eq(characters.handle, handle))
    .limit(1);
  return rows[0] ?? null;
}

export async function getBonds() {
  return db.select().from(bonds);
}

export async function getCharacterDossier(handle: string) {
  const character = await getCharacterByHandle(handle);
  if (!character) return null;

  const allChars = await getAllCharacters();
  const allBonds = await getBonds();
  const sire = character.sireId
    ? allChars.find((c) => c.id === character.sireId) ?? null
    : null;

  const charBonds = allBonds
    .filter((b) => b.fromId === character.id || b.toId === character.id)
    .map((b) => {
      const otherId = b.fromId === character.id ? b.toId : b.fromId;
      const other = allChars.find((c) => c.id === otherId);
      return { ...b, other };
    });

  const relatedChapters = await db.select().from(chapters);
  const appearances = relatedChapters.filter(
    (ch) =>
      ch.status === "sealed" &&
      (ch.turnedId === character.id || ch.sireId === character.id)
  );

  return { character, sire, bonds: charBonds, appearances };
}

export async function getTurningsForGlobe() {
  const sealed = await db.select().from(chapters);
  const chars = await getAllCharacters();
  const charMap = Object.fromEntries(chars.map((c) => [c.id, c]));

  const fromChapters = sealed
    .filter((c) => c.status === "sealed" && c.occurredYear != null)
    .map((c) => {
      const turned = c.turnedId ? charMap[c.turnedId] : null;
      const lat = c.lat ?? turned?.turnedLat ?? null;
      const lng = c.lng ?? turned?.turnedLng ?? null;
      if (lat == null || lng == null) return null;
      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        year: c.occurredYear!,
        place: c.place ?? turned?.turnedPlace ?? "Unknown",
        lat,
        lng,
        turnedId: c.turnedId,
        sireId:
          c.sireId ??
          (c.turnedId ? charMap[c.turnedId]?.sireId ?? null : null),
        turnedName: turned?.name ?? "?",
      };
    })
    .filter((p): p is NonNullable<typeof p> => p != null);

  const chapterTurnedIds = new Set(
    fromChapters.map((p) => p.turnedId).filter(Boolean)
  );

  // Characters with turning coords but no sealed chapter yet still mark the globe.
  const fromCharacters = chars
    .filter(
      (c) =>
        c.turnedLat != null &&
        c.turnedLng != null &&
        c.turnedYear != null &&
        !chapterTurnedIds.has(c.id)
    )
    .map((c) => ({
      id: `char-${c.id}`,
      slug: `cast/${c.handle}`,
      title: `The turning of ${c.name}`,
      year: c.turnedYear!,
      place: c.turnedPlace ?? "Unknown",
      lat: c.turnedLat!,
      lng: c.turnedLng!,
      turnedId: c.id,
      sireId: c.sireId,
      turnedName: c.name,
    }));

  return [...fromChapters, ...fromCharacters].sort((a, b) => a.year - b.year);
}
