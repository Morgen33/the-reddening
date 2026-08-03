import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { characters, bonds } from "@/db/schema";
import { requireAuthor } from "@/lib/auth";
import { slugify } from "@/lib/copy";

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "A name is required." }, { status: 400 });
    }

    let handle = String(body.handle || slugify(name)).trim().toLowerCase();
    if (!handle) handle = `soul-${nanoid(6)}`;

    const existing = await db
      .select()
      .from(characters)
      .where(eq(characters.handle, handle))
      .limit(1);
    if (existing.length) {
      handle = `${handle}-${nanoid(4)}`;
    }

    const id = nanoid();
    await db.insert(characters).values({
      id,
      handle,
      name,
      epithet: body.epithet?.trim() || null,
      mortalName: body.mortalName?.trim() || name,
      bio: body.bio?.trim() || null,
      status: body.status || "mortal",
      bornYear: body.bornYear ? Number(body.bornYear) : null,
      turnedYear: body.turnedYear ? Number(body.turnedYear) : null,
      turnedPlace: body.turnedPlace?.trim() || null,
      turnedLat: body.turnedLat != null && body.turnedLat !== "" ? Number(body.turnedLat) : null,
      turnedLng: body.turnedLng != null && body.turnedLng !== "" ? Number(body.turnedLng) : null,
      sireId: body.sireId || null,
    });

    if (body.sireId && (body.status === "fledgling" || body.status === "elder")) {
      await db.insert(bonds).values({
        id: nanoid(),
        fromId: body.sireId,
        toId: id,
        kind: "sire",
      });
    }

    if (body.loverId) {
      await db.insert(bonds).values({
        id: nanoid(),
        fromId: id,
        toId: body.loverId,
        kind: "lover",
        note: body.loverNote?.trim() || null,
      });
    }

    return NextResponse.json({ id, handle });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not add character" },
      { status: 500 }
    );
  }
}
