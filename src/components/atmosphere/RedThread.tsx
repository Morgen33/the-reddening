"use client";

import { useEffect, useState } from "react";

type ThreadVariant = "spine" | "cast" | "bloodline" | "globe" | "none";

const PATHS: Record<Exclude<ThreadVariant, "none">, string> = {
  spine: "M 28 0 C 28 120, 36 240, 28 360 C 20 480, 40 600, 28 720 C 16 840, 32 960, 28 1080",
  cast: "M 0 180 C 200 140, 400 220, 600 160 C 800 100, 1000 200, 1200 150",
  bloodline: "M 80 40 C 200 80, 160 200, 280 240 C 400 280, 360 400, 500 440",
  globe: "M 100 500 C 300 200, 500 200, 700 500 C 900 800, 1100 800, 1300 500",
};

export function RedThread({
  variant = "spine",
  progress,
}: {
  variant?: ThreadVariant;
  progress?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [variant]);

  if (variant === "none") return null;

  const path = PATHS[variant];
  const clip =
    typeof progress === "number"
      ? `inset(${(1 - Math.min(1, Math.max(0, progress))) * 100}% 0 0 0)`
      : undefined;

  return (
    <svg
      className="pointer-events-none fixed inset-0 z-[30] h-full w-full"
      viewBox="0 0 1400 1100"
      preserveAspectRatio="none"
      aria-hidden
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 400ms ease",
        clipPath: clip,
      }}
    >
      <path
        d={path}
        fill="none"
        stroke="var(--arterial)"
        strokeWidth="2"
        strokeLinecap="round"
        className={typeof progress === "number" ? "" : "thread-path"}
        pathLength={1}
        style={{ opacity: 0.75 }}
      />
    </svg>
  );
}
