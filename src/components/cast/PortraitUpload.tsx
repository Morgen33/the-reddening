"use client";

import { useState } from "react";

export function PortraitUpload({ characterId }: { characterId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const onFile = async (file: File, regenerate = false) => {
    setBusy(true);
    setMessage("Turning… this can take up to a minute.");
    setIsError(false);
    try {
      const form = new FormData();
      form.append("image", file);
      form.append("characterId", characterId);
      if (regenerate) form.append("regenerate", "1");
      const res = await fetch("/api/portrait", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Portrait failed"
        );
      }
      setMessage("They have turned. Reloading…");
      window.location.reload();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <label
        className={`btn-seal inline-flex ${busy ? "cursor-wait opacity-70" : "cursor-pointer"}`}
      >
        {busy ? "Turning…" : "Upload mortal photo"}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFile(f);
          }}
        />
      </label>
      <p className="text-xs text-vellum-dim">
        Only upload photos of people who are fine with it. Photoreal preset —
        same face, turned undead.
      </p>
      {message && (
        <p className={`text-sm ${isError ? "text-arterial" : "text-gilt"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
