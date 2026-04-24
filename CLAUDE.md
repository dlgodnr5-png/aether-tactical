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
