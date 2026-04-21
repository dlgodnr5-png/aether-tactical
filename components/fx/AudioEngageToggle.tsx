"use client";

import { useEffect, useState } from "react";
import { audioBus } from "@/lib/audio";

export default function AudioEngageToggle() {
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    audioBus.init();
    setEngaged(audioBus.engaged);
    return audioBus.subscribe((v) => setEngaged(v));
  }, []);

  const onClick = () => {
    void audioBus.toggle();
  };

  return (
    <button
      onClick={onClick}
      aria-label={engaged ? "Mute audio" : "Engage audio"}
      title={engaged ? "AUDIO ENGAGED" : "ENGAGE AUDIO"}
      className={`relative flex items-center gap-1.5 rounded border px-2 py-1 font-label text-[10px] tracking-[0.25em] transition ${
        engaged
          ? "border-cyan-400/60 text-cyan-300 bg-cyan-400/10 shadow-[0_0_16px_-4px_rgba(0,219,231,0.55)]"
          : "border-outline-variant/50 text-on-surface-variant hover:text-cyan-300 hover:border-cyan-400/40"
      }`}
    >
      <span className="material-symbols-outlined text-[16px]">
        {engaged ? "volume_up" : "volume_off"}
      </span>
      <span className="hidden sm:inline">{engaged ? "LIVE" : "AUDIO"}</span>
    </button>
  );
}
