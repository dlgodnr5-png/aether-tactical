"use client";

/**
 * NextAuth.js v5 SessionProvider + gameStore 동기화.
 *
 * 기존 Firebase auth 를 NextAuth 로 교체.
 * useSession() 의 status/data 변화를 gameStore.user 에 반영해서
 * 다른 컴포넌트들이 기존처럼 useGameStore((s) => s.user) 로 접근 가능.
 */

import { useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { useGameStore } from "@/store/gameStore";

function GameStoreSync() {
  const { data: session, status } = useSession();
  const setUser = useGameStore((s) => s.setUser);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.email) {
      setUser({ uid: session.user.email, email: session.user.email });
    } else if (status === "unauthenticated") {
      setUser(null);
    }
  }, [status, session, setUser]);

  return null;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GameStoreSync />
      {children}
    </SessionProvider>
  );
}
