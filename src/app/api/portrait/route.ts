import { createHash } from "crypto";
import { put } from "@vercel/blob";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { characters, portraitCache } from "@/db/schema";
import { requireAuthor } from "@/lib/auth";
import {
  generateVampirePortrait,
  hasPortraitProvider,
  PortraitConfigError,
} from "@/lib/portrait";

export const runtime = "nodejs";
export const maxDuration = 60;

const PRESET = "photoreal";

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPortraitProvider()) {
    return NextResponse.json(
      {
        error:
          "Turning model not configured. Set FAL_KEY (preferred), HF_TOKEN (free Kontext-dev), or REPLICATE_API_TOKEN in .env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const form = await req.formData();
    const file = form.get("image");
    const characterId = String(form.get("characterId") || "");
    const regenerate = form.get("regenerate") === "1";

    if (!(file instanceof File) || !characterId) {
      return NextResponse.json(
        { error: "Image and characterId required" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash("sha256").update(buffer).digest("hex");

    let mortalUrl = "";
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const mortal = await put(
        `portraits/mortal-${characterId}-${nanoid(6)}.${file.name.split(".").pop() || "jpg"}`,
        buffer,
        { access: "public", contentType: file.type }
      );
      mortalUrl = mortal.url;
    } else {
      mortalUrl = `data:${file.type};base64,${buffer.toString("base64")}`;
    }

    if (!regenerate) {
      const cached = await db
        .select()
        .from(portraitCache)
        .where(
          and(
            eq(portraitCache.imageHash, imageHash),
            eq(portraitCache.preset, PRESET)
          )
        )
        .limit(1);
      if (cached[0]) {
        await db
          .update(characters)
          .set({
            portraitMortalUrl: mortalUrl,
            portraitVampireUrl: cached[0].resultUrl,
          })
          .where(eq(characters.id, characterId));
        return NextResponse.json({
          mortalUrl,
          vampireUrl: cached[0].resultUrl,
          cached: true,
        });
      }
    }

    const vampireUrl = await generateVampirePortrait({
      imageBuffer: buffer,
      contentType: file.type || "image/jpeg",
      mortalUrl,
    });

    await db.insert(portraitCache).values({
      id: nanoid(),
      imageHash,
      preset: PRESET,
      resultUrl: vampireUrl,
    });

    await db
      .update(characters)
      .set({
        portraitMortalUrl: mortalUrl,
        portraitVampireUrl: vampireUrl,
      })
      .where(eq(characters.id, characterId));

    return NextResponse.json({
      mortalUrl,
      vampireUrl,
      cached: false,
    });
  } catch (err) {
    console.error(err);
    const status = err instanceof PortraitConfigError ? 503 : 500;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Portrait failed" },
      { status }
    );
  }
}
