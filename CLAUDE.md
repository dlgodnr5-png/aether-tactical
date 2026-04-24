@AGENTS.md

## 부사령관: OpenAI o3

Claude가 해결 못 하거나 교차 검증이 필요한 복잡한 작업은 `openai-coder` 서브에이전트로 위임한다.

### CLI 호출
```bash
python "D:/Naver MYBOX/06 main/program-main/tools/openai_coder/coder.py" \
  --prompt "TASK 설명" --model o3-mini
```

모델 옵션: `o3-mini` (기본), `o1`

### Claude Code에서 호출
```
Agent(subagent_type="openai-coder", description="...", prompt="...")
```

### 키 로드
`coder.py`는 다음 순서로 `OPENAI_API_KEY`를 탐색한다:

1. 시스템 환경변수
2. `cwd/.env.local` ← **이 프로젝트는 여기에 키가 있음**
3. `cwd/.env`
4. `program-main/.env` (전역 fallback)

따라서 aether-tactical 디렉터리에서 실행하면 자동으로 `.env.local`의 키를 읽는다.

---

## 배포: Cloudflare Workers (OpenNext)

### 로컬 빌드 불가 (Windows)
OpenNext 어댑터가 Windows에서 크래시함. 로컬 `npm run cf:build` 시 silent exit.
→ **GitHub Actions CI만 사용** (`.github/workflows/cloudflare-deploy.yml`).
→ 로컬 테스트는 WSL 필요.

### 최초 1회 셋업

1. **Cloudflare 계정**:
   - https://dash.cloudflare.com/profile/api-tokens → "Create Custom Token"
   - 권한: `Account · Workers Scripts · Edit`
   - Account ID 확인: 대시보드 우측 사이드바

2. **GitHub Secrets 설정** (`https://github.com/dlgodnr5-png/aether-tactical/settings/secrets/actions`):
   ```
   CLOUDFLARE_API_TOKEN
   CLOUDFLARE_ACCOUNT_ID
   NEXT_PUBLIC_FIREBASE_API_KEY
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   NEXT_PUBLIC_FIREBASE_PROJECT_ID
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
   NEXT_PUBLIC_FIREBASE_APP_ID
   NEXT_PUBLIC_CESIUM_ION_TOKEN
   ```

3. **Worker 런타임 Secret** (wrangler CLI, 1회):
   ```bash
   # WSL 또는 GitHub Codespaces에서
   npx wrangler login
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```

### 이후 배포
- `git push origin master` → 자동 배포
- URL: `https://aether-tactical.<account-subdomain>.workers.dev`

### Vercel 관계
Vercel 배포(`aether-tactical.vercel.app`)는 병행 유지.
