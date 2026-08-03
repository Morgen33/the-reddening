"use client";

import { useEffect, useRef, useState } from "react";

export function NarrationHorn({
  audioUrl,
  label = "Hear Veronika tell it",
}: {
  audioUrl: string;
  label?: string;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onEnded = () => setPlaying(false);
    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      await audio.play();
      setPlaying(true);
    }
  };

  return (
    <div className="my-6 flex items-center gap-3">
      <button
        type="button"
        onClick={toggle}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gilt text-arterial transition-colors hover:border-arterial hover:bg-oxblood/40"
        aria-label={playing ? "Pause narration" : "Play narration"}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          {playing ? (
            <>
              <rect x="6" y="5" width="4" height="14" fill="currentColor" />
              <rect x="14" y="5" width="4" height="14" fill="currentColor" />
            </>
          ) : (
            <path
              d="M4 10c4-6 8-6 12 0M7 13c2.5-3.5 5.5-3.5 8 0M10 16c1-1.5 2-1.5 3 0M18 8l3-2v12l-3-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </svg>
      </button>
      <span className="font-ledger text-xs tracking-wider text-vellum-dim uppercase">
        {label}
      </span>
      <audio ref={audioRef} src={audioUrl} preload="none" />
    </div>
  );
}
