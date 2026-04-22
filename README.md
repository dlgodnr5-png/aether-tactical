# Aether Tactical

전술 지휘소 웹앱. Next.js 16 + React 19 + Tailwind 4 + Three.js.

**라이브**: https://aether-tactical.vercel.app

## 페이지

| 경로 | 설명 |
|---|---|
| `/` | 지휘소 홈 (크레딧·고도 대시보드 + 부트 시퀀스) |
| `/fleet` | 2026 최신 전투기 5종 쇼케이스 (실사 이미지 + 3D 폴백) |
| `/flight` | 항모 이륙 인트로 + 고도 파랄럭스 HUD |
| `/targets` | Leaflet 위성 지도로 목표 지점 설정 |
| `/strike` | 타격 콘솔 — **미사일 (SPACE) + 폭탄 (F) + 3D 작전 진입** |
| `/mission` | 풀 3D 액션 모드 — 조향(WASD)·발사(SPACE)·부스트(SHIFT)·콕핏(V) |
| `/exchange` | Stripe 결제 (연동 예정) 패키지 |

## 주요 기술

- **3D**: Three.js + @react-three/fiber + drei. 실제 비행 물리 (속도 벡터·피치/요/롤·뱅크 턴·중력·드래그·양력)
- **오디오**: Web Audio API 절차적 제트 엔진 (sub-bass + whine + scream + roar + compressor), 미사일 whoosh, 폭발 boom, 런치 스팅어
- **상태**: Zustand
- **맵**: Leaflet + ArcGIS satellite tiles
- **애니메이션**: Anime.js v4
- **폰트**: Pretendard Variable + Orbitron

## 개발

```bash
npm install
npm run dev    # http://localhost:3000
npm run build  # 프로덕션 빌드
```

## 환경 변수

`.env.local` 생성 (샘플: `.env.local.example`):

```
GROK_API_KEY=xai-...    # 이미지 생성 스크립트용 (옵션)
```

## 유용한 스크립트

- `scripts/generate-fleet-images.mjs` — Grok Imagine API로 Fleet 이미지 5장 재생성
- `scripts/setup-github.sh` — GitHub 리포 생성 + push + Vercel git 연동 (최초 1회)

## 배포 (GitHub → Vercel 자동 배포 설정)

1. **GitHub 인증** (1회):
   ```bash
   gh auth login
   # 화면 지시 따라 → GitHub.com → HTTPS → Login with browser
   ```

2. **연동 스크립트 실행** (1회):
   ```bash
   bash scripts/setup-github.sh
   ```
   - 리포 `aether-tactical` 생성
   - origin 추가 + 현재 master push
   - Vercel 프로젝트를 GitHub에 연결

3. **이후**: `git push`마다 Vercel 자동 배포됩니다.

## 수동 배포 (GitHub 없이)

```bash
vercel --prod --yes
```

## 스택

```
next@16.2.4  react@19.2.4  typescript@5  tailwindcss@4
three@0.172  @react-three/fiber@9.1  @react-three/drei@10.0
animejs@4.0.2  zustand@5.0.12  leaflet@1.9.4  phaser@4.0.2
stripe@22.0.2  clsx@2.1.1
```
