import { asc, eq, max } from "drizzle-orm";
import { db, client } from "@/db";
import { characterImages, characters } from "@/db/schema";

let ensured = false;

export async function ensureCharacterImagesTable() {
  if (ensured) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS character_images (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    )
  `);
  ensured = true;
}

export async function getCharacterImages(characterId: string) {
  await ensureCharacterImagesTable();
  return db
    .select()
    .from(characterImages)
    .where(eq(characterImages.characterId, characterId))
    .orderBy(asc(characterImages.sortOrder), asc(characterImages.createdAt));
}

/** Gallery first, then legacy mortal/vampire portrait columns. */
export async function getCharacterPortraitUrls(character: {
  id: string;
  portraitMortalUrl?: string | null;
  portraitVampireUrl?: string | null;
}): Promise<string[]> {
  const rows = await getCharacterImages(character.id);
  if (rows.length > 0) return rows.map((r) => r.url);

  const legacy = [
    character.portraitVampireUrl,
    character.portraitMortalUrl,
  ].filter((u): u is string => Boolean(u));
  return [...new Set(legacy)];
}

export async function nextImageSortOrder(characterId: string) {
  await ensureCharacterImagesTable();
  const rows = await db
    .select({ m: max(characterImages.sortOrder) })
    .from(characterImages)
    .where(eq(characterImages.characterId, characterId));
  return (rows[0]?.m ?? -1) + 1;
}

export async function characterExists(characterId: string) {
  const rows = await db
    .select({ id: characters.id })
    .from(characters)
    .where(eq(characters.id, characterId))
    .limit(1);
  return Boolean(rows[0]);
}
