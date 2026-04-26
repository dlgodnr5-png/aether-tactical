/**
 * NextAuth.js v5 — Google OAuth + JWT session.
 *
 * 환경변수:
 *   AUTH_SECRET             — 32바이트 random (생성됨)
 *   AUTH_GOOGLE_ID          — Google OAuth Client ID
 *   AUTH_GOOGLE_SECRET      — Google OAuth Client Secret
 *
 * Auth.js v5 는 환경변수를 자동으로 인식 (AUTH_ prefix).
 * NEXTAUTH_URL 은 v5 에서 불필요 (자동 감지) — 단 cross-origin 시 AUTH_TRUST_HOST=true 필요.
 *
 * Session: JWT (DB 불필요). 결제 grant 는 별도 KV (Upstash Redis) 에 user.email 키로 저장.
 */

import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  session: { strategy: "jwt" },
  // production 검증 시 AUTH_TRUST_HOST=true 필요 (Vercel/Cloudflare 자동 감지 안 되는 케이스)
  trustHost: true,
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.email) {
        token.email = profile.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.email === "string") {
        session.user.email = token.email;
      }
      return session;
    },
  },
});
