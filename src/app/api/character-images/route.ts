import { put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { characterImages } from "@/db/schema";
import { requireAuthor } from "@/lib/auth";
import {
  characterExists,
  ensureCharacterImagesTable,
  nextImageSortOrder,
} from "@/lib/character-images";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureCharacterImagesTable();
    const form = await req.formData();
    const characterId = String(form.get("characterId") || "");
    if (!characterId) {
      return NextResponse.json(
        { error: "characterId required" },
        { status: 400 }
      );
    }
    if (!(await characterExists(characterId))) {
      return NextResponse.json(
        { error: "Character not found" },
        { status: 404 }
      );
    }

    const files = form
      .getAll("images")
      .concat(form.getAll("image"))
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one image required" },
        { status: 400 }
      );
    }

    let sortOrder = await nextImageSortOrder(characterId);
    const uploaded: { id: string; url: string }[] = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;

      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = file.name.split(".").pop() || "jpg";
      let url: string;

      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const stored = await put(
          `portraits/${characterId}-${nanoid(8)}.${ext}`,
          buffer,
          { access: "public", contentType: file.type || "image/jpeg" }
        );
        url = stored.url;
      } else {
        url = `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
      }

      const id = nanoid();
      await db.insert(characterImages).values({
        id,
        characterId,
        url,
        sortOrder,
      });
      uploaded.push({ id, url });
      sortOrder += 1;
    }

    if (uploaded.length === 0) {
      return NextResponse.json(
        { error: "No valid images uploaded" },
        { status: 400 }
      );
    }

    return NextResponse.json({ images: uploaded });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureCharacterImagesTable();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    await db.delete(characterImages).where(eq(characterImages.id, id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
