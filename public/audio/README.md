# Audio assets

모든 오디오는 **CC0 (Public Domain)** 또는 호환 라이선스만 사용.

## 디렉토리 구조

```
public/audio/
├── bgm/
│   ├── menu/          메인 메뉴 앰비언트 (긴장감 있는 신시)
│   ├── combat/        도그파이트 BGM (전자/군사, 빠른 템포)
│   └── cinematic/     이륙/줌인 시네마틱 (웅장)
└── sfx/
    ├── carrier-catapult/  main.mp3  — 항모 카타펄트 이륙 (3~4초)
    ├── engine-loop/       afterburner.mp3 — 제트 엔진 루프 (30초+ 루프)
    ├── cannon/            burst.mp3 — 기관포 3연발 (0.3~0.5초)
    ├── missile-launch/    main.mp3 — 미사일 발사 (0.5초)
    ├── missile-flight/    whoosh.mp3 — 미사일 비행음 (1~2초)
    ├── explosion/         large.mp3, small.mp3
    ├── lock-on/           beep.mp3 — 레이더 락온
    ├── warning/           alert.mp3 — 경고 (낮은 HP 등)
    └── confirm/           hit.mp3, miss.mp3 — 타격/빗맞음 피드백
```

## 추천 소스 (CC0)

- **Freesound** https://freesound.org — 계정 필요, license 필터로 CC0
- **Pixabay** https://pixabay.com/sound-effects — 계정 불필요
- **Zapsplat Free** https://zapsplat.com — 계정 필요, 무료 티어 CC-BY (크레딧 명시 필요)

## 검색 키워드

| 필요 SFX | Freesound / Pixabay 검색어 |
|----------|----------------------------|
| 항모 카타펄트 | `jet catapult`, `aircraft carrier launch`, `steam catapult` |
| 엔진 루프 | `afterburner loop`, `jet engine loop`, `F-18 idle` |
| 기관포 | `gatling burst`, `cannon short burst`, `M61 vulcan` |
| 미사일 발사 | `AIM-120 launch`, `missile launch`, `sidewinder` |
| 미사일 비행 | `missile whoosh`, `rocket flyby`, `fast whoosh` |
| 대형 폭발 | `large explosion impact`, `bomb detonation` |
| 소형 폭발 | `small explosion pop`, `rocket impact` |
| 락온 | `radar lock beep`, `missile lock tone`, `RWR` |
| 경고 | `alert siren short`, `cockpit warning` |

## BGM 검색어

- Menu: `military tension ambient`, `dark synth`
- Combat: `fast paced electronic combat`, `military drums loop`
- Cinematic: `epic orchestral cinematic`, `heroic takeoff`

## 설치

파일을 위 디렉토리에 넣기만 하면 `lib/sfx-registry.ts`가 자동 로드.
파일이 없으면 dev 콘솔에 warning, prod에선 조용히 무음.

MP3 권장 (Safari 호환). 볼륨은 `lib/sfx-registry.ts`의 `opts.volume` 또는
파일 자체를 -12dB~-6dB로 노멀라이즈.
