"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "reddening-cold-open-seen";

export function ColdOpen({ onDone }: { onDone?: () => void }) {
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const force = params.get("cold-open") === "1";
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!force && seen) {
      onDone?.();
      return;
    }
    setShow(true);
  }, [onDone]);

  useEffect(() => {
    if (!show) return;
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 2200);
    const t3 = setTimeout(() => setPhase(3), 3800);
    const t4 = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, "1");
      setShow(false);
      onDone?.();
    }, 5600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [show, onDone]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-soot">
      <div className="relative max-w-lg px-8 text-center">
        <p
          className="font-display text-2xl leading-relaxed text-vellum md:text-3xl"
          style={{
            opacity: phase >= 1 ? 1 : 0,
            transition: "opacity 1.2s ease",
          }}
        >
          <em>Veronika —</em>
          <br />
          you kept telling these out loud and letting them go.
          <br />
          Here is somewhere to put them.
        </p>
        <svg
          className="mx-auto mt-10 h-8 w-full max-w-sm"
          viewBox="0 0 400 20"
          aria-hidden
        >
          <path
            d="M 0 10 C 80 2, 120 18, 200 10 C 280 2, 320 18, 400 10"
            fill="none"
            stroke="var(--arterial)"
            strokeWidth="2"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: phase >= 2 ? 0 : 1,
              transition: "stroke-dashoffset 1.6s ease",
            }}
          />
        </svg>
        <p
          className="font-ledger mt-8 text-xs tracking-[0.2em] text-vellum-dim uppercase"
          style={{
            opacity: phase >= 3 ? 1 : 0,
            transition: "opacity 800ms ease",
          }}
        >
          The chronicle assembles
        </p>
      </div>
    </div>
  );
}

export function replayColdOpen() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = "/?cold-open=1";
}
