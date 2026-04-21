"use client";

import { useEffect, useState } from "react";
import { audioBus } from "@/lib/audio";

const LINES = [
  "> SYSTEM CHECK ............ OK",
  "> UPLINK :: SAT-07 ........ SECURE",
  "> HUD RENDER .............. READY",
];

const SESSION_KEY = "boot:shown";

export default function BootSequence() {
  const [active, setActive] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    window.sessionStorage.setItem(SESSION_KEY, "1");
    setActive(true);
    audioBus.sfx("boot");

    const full = LINES.join("\n");
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setText(full.slice(0, i));
      if (i >= full.length) {
        window.clearInterval(id);
        window.setTimeout(() => setActive(false), 900);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, []);

  if (!active) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm transition-opacity">
      <pre className="font-label text-cyan-300 text-xs sm:text-sm tracking-[0.2em] leading-[1.8] whitespace-pre-wrap text-glow">
        {text}
        <span className="animate-pulse">_</span>
      </pre>
    </div>
  );
}
