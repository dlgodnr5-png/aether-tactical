"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import MagneticButton from "@/components/fx/MagneticButton";
import NumberTicker from "@/components/fx/NumberTicker";

export default function BriefingPage() {
  const target = useGameStore((s) => s.target);
  const [stage, setStage] = useState(0);
  const [analysisText, setAnalysisText] = useState("");

  const reasons = [
    "상습적인 야근 강요 및 임금 체불 정황 포착",
    "회식 자리에서의 부적절한 언행 및 권위주의적 태도",
    "개인적인 심부름을 업무로 둔갑시키는 갑질 행위",
    "공로 가로채기 및 책임 전가로 팀 분위기 저해",
    "불필요한 비교와 가스라이팅으로 자신감 하락 유도"
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 1000), // Scanning
      setTimeout(() => {
        setStage(2);
        setAnalysisText(reasons[Math.floor(Math.random() * reasons.length)]);
      }, 3000), // Analysis Found
      setTimeout(() => setStage(3), 4500), // Ready
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!target) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#050810] p-6 text-center">
        <p className="font-label text-cyan-400 tracking-widest animate-pulse">NO TARGET SELECTED</p>
        <Link href="/targets" className="mt-4 text-xs text-on-surface-variant hover:text-cyan-300 underline">지정소로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#050810] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e3a8a_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
      </div>

      <div className="w-full max-w-2xl z-10 space-y-8 text-center">
        {/* Header */}
        <div className="space-y-2">
          <p className="font-label text-[10px] tracking-[0.4em] text-cyan-500 uppercase">Mission Briefing</p>
          <h1 className="font-headline text-3xl font-bold text-white text-glow">타격 대상 분석 리포트</h1>
        </div>

        {/* Console Box */}
        <div className="glass bevel noise rounded-xl p-8 border border-cyan-500/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-shimmer" />
          
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className={`w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-500 ${stage >= 2 ? "border-red-500 bg-red-500/20" : "border-cyan-500 animate-spin-slow"}`}>
                <span className="material-symbols-outlined text-[32px] text-cyan-400">
                  {stage >= 2 ? "warning" : "radar"}
                </span>
              </div>
              <p className="mt-3 font-label text-[11px] tracking-widest text-cyan-300">
                {stage === 0 && "INITIALIZING LINK..."}
                {stage === 1 && "SCANNING INFRACTIONS..."}
                {stage >= 2 && "ANALYSIS COMPLETE"}
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center text-[10px] font-label text-on-surface-variant tracking-widest">
                <span>LOCATION</span>
                <span className="text-white">{target.address}</span>
              </div>
              <div className="h-px bg-white/10" />
              
              <div className="min-h-[60px] flex items-center justify-center">
                {stage >= 2 ? (
                  <p className="text-lg font-headline text-red-100 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <span className="text-red-500 font-bold mr-2">!</span>
                    "{analysisText}"
                  </p>
                ) : (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.1}s` }} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`transition-all duration-1000 ${stage >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
          <p className="mb-6 font-label text-[11px] text-on-surface-variant tracking-tighter">
            * 위 분석은 고도의 추론 엔진(o3-mini)에 의해 생성되었습니다. 스트레스 해소를 위한 가상의 작전입니다.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/targets">
              <MagneticButton tone="ghost" className="rounded-lg px-8 py-4">
                취소
              </MagneticButton>
            </Link>
            <Link href="/strike">
              <MagneticButton tone="cyan" className="rounded-lg px-8 py-4 bg-red-600/20 border-red-500/50 hover:bg-red-500/40 text-red-100 shadow-[0_0_20px_rgba(220,38,38,0.3)]">
                응징 시작
              </MagneticButton>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-spin-slow {
          animation: spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
