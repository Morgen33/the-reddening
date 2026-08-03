"use client";

import { useState } from "react";
import { COPY } from "@/lib/copy";

type Seed = {
  turned: string;
  sire: string;
  year: string;
  city: string;
  mood: string;
  detail: string;
  tags: string;
};

export function RevenantForm({
  onDraft,
}: {
  onDraft: (html: string, meta: Seed) => void;
}) {
  const [seed, setSeed] = useState<Seed>({
    turned: "",
    sire: "",
    year: "",
    city: "",
    mood: "",
    detail: "",
    tags: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSeed, setLastSeed] = useState<Seed | null>(null);

  const field = (key: keyof Seed, label: string, placeholder?: string) => (
    <label className="block">
      <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
        {label}
      </span>
      <input
        value={seed[key]}
        onChange={(e) => setSeed((s) => ({ ...s, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gilt/30 bg-soot px-3 py-2 text-sm text-vellum placeholder:text-vellum-dim/50 focus:border-arterial focus:outline-none"
      />
    </label>
  );

  const generate = async (differently: boolean) => {
    setLoading(true);
    setError(null);
    const payload = differently && lastSeed ? lastSeed : seed;
    try {
      const res = await fetch("/api/revenant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, differently }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "The Revenant could not draft this");
      }
      const data = await res.json();
      setLastSeed(payload);
      onDraft(data.html, payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Draft failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border border-gilt/40 bg-ash/80 p-6">
      <p className="font-ledger mb-2 text-xs tracking-[0.18em] text-gilt uppercase">
        The Revenant
      </p>
      <p className="mb-6 text-sm text-vellum-dim">
        A short seed. One call returns a full chapter draft — editable, never
        auto-sealed.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("turned", "Who was turned", "Morgen")}
        {field("sire", "Who turned them", "Veronika")}
        {field("year", "Year", "2024")}
        {field("city", "City", "New York")}
        {field("mood", "Mood", "tender, strange")}
        {field("tags", "Tags", "origin, night")}
      </div>
      <label className="mt-3 block">
        <span className="font-ledger mb-1 block text-[0.65rem] tracking-[0.15em] text-gilt uppercase">
          One true detail
        </span>
        <textarea
          value={seed.detail}
          onChange={(e) => setSeed((s) => ({ ...s, detail: e.target.value }))}
          rows={3}
          placeholder="The sodium light cut their face in half."
          className="w-full border border-gilt/30 bg-soot px-3 py-2 text-sm text-vellum placeholder:text-vellum-dim/50 focus:border-arterial focus:outline-none"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-seal"
          disabled={loading || !seed.turned || !seed.sire}
          onClick={() => generate(false)}
        >
          {loading ? "Summoning…" : "Draft the turning"}
        </button>
        {lastSeed && (
          <button
            type="button"
            className="btn-seal bg-transparent"
            disabled={loading}
            onClick={() => generate(true)}
          >
            {COPY.againDifferently}
          </button>
        )}
      </div>
      {error && <p className="mt-3 text-sm text-arterial">{error}</p>}
    </div>
  );
}
