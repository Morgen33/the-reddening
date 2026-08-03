import { getAllCharacters } from "@/lib/characters";
import { getChapterBySlug } from "@/lib/chapters";
import { Scriptorium } from "@/components/write/Scriptorium";
import { RedThread } from "@/components/atmosphere/RedThread";
import { isAuthor } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function WritePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const author = await isAuthor();
  const { edit } = await searchParams;
  let characters: Awaited<ReturnType<typeof getAllCharacters>> = [];
  let initialChapter = null;

  try {
    characters = await getAllCharacters();
    if (edit) {
      initialChapter = await getChapterBySlug(edit, true);
    }
  } catch {
    // unseeded
  }

  if (!author && process.env.CLERK_SECRET_KEY && process.env.DEV_BYPASS_AUTH !== "true") {
    return (
      <div className="px-6 py-24 text-center">
        <p className="font-display text-3xl text-vellum">The Scriptorium is locked.</p>
        <p className="mt-3 text-vellum-dim">Only Veronika may write here.</p>
        <Link href="/sign-in" className="btn-seal mt-8 inline-flex">
          Enter as Veronika
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <RedThread variant="spine" />
      <Scriptorium characters={characters} initialChapter={initialChapter} />
    </div>
  );
}
