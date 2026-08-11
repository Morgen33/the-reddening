import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { nanoid } from "nanoid";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const url = process.env.TURSO_DATABASE_URL ?? "file:local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient(authToken ? { url, authToken } : { url });
const db = drizzle(client, { schema });

async function migrate() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      handle TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      epithet TEXT,
      mortal_name TEXT,
      bio TEXT,
      status TEXT NOT NULL DEFAULT 'mortal',
      born_year INTEGER,
      turned_year INTEGER,
      turned_place TEXT,
      turned_lat REAL,
      turned_lng REAL,
      sire_id TEXT,
      portrait_mortal_url TEXT,
      portrait_vampire_url TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS bonds (
      id TEXT PRIMARY KEY,
      from_id TEXT NOT NULL REFERENCES characters(id),
      to_id TEXT NOT NULL REFERENCES characters(id),
      kind TEXT NOT NULL,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      numeral INTEGER NOT NULL,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      turned_id TEXT REFERENCES characters(id),
      sire_id TEXT REFERENCES characters(id),
      occurred_year INTEGER,
      occurred_fuzzy TEXT,
      place TEXT,
      lat REAL,
      lng REAL,
      body TEXT,
      body_html TEXT,
      authoring_mode TEXT DEFAULT 'quill',
      status TEXT NOT NULL DEFAULT 'draft',
      cover_url TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (current_timestamp),
      sealed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chapter_witnesses (
      chapter_id TEXT NOT NULL REFERENCES chapters(id),
      character_id TEXT NOT NULL REFERENCES characters(id),
      PRIMARY KEY (chapter_id, character_id)
    );

    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id),
      audio_url TEXT NOT NULL,
      duration_s INTEGER,
      transcript_raw TEXT,
      transcript_inked TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS marginalia (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL REFERENCES chapters(id),
      author_name TEXT NOT NULL,
      body TEXT NOT NULL,
      anchor TEXT,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS character_images (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL REFERENCES characters(id),
      url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );

    CREATE TABLE IF NOT EXISTS portrait_cache (
      id TEXT PRIMARY KEY,
      image_hash TEXT NOT NULL,
      preset TEXT NOT NULL DEFAULT 'salon',
      result_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (current_timestamp)
    );
  `);
}

async function wipe() {
  await client.executeMultiple(`
    DELETE FROM chapter_witnesses;
    DELETE FROM recordings;
    DELETE FROM marginalia;
    DELETE FROM portrait_cache;
    DELETE FROM character_images;
    DELETE FROM chapters;
    DELETE FROM bonds;
    DELETE FROM characters;
  `);
}

async function seed() {
  await migrate();

  const force = process.argv.includes("--force");
  const existing = await db.select().from(schema.characters).limit(1);
  if (existing.length > 0 && !force) {
    console.log("Already seeded. Pass --force to wipe and reseed.");
    return;
  }
  if (force) {
    await wipe();
    console.log("Wiped existing data.");
  }

  const ids = {
    veronika: nanoid(),
    morgen: nanoid(),
    toph: nanoid(),
    pat: nanoid(),
    bee: nanoid(),
    pengwine: nanoid(),
  };

  await db.insert(schema.characters).values([
    {
      id: ids.veronika,
      handle: "veronika",
      name: "Veronika",
      epithet: "First of the Thread",
      mortalName: "Veronika",
      status: "elder",
      bornYear: 990,
      turnedYear: 1010,
      turnedPlace: "Bohemia",
      turnedLat: 50.0755,
      turnedLng: 14.4378,
      bio: "Artist before she was immortal. The bloodline begins with pigment on her hands and a stranger's mouth at her throat.",
    },
    {
      id: ids.morgen,
      handle: "morgen",
      name: "Morgen",
      epithet: "the Reckless Half",
      mortalName: "Morgen",
      status: "elder",
      bornYear: 1771,
      turnedYear: 1792,
      turnedPlace: "New York",
      turnedLat: 40.7128,
      turnedLng: -74.006,
      sireId: ids.veronika,
      bio: "Lover to Toph. Would bet a century on a dare and still call it a Tuesday.",
    },
    {
      id: ids.toph,
      handle: "toph",
      name: "Toph",
      epithet: "the Other Half of the Trouble",
      mortalName: "Toph",
      status: "elder",
      bornYear: 1773,
      turnedYear: 1792,
      turnedPlace: "New York",
      turnedLat: 40.758,
      turnedLng: -73.9855,
      sireId: ids.veronika,
      bio: "Lover to Morgen. The gold thread. If Morgen lights the fuse, Toph is already running toward the bang.",
    },
    {
      id: ids.pat,
      handle: "pat",
      name: "Pat",
      epithet: "Still Warm",
      mortalName: "Pat",
      status: "mortal",
      bornYear: 1995,
      bio: "Not yet claimed. The chronicle leaves room.",
    },
    {
      id: ids.bee,
      handle: "bee",
      name: "Bee",
      epithet: null,
      mortalName: "Bee",
      status: "mortal",
      bornYear: null,
      bio: null,
    },
    {
      id: ids.pengwine,
      handle: "pengwine",
      name: "Pengwine",
      epithet: "the Soft-Eyed",
      mortalName: "Pengwine",
      status: "mortal",
      bornYear: 2000,
      bio: "Watches from the gallery. Origin unrecorded — for now.",
    },
  ]);

  await db.insert(schema.bonds).values([
    {
      id: nanoid(),
      fromId: ids.morgen,
      toId: ids.toph,
      kind: "lover",
      note: "Harbor-made. Still finishing each other's worst ideas.",
    },
    {
      id: nanoid(),
      fromId: ids.veronika,
      toId: ids.morgen,
      kind: "sire",
      note: "Turned them both before dawn — one night, two disasters, one bloodline.",
    },
    {
      id: nanoid(),
      fromId: ids.veronika,
      toId: ids.toph,
      kind: "sire",
      note: "Turned them both before dawn — one night, two disasters, one bloodline.",
    },
  ]);

  const veronikaBody = `<p>In the year of our Lord one thousand and ten, Bohemia held its breath through a long spring. The Vltava moved like dark glass. Veronika was twenty — an artist with ochre under her nails and a hunger for beauty that outran sense. She painted saints for churches that paid in bread, and faces for no one but herself, late, by a single lamp, until the pigment looked like living blood.</p>
<p>He came on a night with no moon. Tall. Clean as a drawn line. He moved the way wind moves over stone — no wasted gesture, nothing that dragged. Handsome in a way that felt almost designed: cheekbones like architecture, a mouth made for stillness, eyes that did not hurry. <em>Aerodynamic</em>, she would have said, centuries later, laughing into a Space — as if God had sanded him down for speed through the dark.</p>
<p>He did not give his name. He stood in her doorway and looked at the wet panel on her easel — a woman's throat, half-finished, gilded at the collarbone — and said, in the soft Czech of the river towns, that she had nearly gotten it right. She asked him what was missing. He stepped close enough that she smelled cold air and something sweeter, and answered: <em>the pulse</em>.</p>
<p>What happened then was not a bargain so much as a consecration. He tipped her chin with two fingers. He kissed the place she had been trying to paint. When his teeth broke the skin it felt — she would insist on this, always — like the moment a brush finally finds the true color. Pain, yes. Then heat. Then a widening, as if the night itself had opened a door inside her ribs and asked her to walk through.</p>
<p>She drank when he offered his wrist. Pigment and blood mixed on her hands. Outside, the river kept its old silence. By dawn he was gone — origin unrecorded, a handsome absence — and Veronika stood in the grey light with a stillness where her heartbeat had been and a hunger that felt like wanting to paint the whole world before it faded.</p>
<p>She became <em>first</em>. Every thread in this chronicle runs back to that studio, that Czech spring, that mouth. The bloodline begins in beauty. It has never apologized for it.</p>`;

  const coupleBody = `<p>New York in 1792 is a city still inventing itself — muddy streets, tavern light, and ambition thick enough to chew. Morgen and Toph arrived already wearing each other's worst impulses — young, insolent, beautiful in the way that makes priests invent new sins.</p>
<p>They had stolen a ferry skiff (twice), crashed a merchant's ball (once, spectacularly), and bet a diamond earring against a stranger's claim that love could not outrun a midnight tide on the Hudson. Spoiler: they swam. The earring did not.</p>
<p>Veronika watched from a balcony with a glass of something that was not wine and thought: <em>these two will either invent a new kind of joy or burn a parish down trying.</em> She decided the bloodline could use both.</p>
<p>She found them on a rooftop at three in the morning, sharing a bottle and a plan involving fireworks, a harbor barge, and absolutely no exit strategy. Morgen offered her a drink. Toph offered her a dare. Veronika offered them forever — on the condition they never become boring, and that if one of them was going to be reckless, the other had to match it.</p>
<p>They said yes in the same breath. Of course they did.</p>
<p>She turned them together — mouths and wrists and laughter that turned sharp, then sweet, then immortal. Morgen first by half a minute, Toph pulling them close so neither would cross the threshold alone. When the sun threatened the harbor they were still kissing with bloody mouths, already arguing about what to steal next.</p>
<p>Veronika left before dawn, humming. The bloodline had its first couple: gold thread between them, arterial mischief everywhere else. Centuries later they are still finishing each other's catastrophes.</p>`;

  await db.insert(schema.chapters).values([
    {
      id: nanoid(),
      numeral: 1,
      title: "Pigment and the Night Air",
      slug: "pigment-and-the-night-air",
      turnedId: ids.veronika,
      sireId: null,
      occurredYear: 1010,
      occurredFuzzy: "a moonless spring night beside the Vltava",
      place: "Bohemia",
      lat: 50.0755,
      lng: 14.4378,
      bodyHtml: veronikaBody,
      body: { type: "doc", content: [] },
      authoringMode: "quill",
      status: "sealed",
      tags: ["origin", "veronika", "bohemia", "bloodline", "artist"],
      sealedAt: new Date().toISOString(),
    },
    {
      id: nanoid(),
      numeral: 2,
      title: "Two Mouths, One Night in New York",
      slug: "two-mouths-one-night-in-new-york",
      turnedId: ids.morgen,
      sireId: ids.veronika,
      occurredYear: 1792,
      occurredFuzzy: "a harbor night — taverns, tide, no exit strategy",
      place: "New York",
      lat: 40.7128,
      lng: -74.006,
      bodyHtml: coupleBody,
      body: { type: "doc", content: [] },
      authoringMode: "quill",
      status: "sealed",
      tags: ["morgen", "toph", "new-york", "lovers", "harbor"],
      sealedAt: new Date().toISOString(),
    },
  ]);

  // Witness: Toph was turned in the same chapter as Morgen
  const coupleChapter = await db
    .select()
    .from(schema.chapters)
    .where(eq(schema.chapters.slug, "two-mouths-one-night-in-new-york"))
    .limit(1);
  if (coupleChapter[0]) {
    await db.insert(schema.chapterWitnesses).values({
      chapterId: coupleChapter[0].id,
      characterId: ids.toph,
    });
  }

  console.log("Seeded: Veronika origin + Morgen/Toph New York turning. Bee left blank.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
