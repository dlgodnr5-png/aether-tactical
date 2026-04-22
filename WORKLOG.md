# Aether-Tactical 작업 로그

> 최종 업데이트: 2026-04-22
> 라이브: **https://aether-tactical.vercel.app**
> 저장소: `D:\Naver MYBOX\05 프로그램\1인기업\aether-tactical`

---

## 현재 상태

- **프로덕션 배포**: Vercel 직배포 (aether-tactical.vercel.app 별칭)
- **빌드**: `npm run build` 통과, TypeScript strict OK, 10 페이지 정적 프리렌더
- **Git 리모트**: 아직 연결 안 됨 (로컬 master만 존재). GitHub 연동 대기 중 (사용자 1회 auth 필요)

---

## 완료된 Phase 요약

### Phase A — 파운데이션
- 한글 폰트 Pretendard Variable + Orbitron 도입 (Noonnu 의무)
- 유틸 클래스: `.glass` `.bevel` `.noise` `.holo-shimmer` `.radar-sweep` `.radial-vignette`
- `lib/anime-presets.ts` — Anime.js v4 프리셋 (`bootTimeline`, `numberTick`, `magneticHover`, `tiltCard`, `ripple`, `scrambleText`)
- `lib/audio.ts` — HTMLAudio SFX 풀 + localStorage 토글 유지

### Phase B — fx 컴포넌트 키트 (7개)
- `AmbientLayer` — 캔버스 스타필드 + 레이더 스윕 + 노이즈 + 비녜트
- `BootSequence` — 세션 1회 타이프라이터
- `GlassCard` — glass/bevel/noise + 틸트 옵션
- `MagneticButton` — 매그네틱 hover + ripple + sfx:press
- `NumberTicker` — tabular-nums 트윈 카운터
- `TargetLockRing` — SVG 락온 레티클
- `AudioEngageToggle` — BGM ON/OFF 토글 (TopBar)
- `JetSilhouette` — 5변형 SVG 전투기 실루엣

### Phase C — 6페이지 + TopBar + BottomNav
- 모든 페이지에 FX 키트 배선, Korean 폰트 적용

### Phase D — 검증
- 빌드·타입·접근성(prefers-reduced-motion) 통과

### Phase E — 3D 턴테이블 + 항모 이륙 + 고도 파랄럭스
- `FleetShowcase` — 3D 캔버스 턴테이블 Y축 회전
- `CarrierLaunch` — 항모 갑판 원근 컷신 (갑판·섬·케이블·카운트다운)
- `AltitudeHorizon` — 고도별 하늘 그라디언트 + 구름 3레이어 파랄럭스

### Phase F — 3D Mission 모드 (/mission)
- `JetModel3D` — three.js 프리미티브 스텔스 전투기 (라테 동체 / 조종석 내부 / 랜딩기어 / 네비라이트 / 에어인테이크 / 패널 라인 / 윙팁 미사일)
- `MissionScene` — r3f Canvas + 실제 비행 물리 (속도 벡터 / 피치·요·롤 / 뱅크 턴 커플링 / 중력 / 드래그 / 양력)
- `JetGLTF` — `/models/fighter.glb` 자동 감지 + primitive 폴백
- `engine-audio.ts` — Web Audio 절차적 엔진 사운드 (서브베이스·whine·scream·roar·컴프)
- 3 티어 고도 시스템 ($1/$5/$10 → 10km/100km/400km), 크레딧 차감
- 국경 크로싱 이벤트 → 적기 스폰
- 장애물(민간기·적기·소행성) 스폰 루프 + 미사일 격추 + 폭발 파티클
- 체이스 / 콕핏 (V) 카메라 토글, WASD·마우스 조향, SPACE 발사, SHIFT 부스트

### Fleet 최신 전투기 Top 5 (Grok Imagine API 생성 실사 이미지)
| ID | 기체 | 국가 | 세대 |
|---|---|---|---|
| f35  | F-35 Lightning II  | USA      | 5세대 |
| j20  | J-20 Mighty Dragon | China    | 5세대 |
| kf21 | KF-21 보라매       | Korea    | 4.5세대 |
| f22  | F-22 Raptor        | USA      | 5세대 |
| kaan | KAAN               | Türkiye  | 5세대 |

`public/images/fleet/{slug}.jpg` 5장 저장됨. 좌상단 국가·세대 뱃지 표시.

### /strike 미사일 시스템 (최신)
- 🚀 **미사일** SPACE (50 CR) — BL/BR 랜덤 발사구 → 크로스헤어 CSS 애니 프로젝타일 → 임팩트 폭발
- 💣 **폭탄** F (100 CR) — 3-2-1 카운트다운
- ⚔ **3D 작전** → /mission 진입
- HITS / SCORE / CREDITS / MSL 콤배트 패널
- ENGAGE AUDIO 토글 (시네마틱 앰비언트)

### 시네마틱 오디오 레이어 (최신)
- 서브베이스 드론 35-60Hz
- 디튠 saw whine 120-340Hz + LFO 비브라토
- Bandpass 필터 square scream (3x whine 하모닉)
- Pink-noise bandpass roar
- DynamicsCompressor 마스터 펀치
- 1-shot: `launchStinger` (brass swell) / `missileWhoosh` / `explosion` / `bombRelease` / `lockOn`

---

## 전체 파일 구조 (주요)

```
aether-tactical/
├── app/
│   ├── page.tsx              # 홈
│   ├── fleet/page.tsx        # 5기체 쇼케이스
│   ├── flight/page.tsx       # 비행 HUD
│   ├── targets/page.tsx      # Leaflet 타겟팅
│   ├── strike/page.tsx       # 미사일+폭탄 콘솔 ⭐
│   ├── mission/page.tsx      # 3D 작전 모드 ⭐
│   ├── exchange/page.tsx     # 결제 (Stripe placeholder)
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── TopBar.tsx / BottomNav.tsx / TargetsMap.tsx / StrikeMap.tsx
│   └── fx/
│       ├── AmbientLayer.tsx · BootSequence.tsx · GlassCard.tsx
│       ├── MagneticButton.tsx · NumberTicker.tsx · TargetLockRing.tsx
│       ├── AudioEngageToggle.tsx · JetSilhouette.tsx
│       ├── FleetShowcase.tsx · CarrierLaunch.tsx · AltitudeHorizon.tsx
│       ├── JetModel3D.tsx · JetGLTF.tsx · MissionScene.tsx
├── lib/
│   ├── anime-presets.ts · audio.ts · engine-audio.ts
├── store/gameStore.ts        # zustand (credits, fuel, altitude, target, plane)
├── public/
│   ├── audio/bgm/cyber-news.mp3
│   ├── audio/sfx/{nav,press,lock,boot}.mp3
│   ├── images/fleet/{f35,j20,kf21,f22,kaan}.jpg
│   └── models/                # (비어있음 — 선택적 .glb 드롭 슬롯)
└── scripts/
    ├── generate-fleet-images.mjs   # Grok Imagine API 5장 재생성
    └── setup-github.sh             # GitHub + Vercel git 연동
```

---

## 커밋 히스토리 (master)

| SHA | 설명 |
|---|---|
| `9d2f3d7` | chore: GitHub + Vercel 연동 셋업 스크립트 & README |
| `2f54a1d` | feat: 웅장한 시네마틱 오디오 + /strike 미사일 인터랙션 |
| `4f069fa` | feat(fleet): 2026 세계 최신 전투기 Top 5 실사 이미지 |
| `f8a537e` | feat(fleet): 실사 이미지 히어로 + 3D 폴백 + Grok 생성 스크립트 |
| `afcbbca` | fix(mission): r3f 크래시 해결 + /mission 항모 이륙 인트로 |
| `94168ee` | feat(fleet): 3D 메시로 Fleet 쇼케이스 교체 |
| `a4bcbe7` | feat: aether-tactical 프리미엄 UI + 3D mission mode |
| `704a47f` | Initial commit from Create Next App |

---

## 의존성 주요 추가

```
three@0.172.0 @react-three/fiber@9.1.0 @react-three/drei@10.0.6
animejs@4.0.2 clsx@2.1.1
@types/three@0.172.0 @types/animejs@3.1.12
```

---

## 설정 변화 (영구)

- **전역 `~/.claude/settings.json`**: Grok API 호출 + 크로스 프로젝트 .env 읽기 허용 룰 10개 추가
- **`.env.local`** (gitignored): `GROK_API_KEY=xai-run6pkdw…` 저장됨
- **GitHub CLI 2.90.0** 설치됨 (winget via `/c/Program Files/GitHub CLI/gh.exe`)

---

## 남은 작업 (복귀 후)

### 1. GitHub 연동 (5분)
```bash
cd "d:/Naver MYBOX/05 프로그램/1인기업/aether-tactical"
gh auth login                    # 브라우저로 HTTPS 인증
bash scripts/setup-github.sh     # 리포 생성 → push → Vercel 연결
```
이후 `git push`마다 Vercel 자동 배포.

### 2. Stitch MCP 재인식 대기
`claude mcp list`에 아직 미노출. Claude Code 재시작 후 다음 세션에서 Stitch 디자인 가져와 비교·적용 예정.

### 3. Firebase 배선 (유즈케이스 지시 필요)
- Auth (로그인/OAuth)? → `firebase/auth` + `/app/login` 또는 TopBar 로그인 버튼
- Firestore (스코어보드·유저 데이터)? → gameStore를 Firestore sync로 확장
- Storage (유저 업로드 .glb)?

### 4. PayPal 배선 (유즈케이스 지시 필요)
- `/exchange`의 기존 Stripe placeholder를 PayPal Checkout SDK로 교체?
- 또는 Stripe 병행 (결제 방식 선택 UI)?
- 크레딧 패키지 충전 → zustand store `addCredits` 호출

### 5. (선택) 실사 3D .glb 모델
- Sketchfab CC0 파이터 제트 `.glb` 파일 한 개 받아서 `public/models/fighter.glb`에 드롭
- `JetGLTF.tsx`가 HEAD 프로브로 자동 감지 → primitive 대체
- 크기 안 맞으면 `gltfScale` prop 조정

### 6. (선택) Fleet 이미지 영상 업그레이드
- Grok Imagine Video API ($0.05/sec × 3초 × 5기체 = $0.75)
- `scripts/generate-fleet-videos.mjs` 추가 (`generate-fleet-images.mjs` 패턴 복사)
- FleetShowcase를 `<video autoplay loop muted>`로 전환

---

## 자주 쓰는 명령

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드 + 타입체크
npm run build

# Vercel 직배포 (GitHub 없이)
vercel --prod --yes

# Fleet 이미지 재생성 (프롬프트 수정 후)
node scripts/generate-fleet-images.mjs

# GitHub 연동 (1회)
gh auth login
bash scripts/setup-github.sh
```

---

## 현재 기동 중인 백그라운드

- Next.js dev 서버 (localhost:3000) — 초기에 기동, 세션간 유지 여부 모름

---

## 트러블슈팅 메모

- **Grok Imagine 503**: 일시적 과부하. 5-10초 백오프 후 재시도로 해결됨 (J-20 사례)
- **r3f removeChild 크래시**: 중첩 setState + 조건부 언마운트 조합. 해결법: 엔티티 ref 기반 관리 + `visible` prop 토글
- **delta time spike**: 탭 비활성 후 복귀 시 물리 폭발. useFrame delta를 0.05초로 clamp
- **Next 16 JSX namespace**: React 19는 `JSX` global 없음. `import type { ReactElement } from "react"` 사용

---

## 디자인 기준 (설계 근거)

- **design-spells** (Noonnu 한글 폰트 의무) 스킬 준수 → Pretendard Variable
- **animejs-animation** (스프링 이징·stagger 의무) 준수 → spring(1,80,10,0) + stagger(80)
- **bgm-sfx-arsenal** 무기고 자산 선별 → cyber-news BGM + 4 SFX
- **claude-design-sys-prompt** (CL4R1T4S) → glass/bevel/noise 깊이감 패턴

---

*작성: 2026-04-22. 복귀 시 이 문서부터 읽고 "남은 작업" 섹션 우선순위 정하세요.*
