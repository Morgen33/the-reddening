"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export function CharacterImageUpload({
  characterId,
  images,
}: {
  characterId: string;
  images: { id: string; url: string }[];
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const onFiles = async (fileList: FileList | null) => {
    if (!fileList?.length) return;
    setBusy(true);
    setMessage("Uploading…");
    setIsError(false);
    try {
      const form = new FormData();
      form.append("characterId", characterId);
      for (const file of Array.from(fileList)) {
        form.append("images", file);
      }
      const res = await fetch("/api/character-images", {
        method: "POST",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed"
        );
      }
      setMessage("Saved. Reloading…");
      window.location.reload();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    setBusy(true);
    setMessage(null);
    setIsError(false);
    try {
      const res = await fetch(
        `/api/character-images?id=${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Delete failed"
        );
      }
      window.location.reload();
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Delete failed");
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-3">
      <label
        className={`btn-seal inline-flex ${busy ? "cursor-wait opacity-70" : "cursor-pointer"}`}
      >
        {busy ? "Working…" : "Upload photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
      <p className="text-xs text-vellum-dim">
        Add as many likenesses as you like — no AI turning. Only upload photos
        of people who are fine with it.
      </p>
      {images.length > 0 && (
        <ul className="space-y-2">
          {images.map((img) => (
            <li
              key={img.id}
              className="flex items-center gap-3 border border-gilt/30 p-2"
            >
              <img
                src={img.url}
                alt=""
                className="h-12 w-12 object-cover"
              />
              <button
                type="button"
                className="font-ledger text-[0.65rem] tracking-wider text-arterial uppercase hover:underline disabled:opacity-50"
                disabled={busy}
                onClick={() => void onDelete(img.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      {message && (
        <p className={`text-sm ${isError ? "text-arterial" : "text-gilt"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
