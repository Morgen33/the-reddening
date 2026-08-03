import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { requireAuthor } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await requireAuthor();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { turned, sire, year, city, mood, detail, tags, differently } = body;

  if (!turned || !sire) {
    return NextResponse.json(
      { error: "Need who was turned and who turned them." },
      { status: 400 }
    );
  }

  const structureNote = differently
    ? "Use a different narrative structure than a linear recounting — begin in media res, or braid two timelines, or end where a usual draft would begin."
    : "Use a clear chronological telling with a strong opening image.";

  if (!process.env.ANTHROPIC_API_KEY) {
    const html = `<p>In ${city || "an unnamed city"}, in ${year || "a year unrecorded"}, ${sire} made ${turned}. ${detail || "The detail she insisted on has not yet been spoken."}</p><p>The mood was ${mood || "unquiet"}. Tags whispered at the margins: ${tags || "none yet"}.</p><p>${structureNote}</p>`;
    return NextResponse.json({ html });
  }

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2500,
      messages: [
        {
          role: "user",
          content: `You are drafting a chapter for The Reddening, a gothic chronicle of how friends became vampires. Voice: intimate, specific, literary but not purple. Write 4–6 short HTML paragraphs wrapped in <p> tags only. No title. No markdown.

Turned: ${turned}
Sire: ${sire}
Year: ${year || "unknown"}
City: ${city || "unknown"}
Mood: ${mood || "unspecified"}
One true detail that must appear: ${detail || "none given"}
Tags: ${tags || "none"}

${structureNote}`,
        },
      ],
    });
    const block = msg.content.find((b) => b.type === "text");
    const html =
      block && block.type === "text"
        ? block.text
        : "<p>The Revenant returned empty-handed.</p>";
    return NextResponse.json({ html });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Draft failed" },
      { status: 500 }
    );
  }
}
