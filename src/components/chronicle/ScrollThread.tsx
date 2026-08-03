"use client";

import { useEffect, useState } from "react";
import { RedThread } from "@/components/atmosphere/RedThread";

export function ScrollThread() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      setProgress(max > 0 ? el.scrollTop / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return <RedThread variant="spine" progress={Math.max(progress, 0.02)} />;
}
