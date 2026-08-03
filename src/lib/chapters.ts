import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, characters, recordings } from "@/db/schema";

export async function getSealedChapters() {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.status, "sealed"))
    .orderBy(asc(chapters.numeral));
}

export async function getAllChaptersForAuthor() {
  return db.select().from(chapters).orderBy(desc(chapters.createdAt));
}

export async function getChapterBySlug(slug: string, includeDraft = false) {
  const rows = await db
    .select()
    .from(chapters)
    .where(eq(chapters.slug, slug))
    .limit(1);
  const chapter = rows[0];
  if (!chapter) return null;
  if (!includeDraft && chapter.status !== "sealed") return null;
  return chapter;
}

export async function getChapterRecording(chapterId: string) {
  const rows = await db
    .select()
    .from(recordings)
    .where(eq(recordings.chapterId, chapterId))
    .orderBy(desc(recordings.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCharacterMap() {
  const all = await db.select().from(characters);
  return Object.fromEntries(all.map((c) => [c.id, c]));
}

export async function getNextNumeral() {
  const rows = await db
    .select()
    .from(chapters)
    .orderBy(desc(chapters.numeral))
    .limit(1);
  return (rows[0]?.numeral ?? 0) + 1;
}

export async function getChapterWithNames(slug: string, includeDraft = false) {
  const chapter = await getChapterBySlug(slug, includeDraft);
  if (!chapter) return null;
  const map = await getCharacterMap();
  const recording = await getChapterRecording(chapter.id);
  return {
    chapter,
    turned: chapter.turnedId ? map[chapter.turnedId] : null,
    sire: chapter.sireId ? map[chapter.sireId] : null,
    recording,
  };
}

export async function getChaptersForCharacter(characterId: string) {
  return db
    .select()
    .from(chapters)
    .where(
      and(eq(chapters.status, "sealed"), eq(chapters.turnedId, characterId))
    )
    .orderBy(asc(chapters.occurredYear));
}
