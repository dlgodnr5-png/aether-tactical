/**
 * GET  /api/me/grants  — 현재 로그인 사용자의 grant (tier/missiles/history) 조회
 * POST /api/me/grants  — 미사일 1발 소비 (consume) — 본문 {action:"consume"} 만 지원
 *
 * 로그인 안 됨 → 401
 * Upstash 미설정 → memStore (재시작 시 휘발)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getGrants, consumeMissile } from "@/lib/grants";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const grants = await getGrants(email);
  return NextResponse.json(grants);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { action?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (body.action === "consume") {
    const ok = await consumeMissile(email);
    const grants = await getGrants(email);
    return NextResponse.json({ ok, grants });
  }
  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}
