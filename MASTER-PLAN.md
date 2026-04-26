# Aether-Tactical Master Plan

> 인수: 2026-04-25 사령관 1순위 (Claude Opus 4.7)
> 라이브: https://aether-tactical.vercel.app
> 비전: 모바일 우선 우주전 게임 — 영상 중심, $1 무한 + 포탄 micro-purchase

---

## 비전 (사용자 정의 2026-04-25)

### 게임 흐름 (재설계)
```
시작 → 구독 확인 (FREE / $1 무한) → 전투기 선택 (영상)
     → 국가/지역 선택 (영상 background) → 비행 시작
     → 방해물 (지대공 미사일 / 드론 / 적기 — 매번 다른 procgen 알고리즘)
     → 또는 타겟 미리 지정 (지번)
     → 비행 현황 (3D Google Earth = Cesium)
     → 목표 재확인 (정확한 지번 / 건물 / 도시)
     → 정밀 타격 (Cesium 전체화면, 미사일 trail 실감)
     → (옵션) 우주 전투 — GitHub 우주 알고리즘 통합
     → 결과
```

### 결제 모델
- **FREE**: 5km 반경 / 미사일 5발
- **$1 UNLIMITED**: 무한 반경 / 무한 미션 + 미사일 100발
- **포탄 reload $1/100발** (consumable, 부족 시 모달 hook)
- **결제 수단**: PayPal + Toss (unified-subscription-panel 적용)

### 시각 원칙
- **정지화면 최소** — 전투기 선택/비행/이동 모두 영상
- **모바일 우선** — 글씨 14px+ 또는 아이콘 / 가로 강제 / 햅틱
- **음향: 우주 전쟁 분위기** — Star Wars/인터스텔라 결, 페이즈별 BGM 자동 매핑

---

## 단계별 계획 (W4-A ~ G)

### W4-A. 결제 모델 단순화

**파일**:
- `lib/tiers.ts` — `TIERS` 배열 4개 → 2개 (FREE / UNLIMITED)
- `store/slices/missilesSlice.ts` (신규) — `{ count, max, lastReloaded }` + `consume() / reload(qty)`
- `app/exchange/page.tsx` — UI 재설계 (큰 카드 2장 + 미사일 잔량 표시 + Reload 버튼)
- `components/MissileLowModal.tsx` (신규) — 잔량 1발 시 자동 표시
- `app/api/checkout/route.ts` — 분기 추가:
  - `?product=unlimited` → 일회성 $1 → cookie tier=unlimited
  - `?product=missile_pack` → $1 → store missilesSlice.reload(100)

**hook 트리거 (사용자 → 구매)**:
- 미사일 발사 시 잔량 체크
- ≤ 5발: 화면 우상단 **빨간 배지 + 깜빡임**
- = 1발: SFX `warning_beep` + 화면 우측 슬라이드 모달 "마지막 1발! $1로 100발 충전"
- = 0발: 강제 모달 + 발사 차단 (구매 또는 수동 close)

### W4-B. 게임 흐름 재배치

**phase 머신** (`store/gameStore.ts`):
```typescript
type GamePhase =
  | "intro"
  | "tier"
  | "fleet"           // 전투기 선택 (영상 background)
  | "region"          // 국가/지역 선택 (영상 background)
  | "flight"          // 비행 + 방해물 (procgen)
  | "globe"           // Cesium 비행 현황
  | "target_confirm"  // 지번/건물 정밀 검색
  | "strike"          // 정밀 타격 (Cesium 전체화면)
  | "space"           // (옵션) 우주 전투
  | "debrief";
```

**신규 페이지**:
- `app/region/page.tsx` — 국가/지역 선택 카드 + 영상 bg
- `app/target_confirm/page.tsx` — Cesium geocoding 검색 + 정밀 줌
- `app/space/page.tsx` — 우주 전투 (GitHub 라이브러리 통합)

### W4-C. 방해물 알고리즘 (procgen)

**파일**: `lib/obstacles.ts` (신규)

```typescript
type ObstacleKind = "sam" | "drone" | "interceptor" | "weather" | "alien_ship";
type ObstacleEvent = {
  kind: ObstacleKind;
  spawnAt: number;     // mission time (s)
  lifeSec: number;
  position: [lat, lon, alt];
  behavior: "track" | "random" | "swarm";
  damage: number;
  reward: { credits: number; missiles: number };
};

function generateObstacles(seed: number, missionLengthSec: number, tier: string): ObstacleEvent[];
```

매 미션 시작 시 시드 (날짜 + 회수) → 5종 랜덤 조합. MissionScene 통합.

### W4-D. 우주 페이즈 + GitHub 라이브러리

**조사 후보** (gh search 결과 후 1/2 응답):
- three.js space games / nebula / galaxy shaders
- R3F space combat
- NASA 자산 (별자리, ISS, Mars 등)

**`/space` 페이지 + Space scene 컴포넌트**:
- 지구 → LEO → 달 → 화성 (티어/숙련도)
- 우주선 적 + 우주 미사일 + 행성/소행성 회피

### W4-E. 음향 우주전 BGM (Lyria 6트랙) + TTS

**Lyria 프롬프트 세트** (`scripts/generate-bgm-spacewar.mjs`):
1. `epic-space-battle` — orchestral 110bpm brass swells choir percussion
2. `tense-ambient` — sci-fi 90bpm low strings synth pulses
3. `interstellar-drama` — piano + strings building tension
4. `space-opera` — fanfare brass triumphant
5. `deep-space` — loneliness cinematic ambient
6. `alien-combat` — aggressive electronic + orchestra

**BGM_POOL 카테고리화** (`lib/audio.ts`):
```typescript
const BGM_BY_PHASE = {
  menu: ["cyber-news.mp3"],
  flight: ["epic-space-battle.mp3", "tense-ambient.mp3"],
  strike: ["alien-combat.mp3"],
  space: ["interstellar-drama.mp3", "space-opera.mp3", "deep-space.mp3"],
};

function pickBGMForPhase(phase: GamePhase): string;
```

**TTS** (`components/voice/voice-engine.ts` 신규):
- melotts 로컬 호출 (CPU 실시간 한국어)
- 사전 합성 + 캐시: "미션 시작" / "타겟 락온" / "포탄 잔량 1발" / "위험: 지대공 미사일" / "임무 성공" / "임무 실패"
- 음원 파일 사전 생성 → `/public/audio/voice/*.mp3`
- `voice.play("mission_start")` 인터페이스

### W4-F. 시각 영상화 (1/2 응답: Veo vs Hailuo)

전투기 선택 / 비행 cutscene / 이동 영상 — 비용 비교:
- **Veo 3.1**: $0.40/s × 3s × 5 영상 = $6 (고품질, 즉시)
- **Hailuo (Auto-Whisk Chrome 확장)**: 무료 + 시간 (배치)

### W4-G. 모바일 UI 최적화

- 글씨 14px+ / 아이콘 우선
- 가로 강제 (CSS rotate hint)
- 햅틱 (Web Vibration API)
- 큰 터치 영역 (최소 44px²)

---

## 진행 상태 추적

| 단계 | 상태 | 자율/1-2 | 비고 |
|------|------|----------|------|
| W4-A 결제 | 🔄 진행 | 자율 (push 전 확인) | tiers.ts + missilesSlice + 모달 |
| W4-B 흐름 | ⏸️ 대기 | 1/2 (큰 변경) | phase 머신 재정의 |
| W4-C 방해물 | ⏸️ 대기 | 자율 | obstacles.ts + MissionScene 통합 |
| W4-D 우주 | ⏸️ 1/2 | 1/2 (라이브러리 채택) | gh search 후 |
| W4-E 음향 | 🔄 진행 | 자율 (Lyria 비용 zero) | BGM 6트랙 + voice |
| W4-F 영상 | ⏸️ 1/2 | 1/2 (비용 결정) | Veo vs Hailuo |
| W4-G 모바일 | ⏸️ 대기 | 자율 | UI 다듬기 |

---

## 외출 모드 자율 작업 (2026-04-25)

진행 중 (push 전 보고):
1. MASTER-PLAN.md 작성 ✅
2. GitHub 우주 라이브러리 후보 조사
3. W4-A 결제 코드 (tiers.ts + missilesSlice + 모달)
4. W4-E Lyria 6트랙 생성 + BGM_POOL 카테고리화
5. voice-engine.ts (melotts 통합)

대기 (사용자 1/2 응답):
- 우주 라이브러리 채택 (W4-D)
- 영상 도구 (W4-F)
- W4-B 게임 흐름 적용 시점

---

*인수일: 2026-04-25. 사령관 변경 시 이 문서 + COMMAND-JOURNAL.md 함께 읽기.*
