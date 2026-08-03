import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { chapters, recordings, characters } from "@/db/schema";
import { requireAuthor } from "@/lib/auth";
import { getNextNumeral } from "@/lib/chapters";
import { slugify } from "@/lib/copy";

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
      lat,
      lng,
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
      const nextStatus = status === "sealed" ? "sealed" : status === "draft" ? "draft" : current.status;

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
          lat: lat ?? null,
          lng: lng ?? null,
          bodyHtml: bodyHtml ?? "",
          authoringMode: authoringMode ?? current.authoringMode,
          status: nextStatus,
          tags: tags ?? current.tags,
          sealedAt:
            nextStatus === "sealed"
              ? current.sealedAt ?? now
              : null,
        })
        .where(eq(chapters.id, existingId));

      if (nextStatus === "sealed" && sireId) {
        const patch: {
          status: "fledgling" | "elder";
          sireId: string;
          turnedYear?: number;
          turnedPlace?: string;
          turnedLat?: number;
          turnedLng?: number;
        } = { status: "elder", sireId };
        if (occurredYear != null) patch.turnedYear = occurredYear;
        if (place) patch.turnedPlace = place;
        if (lat != null) patch.turnedLat = lat;
        if (lng != null) patch.turnedLng = lng;
        await db.update(characters).set(patch).where(eq(characters.id, turnedId));
      }

      return NextResponse.json({ id: existingId, slug, numeral: current.numeral });
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
      lat: lat ?? null,
      lng: lng ?? null,
      bodyHtml: bodyHtml ?? "",
      body: { type: "doc" },
      authoringMode: authoringMode ?? "quill",
      status: status === "sealed" ? "sealed" : "draft",
      tags: tags ?? [],
      sealedAt: status === "sealed" ? now : null,
    });

    if (status === "sealed" && sireId) {
      const patch: {
        status: "fledgling";
        sireId: string;
        turnedYear?: number;
        turnedPlace?: string;
        turnedLat?: number;
        turnedLng?: number;
      } = { status: "fledgling", sireId };
      if (occurredYear != null) patch.turnedYear = occurredYear;
      if (place) patch.turnedPlace = place;
      if (lat != null) patch.turnedLat = lat;
      if (lng != null) patch.turnedLng = lng;
      await db.update(characters).set(patch).where(eq(characters.id, turnedId));
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
