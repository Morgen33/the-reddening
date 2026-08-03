import { relations, sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const characters = sqliteTable("characters", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  name: text("name").notNull(),
  epithet: text("epithet"),
  mortalName: text("mortal_name"),
  bio: text("bio"),
  status: text("status", {
    enum: ["mortal", "fledgling", "elder", "ash"],
  })
    .notNull()
    .default("mortal"),
  bornYear: integer("born_year"),
  turnedYear: integer("turned_year"),
  turnedPlace: text("turned_place"),
  turnedLat: real("turned_lat"),
  turnedLng: real("turned_lng"),
  sireId: text("sire_id"),
  portraitMortalUrl: text("portrait_mortal_url"),
  portraitVampireUrl: text("portrait_vampire_url"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const bonds = sqliteTable("bonds", {
  id: text("id").primaryKey(),
  fromId: text("from_id")
    .notNull()
    .references(() => characters.id),
  toId: text("to_id")
    .notNull()
    .references(() => characters.id),
  kind: text("kind", {
    enum: ["sire", "progeny", "lover", "rival", "thrall", "blood_oath"],
  }).notNull(),
  note: text("note"),
});

export const chapters = sqliteTable("chapters", {
  id: text("id").primaryKey(),
  numeral: integer("numeral").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  turnedId: text("turned_id").references(() => characters.id),
  sireId: text("sire_id").references(() => characters.id),
  occurredYear: integer("occurred_year"),
  occurredFuzzy: text("occurred_fuzzy"),
  place: text("place"),
  lat: real("lat"),
  lng: real("lng"),
  body: text("body", { mode: "json" }).$type<Record<string, unknown>>(),
  bodyHtml: text("body_html"),
  authoringMode: text("authoring_mode", {
    enum: ["quill", "revenant", "confession"],
  }).default("quill"),
  status: text("status", {
    enum: ["draft", "sealed"],
  })
    .notNull()
    .default("draft"),
  coverUrl: text("cover_url"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  sealedAt: text("sealed_at"),
});

export const chapterWitnesses = sqliteTable(
  "chapter_witnesses",
  {
    chapterId: text("chapter_id")
      .notNull()
      .references(() => chapters.id),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id),
  },
  (t) => [primaryKey({ columns: [t.chapterId, t.characterId] })]
);

export const recordings = sqliteTable("recordings", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id),
  audioUrl: text("audio_url").notNull(),
  durationS: integer("duration_s"),
  transcriptRaw: text("transcript_raw"),
  transcriptInked: text("transcript_inked"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const marginalia = sqliteTable("marginalia", {
  id: text("id").primaryKey(),
  chapterId: text("chapter_id")
    .notNull()
    .references(() => chapters.id),
  authorName: text("author_name").notNull(),
  body: text("body").notNull(),
  anchor: text("anchor"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const portraitCache = sqliteTable("portrait_cache", {
  id: text("id").primaryKey(),
  imageHash: text("image_hash").notNull(),
  preset: text("preset").notNull().default("salon"),
  resultUrl: text("result_url").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const charactersRelations = relations(characters, ({ one, many }) => ({
  sire: one(characters, {
    fields: [characters.sireId],
    references: [characters.id],
    relationName: "sire_line",
  }),
  progeny: many(characters, { relationName: "sire_line" }),
  bondsFrom: many(bonds, { relationName: "from_bonds" }),
  bondsTo: many(bonds, { relationName: "to_bonds" }),
}));

export const bondsRelations = relations(bonds, ({ one }) => ({
  from: one(characters, {
    fields: [bonds.fromId],
    references: [characters.id],
    relationName: "from_bonds",
  }),
  to: one(characters, {
    fields: [bonds.toId],
    references: [characters.id],
    relationName: "to_bonds",
  }),
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  turned: one(characters, {
    fields: [chapters.turnedId],
    references: [characters.id],
  }),
  sire: one(characters, {
    fields: [chapters.sireId],
    references: [characters.id],
  }),
  witnesses: many(chapterWitnesses),
  recordings: many(recordings),
}));

export type Character = typeof characters.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Bond = typeof bonds.$inferSelect;
export type Recording = typeof recordings.$inferSelect;
