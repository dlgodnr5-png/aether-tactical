"use client";

import { useGameStore } from "@/store/gameStore";
import NumberTicker from "@/components/fx/NumberTicker";
import AudioEngageToggle from "@/components/fx/AudioEngageToggle";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

export default function TopBar() {
  const credits = useGameStore((s) => s.credits);
  const user = useGameStore((s) => s.user);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login failed:", err);
    }
  };

  const handleLogout = () => signOut(auth);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-[#0B1026]/65 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-cyan-400 text-[20px]">
            satellite_alt
          </span>
          <span className="font-headline tracking-[0.25em] text-cyan-400 text-sm text-glow">
            TACTICAL CMD: V0.9
          </span>
        </div>
        <div className="flex items-center gap-3">
          <AudioEngageToggle />
          <div className="font-label text-cyan-400 text-sm tabular-nums flex items-baseline gap-1 mr-2">
            <NumberTicker value={credits} />
            <span className="text-[10px] tracking-[0.25em] text-on-surface-variant">CR</span>
          </div>

          {user ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1 bg-cyan-400/10 border border-cyan-400/20 rounded hover:bg-cyan-400/20 transition-colors"
            >
              <span className="text-[10px] text-cyan-300 font-headline uppercase truncate max-w-[80px]">
                {user.email?.split("@")[0]}
              </span>
              <span className="material-symbols-outlined text-[16px] text-cyan-400">logout</span>
            </button>
          ) : (
            <button
              onClick={handleLogin}
              className="flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-400/40 rounded hover:bg-cyan-500/30 transition-colors"
            >
              <span className="text-[10px] text-cyan-100 font-headline uppercase">Login</span>
              <span className="material-symbols-outlined text-[16px] text-cyan-400">login</span>
            </button>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
    </header>
  );
}
