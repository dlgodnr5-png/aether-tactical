"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { audioBus } from "@/lib/audio";

const TABS: { label: string; href: string; icon: string }[] = [
  { label: "COMMAND", href: "/", icon: "hub" },
  { label: "FLEET", href: "/fleet", icon: "flight" },
  { label: "FUEL", href: "/exchange", icon: "local_gas_station" },
  { label: "TARGET", href: "/targets", icon: "my_location" },
  { label: "RANKING", href: "/leaderboard", icon: "leaderboard" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const prevPath = useRef<string>(pathname);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      audioBus.sfx("nav");
      prevPath.current = pathname;
    }
  }, [pathname]);

  const activeIndex = TABS.findIndex((t) =>
    t.href === "/" ? pathname === "/" : pathname.startsWith(t.href)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B1026]/80 backdrop-blur-2xl">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
      <ul className="relative mx-auto flex max-w-5xl items-stretch justify-between px-1 py-2">
        {TABS.map((tab, i) => {
          const active = i === activeIndex;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={[
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 rounded-sm transition-all duration-300",
                  active
                    ? "text-cyan-300"
                    : "text-slate-500 hover:text-cyan-300",
                ].join(" ")}
              >
                <span
                  className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
                    active ? "scale-110 drop-shadow-[0_0_8px_rgba(0,219,231,0.7)]" : ""
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="font-label text-[10px] tracking-[0.2em]">
                  {tab.label}
                </span>
                {active && (
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
                )}
              </Link>
            </li>
          );
        })}
        {/* Sliding active underline indicator */}
        {activeIndex >= 0 && (
          <span
            aria-hidden
            className="absolute bottom-1 h-[3px] w-[18%] rounded-full bg-gradient-to-r from-cyan-400/0 via-cyan-400 to-cyan-400/0 transition-[left] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ left: `${(activeIndex / TABS.length) * 100 + 100 / TABS.length / 2 - 9}%` }}
          />
        )}
      </ul>
    </nav>
  );
}
