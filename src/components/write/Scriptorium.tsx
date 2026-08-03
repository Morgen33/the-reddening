"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuillEditor } from "@/components/write/QuillEditor";
import { ConfessionRecorder } from "@/components/write/ConfessionRecorder";
import { RevenantForm } from "@/components/write/RevenantForm";
import { COPY, slugify } from "@/lib/copy";
import type { Character, Chapter } from "@/db/schema";

type Mode = "quill" | "confession" | "revenant";

export function Scriptorium({
  characters,
  initialChapter,
}: {
  characters: Character[];
  initialChapter?: Chapter | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("quill");
  const [chapterId] = useState(initialChapter?.id ?? null);
  const [title, setTitle] = useState(initialChapter?.title ?? "");
  const [turnedId, setTurnedId] = useState(initialChapter?.turnedId ?? "");
  const [sireId, setSireId] = useState(initialChapter?.sireId ?? "");
  const [year, setYear] = useState(
    initialChapter?.occurredYear != null ? String(initialChapter.occurredYear) : ""
  );
  const [fuzzy, setFuzzy] = useState(initialChapter?.occurredFuzzy ?? "");
  const [place, setPlace] = useState(initialChapter?.place ?? "");
  const [lat, setLat] = useState(
    initialChapter?.lat != null ? String(initialChapter.lat) : ""
  );
  const [lng, setLng] = useState(
    initialChapter?.lng != null ? String(initialChapter.lng) : ""
  );
  const [tags, setTags] = useState(
    Array.isArray(initialChapter?.tags) ? initialChapter.tags.join(", ") : ""
  );
  const [bodyHtml, setBodyHtml] = useState(initialChapter?.bodyHtml ?? "");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptRaw, setTranscriptRaw] = useState<string | null>(null);
  const [transcriptInked, setTranscriptInked] = useState<string | null>(null);
  const [durationS, setDurationS] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canonFacts = useMemo(() => {
    const turned = characters.find((c) => c.id === turnedId);
    const sire = characters.find((c) => c.id === sireId);
    const facts: string[] = [];
    if (turned?.turnedYear) facts.push(`Turned year on file: ${turned.turnedYear}`);
    if (turned?.turnedPlace) facts.push(`Place on file: ${turned.turnedPlace}`);
    if (turned?.sireId) {
      const listed = characters.find((c) => c.id === turned.sireId);
      if (listed) facts.push(`Listed sire: ${listed.name}`);
    }
    if (sire?.status) facts.push(`Sire status: ${sire.status}`);
    if (turned?.status) facts.push(`Subject status: ${turned.status}`);
    return facts;
  }, [characters, turnedId, sireId]);

  const save = async (status: "draft" | "sealed") => {
    if (!title.trim() || !turnedId) {
      setError("Name the title and who was turned. Sire may be left blank for origin.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: chapterId,
          title,
          slug: slugify(title),
          turnedId,
          sireId: sireId || null,
          occurredYear: year ? Number(year) : null,
          occurredFuzzy: fuzzy || null,
          place: place || null,
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          bodyHtml,
          authoringMode: mode === "confession" ? "confession" : mode === "revenant" ? "revenant" : "quill",
          status,
          recording: audioUrl
            ? {
                audioUrl,
                durationS,
                transcriptRaw,
                transcriptInked,
              }
            : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not save chapter");
      }
      const data = await res.json();
      router.push(status === "sealed" ? `/chapter/${data.slug}` : "/write");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const modes: { id: Mode; label: string }[] = [
    { id: "quill", label: "The Quill" },
    { id: "confession", label: "The Confession" },
    { id: "revenant", label: "The Revenant" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          The Scriptorium
        </p>
        <h2 className="font-display mb-6 text-4xl text-vellum">
          {chapterId ? "Revise this turning" : "Write a turning"}
        </h2>

        <div className="mb-8 flex flex-wrap gap-2">
          {modes.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={`font-ledger border px-3 py-1.5 text-xs tracking-[0.12em] uppercase transition-colors ${
                mode === m.id
                  ? "border-arterial bg-oxblood text-vellum"
                  : "border-gilt/40 text-vellum-dim hover:border-gilt hover:text-vellum"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Title
            </span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Who was turned
            </span>
            <select
              value={turnedId}
              onChange={(e) => setTurnedId(e.target.value)}
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            >
              <option value="">Select…</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Who turned them
            </span>
            <select
              value={sireId}
              onChange={(e) => setSireId(e.target.value)}
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            >
              <option value="">Origin unrecorded</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Year
            </span>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="font-ledger w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Fuzzy date
            </span>
            <input
              value={fuzzy}
              onChange={(e) => setFuzzy(e.target.value)}
              placeholder="a Tuesday in late autumn"
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Place
            </span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Tags
            </span>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="comma separated"
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Lat
            </span>
            <input
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="font-ledger w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
          <label>
            <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
              Lng
            </span>
            <input
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="font-ledger w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
          </label>
        </div>

        {mode === "confession" && (
          <div className="mb-6">
            <ConfessionRecorder
              onAccept={(r) => {
                setAudioUrl(r.audioUrl);
                setTranscriptRaw(r.transcriptRaw);
                setTranscriptInked(r.transcriptInked);
                setDurationS(r.durationS);
                const paras = r.text
                  .split(/\n+/)
                  .filter(Boolean)
                  .map((p) => `<p>${p}</p>`)
                  .join("");
                setBodyHtml(paras);
              }}
            />
          </div>
        )}

        {mode === "revenant" && (
          <div className="mb-6">
            <RevenantForm
              onDraft={(html, meta) => {
                setBodyHtml(html);
                if (!title) {
                  setTitle(`The Turning of ${meta.turned}`);
                }
                if (!year && meta.year) setYear(meta.year);
                if (!place && meta.city) setPlace(meta.city);
                if (!tags && meta.tags) setTags(meta.tags);
                const turned = characters.find(
                  (c) => c.name.toLowerCase() === meta.turned.toLowerCase()
                );
                const sire = characters.find(
                  (c) => c.name.toLowerCase() === meta.sire.toLowerCase()
                );
                if (turned) setTurnedId(turned.id);
                if (sire) setSireId(sire.id);
              }}
            />
          </div>
        )}

        <QuillEditor content={bodyHtml} onChange={setBodyHtml} />

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-seal bg-transparent"
            disabled={saving}
            onClick={() => save("draft")}
          >
            {COPY.keepDraft}
          </button>
          <button
            type="button"
            className="btn-seal"
            disabled={saving}
            onClick={() => save("sealed")}
          >
            {COPY.sealChapter}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-arterial">{error}</p>}
      </div>

      <aside className="h-fit border border-gilt/30 bg-ash/60 p-5 lg:sticky lg:top-8">
        <p className="font-ledger mb-3 text-xs tracking-[0.18em] text-gilt uppercase">
          Canon already set
        </p>
        {canonFacts.length === 0 ? (
          <p className="text-sm text-vellum-dim">{COPY.writeInvite}</p>
        ) : (
          <ul className="space-y-2 text-sm text-vellum-dim">
            {canonFacts.map((f) => (
              <li key={f} className="border-l border-oxblood pl-3">
                {f}
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
