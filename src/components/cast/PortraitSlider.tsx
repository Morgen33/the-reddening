"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";

export function PortraitSlider({
  mortalSrc,
  vampireSrc,
  alt,
}: {
  mortalSrc?: string | null;
  vampireSrc?: string | null;
  alt: string;
}) {
  const [pos, setPos] = useState(50);
  const [mobileVampire, setMobileVampire] = useState(false);
  const dragging = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);

  const mortal =
    mortalSrc ||
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#1C1917" width="400" height="500"/><text x="200" y="250" fill="#A2937A" text-anchor="middle" font-family="serif" font-size="18">Mortal likeness pending</text></svg>`
      );
  const vampire =
    vampireSrc ||
    "data:image/svg+xml," +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect fill="#0F0D0C" width="400" height="500"/><text x="200" y="250" fill="#A8121F" text-anchor="middle" font-family="serif" font-size="18">Vampire portrait pending</text></svg>`
      );

  const updateFromClientX = useCallback((clientX: number) => {
    const el = frameRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      updateFromClientX(e.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [updateFromClientX]);

  return (
    <div>
      {/* Desktop / tablet drag slider */}
      <div
        ref={frameRef}
        className="relative hidden aspect-[4/5] w-full overflow-hidden border border-gilt/50 md:block"
        onPointerDown={(e) => {
          dragging.current = true;
          updateFromClientX(e.clientX);
        }}
      >
        <img
          src={vampire}
          alt={`${alt} — turned`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: "contrast(1.08)" }}
          draggable={false}
        />
        <img
          src={mortal}
          alt={`${alt} — mortal`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />
        <div
          className="absolute inset-y-0 z-10 w-0.5 bg-arterial"
          style={{ left: `${pos}%` }}
        >
          <div className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border border-arterial bg-soot/80" />
        </div>
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(15,13,12,0.5)]" />
      </div>

      {/* Mobile tap toggle */}
      <button
        type="button"
        className="relative aspect-[4/5] w-full overflow-hidden border border-gilt/50 md:hidden"
        onClick={() => setMobileVampire((v) => !v)}
        aria-label="Toggle mortal and vampire portrait"
      >
        <img
          src={mortal}
          alt={`${alt} — mortal`}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: mobileVampire ? 0 : 1 }}
        />
        <img
          src={vampire}
          alt={`${alt} — turned`}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{
            opacity: mobileVampire ? 1 : 0,
            filter: "contrast(1.08)",
          }}
        />
      </button>
      <p className="font-ledger mt-2 text-center text-[0.65rem] tracking-wider text-vellum-dim uppercase">
        <span className="hidden md:inline">Drag the thread across the face</span>
        <span className="md:hidden">Tap to watch them turn</span>
      </p>
    </div>
  );
}
