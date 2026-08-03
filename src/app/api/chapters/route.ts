import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { chapters, recordings, characters } from "@/db/schema";
import { requireAuthor } from "@/lib/auth";
import { getNextNumeral } from "@/lib/chapters";
import { slugify } from "@/lib/copy";
import { resolveCoords } from "@/lib/geocode";

async function syncTurnedCharacter(opts: {
  turnedId: string;
  sireId: string | null;
  occurredYear: number | null;
  place: string | null;
  lat: number | null;
  lng: number | null;
  isUpdate: boolean;
}) {
  const patch: {
    status?: "fledgling" | "elder";
    sireId?: string | null;
    turnedYear?: number;
    turnedPlace?: string;
    turnedLat?: number;
    turnedLng?: number;
  } = {};

  if (opts.sireId) {
    patch.sireId = opts.sireId;
    patch.status = opts.isUpdate ? "elder" : "fledgling";
  }
  if (opts.occurredYear != null) patch.turnedYear = opts.occurredYear;
  if (opts.place) patch.turnedPlace = opts.place;
  if (opts.lat != null) patch.turnedLat = opts.lat;
  if (opts.lng != null) patch.turnedLng = opts.lng;

  if (Object.keys(patch).length === 0) return;
  await db.update(characters).set(patch).where(eq(characters.id, opts.turnedId));
}

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id: existingId,
      title,
      turnedId,
      sireId,
      occurredYear,
      occurredFuzzy,
      place,
      tags,
      bodyHtml,
      authoringMode,
      status,
      recording,
    } = body;

    if (!title || !turnedId) {
      return NextResponse.json(
        { error: "Title and who was turned are required." },
        { status: 400 }
      );
    }

    const rawLat =
      body.lat != null && body.lat !== "" ? Number(body.lat) : null;
    const rawLng =
      body.lng != null && body.lng !== "" ? Number(body.lng) : null;
    const coords = await resolveCoords({
      place: place || null,
      lat: rawLat != null && !Number.isNaN(rawLat) ? rawLat : null,
      lng: rawLng != null && !Number.isNaN(rawLng) ? rawLng : null,
    });
    const lat = coords.lat;
    const lng = coords.lng;

    // Update existing chapter
    if (existingId) {
      const rows = await db
        .select()
        .from(chapters)
        .where(eq(chapters.id, existingId))
        .limit(1);
      const current = rows[0];
      if (!current) {
        return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
      }

      let slug = current.slug;
      if (title !== current.title) {
        slug = slugify(title);
        const clash = await db
          .select()
          .from(chapters)
          .where(eq(chapters.slug, slug))
          .limit(1);
        if (clash.length && clash[0].id !== existingId) {
          slug = `${slug}-${nanoid(4)}`;
        }
      }

      const now = new Date().toISOString();
      const nextStatus =
        status === "sealed"
          ? "sealed"
          : status === "draft"
            ? "draft"
            : current.status;

      await db
        .update(chapters)
        .set({
          title,
          slug,
          turnedId,
          sireId: sireId ?? null,
          occurredYear: occurredYear ?? null,
          occurredFuzzy: occurredFuzzy ?? null,
          place: place ?? null,
          lat,
          lng,
          bodyHtml: bodyHtml ?? "",
          authoringMode: authoringMode ?? current.authoringMode,
          status: nextStatus,
          tags: tags ?? current.tags,
          sealedAt:
            nextStatus === "sealed" ? (current.sealedAt ?? now) : null,
        })
        .where(eq(chapters.id, existingId));

      if (nextStatus === "sealed") {
        await syncTurnedCharacter({
          turnedId,
          sireId: sireId ?? null,
          occurredYear: occurredYear ?? null,
          place: place ?? null,
          lat,
          lng,
          isUpdate: true,
        });
      }

      return NextResponse.json({
        id: existingId,
        slug,
        numeral: current.numeral,
      });
    }

    let slug = body.slug || slugify(title);
    const existing = await db
      .select()
      .from(chapters)
      .where(eq(chapters.slug, slug))
      .limit(1);
    if (existing.length) {
      slug = `${slug}-${nanoid(4)}`;
    }

    const id = nanoid();
    const numeral = await getNextNumeral();
    const now = new Date().toISOString();
    const sealed = status === "sealed";

    await db.insert(chapters).values({
      id,
      numeral,
      title,
      slug,
      turnedId,
      sireId: sireId ?? null,
      occurredYear: occurredYear ?? null,
      occurredFuzzy: occurredFuzzy ?? null,
      place: place ?? null,
      lat,
      lng,
      bodyHtml: bodyHtml ?? "",
      body: { type: "doc" },
      authoringMode: authoringMode ?? "quill",
      status: sealed ? "sealed" : "draft",
      tags: tags ?? [],
      sealedAt: sealed ? now : null,
    });

    if (sealed) {
      await syncTurnedCharacter({
        turnedId,
        sireId: sireId ?? null,
        occurredYear: occurredYear ?? null,
        place: place ?? null,
        lat,
        lng,
        isUpdate: false,
      });
    }

    if (recording?.audioUrl) {
      await db.insert(recordings).values({
        id: nanoid(),
        chapterId: id,
        audioUrl: recording.audioUrl,
        durationS: recording.durationS ?? null,
        transcriptRaw: recording.transcriptRaw ?? null,
        transcriptInked: recording.transcriptInked ?? null,
      });
    }

    return NextResponse.json({ id, slug, numeral });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Save failed" },
      { status: 500 }
    );
  }
}
