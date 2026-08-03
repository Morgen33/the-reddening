"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ConfessionResult = {
  audioUrl: string;
  transcriptRaw: string;
  transcriptInked: string;
  durationS: number;
};

export function ConfessionRecorder({
  onAccept,
}: {
  onAccept: (result: ConfessionResult & { chosen: "raw" | "inked" | "splice"; text: string }) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.15));
  const [result, setResult] = useState<ConfessionResult | null>(null);
  const [rawEdit, setRawEdit] = useState("");
  const [inkEdit, setInkEdit] = useState("");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const startRef = useRef<number>(0);

  const stopMeters = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const tickMeters = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / 24);
    const next = Array.from({ length: 24 }, (_, i) => {
      const v = data[i * step] ?? 0;
      return Math.max(0.12, v / 255);
    });
    setLevels(next);
    rafRef.current = requestAnimationFrame(tickMeters);
  }, []);

  useEffect(() => () => stopMeters(), []);

  const start = async () => {
    setError(null);
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      tickMeters();

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stopMeters();
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const durationS = Math.round((Date.now() - startRef.current) / 1000);
        setProcessing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "confession.webm");
          form.append("durationS", String(durationS));
          const res = await fetch("/api/transcribe", {
            method: "POST",
            body: form,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Transcription failed");
          }
          const data = (await res.json()) as ConfessionResult;
          setResult(data);
          setRawEdit(data.transcriptRaw);
          setInkEdit(data.transcriptInked);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Recording failed");
        } finally {
          setProcessing(false);
        }
      };
      mediaRef.current = recorder;
      startRef.current = Date.now();
      recorder.start();
      setRecording(true);
    } catch {
      setError("Microphone access is required for The Confession.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-6">
      <div className="border border-gilt/40 bg-ash/80 p-6">
        <p className="font-ledger mb-4 text-xs tracking-[0.18em] text-gilt uppercase">
          The Confession
        </p>
        <p className="mb-6 text-sm text-vellum-dim">
          Speak the turning as you would on a Space. We keep the audio and set a
          light ink beside the raw speech.
        </p>

        <div className="mb-6 flex h-16 items-end justify-center gap-1">
          {levels.map((l, i) => (
            <span
              key={i}
              className="w-1.5 rounded-sm bg-arterial transition-[height] duration-75"
              style={{
                height: `${l * 100}%`,
                opacity: recording ? 0.5 + l * 0.5 : 0.35,
              }}
            />
          ))}
        </div>

        <div className="flex justify-center">
          {!recording ? (
            <button
              type="button"
              onClick={start}
              disabled={processing}
              className="btn-seal"
            >
              {processing ? "Setting in ink…" : "Begin confession"}
            </button>
          ) : (
            <button
              type="button"
              onClick={stop}
              className="btn-seal bg-arterial"
            >
              End confession
            </button>
          )}
        </div>
        {error && (
          <p className="mt-4 text-center text-sm text-arterial">{error}</p>
        )}
      </div>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="font-ledger mb-2 block text-xs tracking-wider text-vellum-dim uppercase">
              Raw speech
            </span>
            <textarea
              value={rawEdit}
              onChange={(e) => setRawEdit(e.target.value)}
              rows={12}
              className="w-full border border-gilt/30 bg-ash p-4 text-sm text-vellum focus:border-arterial focus:outline-none"
            />
            <button
              type="button"
              className="btn-seal mt-3"
              onClick={() =>
                onAccept({
                  ...result,
                  chosen: "raw",
                  text: rawEdit,
                  transcriptRaw: rawEdit,
                  transcriptInked: inkEdit,
                })
              }
            >
              Accept raw
            </button>
          </label>
          <label className="block">
            <span className="font-ledger mb-2 block text-xs tracking-wider text-vellum-dim uppercase">
              Set in ink
            </span>
            <textarea
              value={inkEdit}
              onChange={(e) => setInkEdit(e.target.value)}
              rows={12}
              className="w-full border border-gilt/30 bg-ash p-4 text-sm text-vellum focus:border-arterial focus:outline-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-seal"
                onClick={() =>
                  onAccept({
                    ...result,
                    chosen: "inked",
                    text: inkEdit,
                    transcriptRaw: rawEdit,
                    transcriptInked: inkEdit,
                  })
                }
              >
                Accept ink
              </button>
              <button
                type="button"
                className="btn-seal bg-transparent"
                onClick={() =>
                  onAccept({
                    ...result,
                    chosen: "splice",
                    text: `${inkEdit}\n\n—\n\n${rawEdit}`,
                    transcriptRaw: rawEdit,
                    transcriptInked: inkEdit,
                  })
                }
              >
                Splice both
              </button>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
