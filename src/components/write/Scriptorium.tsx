"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { QuillEditor } from "@/components/write/QuillEditor";
import { ConfessionRecorder } from "@/components/write/ConfessionRecorder";
import { RevenantForm } from "@/components/write/RevenantForm";
import { COPY, slugify } from "@/lib/copy";
import type { Character, Chapter } from "@/db/schema";

type Mode = "type" | "voice" | "revenant";

export function Scriptorium({
  characters,
  initialChapter,
}: {
  characters: Character[];
  initialChapter?: Chapter | null;
}) {
  const router = useRouter();
  const [cast, setCast] = useState(characters);
  const [mode, setMode] = useState<Mode>("type");
  const [chapterId] = useState(initialChapter?.id ?? null);
  const [title, setTitle] = useState(initialChapter?.title ?? "");
  const [turnedId, setTurnedId] = useState(initialChapter?.turnedId ?? "");
  const [sireId, setSireId] = useState(initialChapter?.sireId ?? "");
  const [year, setYear] = useState(
    initialChapter?.occurredYear != null ? String(initialChapter.occurredYear) : ""
  );
  const [fuzzy, setFuzzy] = useState(initialChapter?.occurredFuzzy ?? "");
  const [place, setPlace] = useState(initialChapter?.place ?? "");
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
  const [addingCharacter, setAddingCharacter] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEpithet, setNewEpithet] = useState("");
  const [addingBusy, setAddingBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  useEffect(() => {
    setCast(characters);
  }, [characters]);

  const canonFacts = useMemo(() => {
    const turned = cast.find((c) => c.id === turnedId);
    const sire = cast.find((c) => c.id === sireId);
    const facts: string[] = [];
    if (turned?.turnedYear) facts.push(`Turned year on file: ${turned.turnedYear}`);
    if (turned?.turnedPlace) facts.push(`Place on file: ${turned.turnedPlace}`);
    if (turned?.sireId) {
      const listed = cast.find((c) => c.id === turned.sireId);
      if (listed) facts.push(`Listed sire: ${listed.name}`);
    }
    if (sire?.status) facts.push(`Sire status: ${sire.status}`);
    if (turned?.status) facts.push(`Subject status: ${turned.status}`);
    return facts;
  }, [cast, turnedId, sireId]);

  const addCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setAddError("A name is required.");
      return;
    }
    setAddingBusy(true);
    setAddError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          epithet: newEpithet.trim() || null,
          status: "mortal",
          sireId: sireId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not add them");
      }
      const data = await res.json();
      const created: Character = {
        id: data.id,
        handle: data.handle,
        name,
        epithet: newEpithet.trim() || null,
        mortalName: name,
        bio: null,
        status: "mortal",
        bornYear: null,
        turnedYear: null,
        turnedPlace: null,
        turnedLat: null,
        turnedLng: null,
        sireId: sireId || null,
        portraitMortalUrl: null,
        portraitVampireUrl: null,
        createdAt: new Date().toISOString(),
      };
      setCast((prev) => [...prev, created]);
      setTurnedId(created.id);
      setNewName("");
      setNewEpithet("");
      setAddingCharacter(false);
      router.refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingBusy(false);
    }
  };

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
          tags: tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          bodyHtml,
          authoringMode:
            mode === "voice" || audioUrl
              ? "confession"
              : mode === "revenant"
                ? "revenant"
                : "quill",
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
      if (status === "sealed" && place.trim()) {
        // Place was sealed with coords — send her straight to the new pin.
        router.push("/reddening");
      } else if (status === "sealed") {
        // Sealed chapters are written into the Svazek.
        router.push("/tome");
      } else {
        router.push("/write");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const modes: { id: Mode; label: string }[] = [
    { id: "type", label: "Type" },
    { id: "voice", label: "Voice" },
    { id: "revenant", label: "Revenant" },
  ];

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_280px]">
      <div>
        <p className="font-ledger mb-2 text-xs tracking-[0.2em] text-gilt uppercase">
          The Skriptorium
        </p>
        <h2 className="font-display mb-6 text-4xl text-vellum">
          {chapterId ? "Revise this turning" : "Write a turning"}
        </h2>
        <p className="mb-6 max-w-prose text-sm text-vellum-dim">
          When you seal a chapter, it is set in the Kronika and written into the
          Svazek — the book itself.
        </p>

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
          <div>
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
                {cast.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {!addingCharacter ? (
              <button
                type="button"
                onClick={() => setAddingCharacter(true)}
                className="font-ledger mt-2 text-[0.65rem] tracking-[0.12em] text-gilt uppercase underline-offset-2 hover:text-vellum hover:underline"
              >
                + Add character
              </button>
            ) : (
              <form
                onSubmit={addCharacter}
                className="mt-2 space-y-2 border border-gilt/30 bg-soot/60 p-3"
              >
                <p className="font-ledger text-[0.6rem] tracking-[0.15em] text-gilt uppercase">
                  New character
                </p>
                <input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Name"
                  autoFocus
                  className="w-full border border-gilt/30 bg-ash px-3 py-2 text-sm text-vellum focus:border-arterial focus:outline-none"
                />
                <input
                  value={newEpithet}
                  onChange={(e) => setNewEpithet(e.target.value)}
                  placeholder="Epithet (optional)"
                  className="w-full border border-gilt/30 bg-ash px-3 py-2 text-sm text-vellum focus:border-arterial focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="btn-seal"
                    disabled={addingBusy}
                  >
                    {addingBusy ? "Setting ink…" : "Admit them"}
                  </button>
                  <button
                    type="button"
                    className="btn-seal bg-transparent"
                    disabled={addingBusy}
                    onClick={() => {
                      setAddingCharacter(false);
                      setAddError(null);
                      setNewName("");
                      setNewEpithet("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
                {addError && (
                  <p className="text-sm text-arterial">{addError}</p>
                )}
              </form>
            )}
          </div>
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
              {cast.map((c) => (
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
              placeholder="New York, Prague, Los Angeles…"
              className="w-full border border-gilt/30 bg-ash px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
            />
            <span className="mt-1 block text-xs text-vellum-dim">
              On seal, this pins the Země globe. The chapter is always written
              into the Svazek.
            </span>
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
        </div>

        {mode === "voice" && (
          <div className="mb-4">
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
          <div className="mb-4">
            <RevenantForm
              onDraft={(html, meta) => {
                setBodyHtml(html);
                if (!title) {
                  setTitle(`The Turning of ${meta.turned}`);
                }
                if (!year && meta.year) setYear(meta.year);
                if (!place && meta.city) setPlace(meta.city);
                if (!tags && meta.tags) setTags(meta.tags);
                const turned = cast.find(
                  (c) => c.name.toLowerCase() === meta.turned.toLowerCase()
                );
                const sire = cast.find(
                  (c) => c.name.toLowerCase() === meta.sire.toLowerCase()
                );
                if (turned) setTurnedId(turned.id);
                if (sire) setSireId(sire.id);
                setMode("type");
              }}
            />
          </div>
        )}

        {mode !== "revenant" && (
          <>
            {audioUrl && (
              <p className="font-ledger mb-3 text-[0.65rem] tracking-[0.12em] text-gilt uppercase">
                Voice attached
                {durationS != null ? ` · ${durationS}s` : ""}
              </p>
            )}
            <QuillEditor content={bodyHtml} onChange={setBodyHtml} />
          </>
        )}

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
