/**
 * lib/scoreboard.ts
 * Firestore 기반 글로벌 스코어보드 CRUD 유틸.
 * - saveScore()  : 미션 결과를 저장 (로그인 필요)
 * - getTop10()   : 상위 10개 점수 조회 (비로그인 가능)
 */
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ScoreEntry {
  uid: string;
  displayName: string;         // email 앞부분
  score: number;               // creditsEarned 누적 or 단발
  enemiesDowned: number;
  plane: number;               // selectedPlane index
  timestamp: Timestamp | null;
}

export async function saveScore(entry: Omit<ScoreEntry, "timestamp">): Promise<void> {
  await addDoc(collection(db, "scores"), {
    ...entry,
    timestamp: serverTimestamp(),
  });
}

export async function getTop10(): Promise<ScoreEntry[]> {
  const q = query(
    collection(db, "scores"),
    orderBy("score", "desc"),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as ScoreEntry);
}
