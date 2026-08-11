import { NextResponse } from "next/server";
import { getSealedChapters } from "@/lib/chapters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEDICATION = {
  title: "For Veronika",
  pages: [
    `Happy Birthday to my bestest friend, Veronika.

I wanted to make you something that was more than just a regular birthday present. I wanted to give you a place where all the crazy, beautiful stories inside your head could actually live and grow into an entire world of their own.

I absolutely love listening to you take people we know from Spaces and tell us how they became vampires, who bit who, where it happened, who they loved, and how all of our lives have somehow been connected for hundreds of years. I seriously don't know how your mind comes up with this shit, but it is one of my favorite things about you. You don't just tell stories. You make us believe we have all known each other forever.

But as beautiful as your stories are, nothing compares to the person telling them.

I honestly believe that you are the most gorgeous soul on this Earth. You love people so deeply, you make everyone feel like they matter, and there is just something so rare and special about you. You bring magic into our lives without even trying. You have this beautiful way of turning our weird little group of people into a family with a history that goes back centuries.

So this website is my way of giving your imagination a home. A place where your vampire world can live, where every character and story can connect, and where you can keep creating whatever the hell your beautiful mind comes up with next.

I am so grateful that life gave me you. You are my bestest friend, and I truly don't know what I would do without you. And if we really have been finding each other throughout all these different centuries and lifetimes, then I hope I find you in every single one after this too.

Happy Birthday, my beautiful Veronika.

I love you more than I could ever properly put into words.

— Morgen`,
  ],
};

function htmlToPlainText(html: string): string {
  return html
    .replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function GET() {
  try {
    const sealed = await getSealedChapters();
    const chapters = sealed
      .map((ch) => {
        const text = htmlToPlainText(ch.bodyHtml || "");
        if (!text) return null;
        return {
          title: ch.title,
          pages: [text],
        };
      })
      .filter((s): s is { title: string; pages: string[] } => s != null);

    return NextResponse.json({
      stories: [DEDICATION, ...chapters],
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ stories: [DEDICATION] });
  }
}
