"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Character } from "@/db/schema";

export function AddCharacterForm({
  characters,
}: {
  characters: Character[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [epithet, setEpithet] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<"mortal" | "fledgling" | "elder" | "ash">(
    "mortal"
  );
  const [sireId, setSireId] = useState("");
  const [loverId, setLoverId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          epithet: epithet || null,
          bio: bio || null,
          status,
          sireId: sireId || null,
          loverId: loverId || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not add them");
      }
      const data = await res.json();
      setOpen(false);
      setName("");
      setEpithet("");
      setBio("");
      router.push(`/cast/${data.handle}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-seal" onClick={() => setOpen(true)}>
        Admit someone new
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="border border-gilt/40 bg-ash/80 p-5 space-y-3 max-w-lg"
    >
      <p className="font-ledger text-xs tracking-[0.18em] text-gilt uppercase">
        New dossier
      </p>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Name
        </span>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Epithet
        </span>
        <input
          value={epithet}
          onChange={(e) => setEpithet(e.target.value)}
          placeholder="optional"
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Status
        </span>
        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value as typeof status)
          }
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        >
          <option value="mortal">mortal</option>
          <option value="fledgling">fledgling</option>
          <option value="elder">elder</option>
          <option value="ash">ash</option>
        </select>
      </label>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Sire (if already turned)
        </span>
        <select
          value={sireId}
          onChange={(e) => setSireId(e.target.value)}
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        >
          <option value="">None yet</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Lover bond
        </span>
        <select
          value={loverId}
          onChange={(e) => setLoverId(e.target.value)}
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        >
          <option value="">None</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          Bio
        </span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-vellum focus:border-arterial focus:outline-none"
        />
      </label>
      <div className="flex flex-wrap gap-2 pt-2">
        <button type="submit" className="btn-seal" disabled={busy}>
          {busy ? "Setting ink…" : "Admit them"}
        </button>
        <button
          type="button"
          className="btn-seal bg-transparent"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-arterial">{error}</p>}
    </form>
  );
}
