import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { nanoid } from "nanoid";
import { requireAuthor } from "@/lib/auth";

export const runtime = "nodejs";

async function uploadAudio(file: File) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`recordings/${nanoid()}-${file.name}`, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    return blob.url;
  }
  // Local fallback: data URL stored temporarily is too large; use a stub path
  // and keep transcript-only flow when Blob isn't configured.
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${file.type};base64,${base64.slice(0, 0)}local://${nanoid()}.webm`;
}

async function transcribe(file: File): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    return "[Transcript placeholder — set OPENAI_API_KEY for Whisper. She said the turning happened under sodium light, and that Morgen nodded before anything else.]";
  }
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return transcription.text;
}

async function inkTranscript(raw: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return raw
      .replace(/\b(um|uh|like)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Preserve the narrator's idiom, rhythm, and word choice. Remove only disfluency and false starts. Do not elevate the diction. Return only the cleaned prose.\n\nRAW:\n${raw}`,
      },
    ],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : raw;
}

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await req.formData();
    const audio = form.get("audio");
    const durationS = Number(form.get("durationS") || 0);
    if (!(audio instanceof File)) {
      return NextResponse.json({ error: "Missing audio" }, { status: 400 });
    }

    let audioUrl: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`recordings/${nanoid()}-${audio.name}`, audio, {
        access: "public",
      });
      audioUrl = blob.url;
    } else {
      // Without Blob, still allow transcript flow; audio URL empty means no horn
      audioUrl = "";
      void uploadAudio;
    }

    const transcriptRaw = await transcribe(audio);
    const transcriptInked = await inkTranscript(transcriptRaw);

    return NextResponse.json({
      audioUrl,
      transcriptRaw,
      transcriptInked,
      durationS,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
