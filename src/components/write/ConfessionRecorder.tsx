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
  onAccept: (
    result: ConfessionResult & {
      chosen: "raw" | "inked" | "splice";
      text: string;
    }
  ) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(24).fill(0.15));
  const [result, setResult] = useState<ConfessionResult | null>(null);
  const [draft, setDraft] = useState("");

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
          setDraft(data.transcriptInked || data.transcriptRaw);
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
      setError("Microphone access is required to speak the story.");
    }
  };

  const stop = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 border border-gilt/30 bg-ash/60 px-4 py-3">
        <div className="flex h-10 flex-1 items-end gap-0.5">
          {levels.map((l, i) => (
            <span
              key={i}
              className="w-1 rounded-sm bg-arterial transition-[height] duration-75"
              style={{
                height: `${l * 100}%`,
                opacity: recording ? 0.5 + l * 0.5 : 0.35,
              }}
            />
          ))}
        </div>
        {!recording ? (
          <button
            type="button"
            onClick={start}
            disabled={processing}
            className="btn-seal shrink-0"
          >
            {processing ? "Setting in ink…" : result ? "Record again" : "Record"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stop}
            className="btn-seal shrink-0 bg-arterial"
          >
            Stop
          </button>
        )}
      </div>

      {error && <p className="text-sm text-arterial">{error}</p>}

      {result && (
        <div className="space-y-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={6}
            className="w-full border border-gilt/30 bg-ash p-4 text-sm text-vellum focus:border-arterial focus:outline-none"
          />
          <button
            type="button"
            className="btn-seal"
            onClick={() =>
              onAccept({
                ...result,
                chosen: "inked",
                text: draft,
                transcriptRaw: result.transcriptRaw,
                transcriptInked: draft,
              })
            }
          >
            Use in story
          </button>
        </div>
      )}
    </div>
  );
}
