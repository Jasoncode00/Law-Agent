# SKEP Law Agent - CLAUDE.md

## 프로젝트 개요
SKEP 건설회사 사내 법령 검색/해석 AI Agent. 사용자 페르소나( 설계/인허가, 시공/안전, 계약/원가, 품질관리 등)에 따라 법령을 실무 관점에서 해석하여 안내한다. korean-law MCP 서버를 통해 국가법령정보센터 API에 접근하며, Azure OpenAI(GPT) 또는 Claude API를 LLM으로 사용한다.

---

## 현재 개발 상태

### Phase 1 (완료) - Backend 핵심
- FastAPI 서버, SSE 스트리밍 채팅 API
- Azure OpenAI (gpt-5.1-chat) + Anthropic Claude 멀티 LLM 지원
- korean-law MCP 서버 연동 (stdio 방식)
- 페르소나 시스템 3종 (설계/시공/영업)
- Tool Use 루프 (MCP 도구 자동 선택 및 호출)

### Phase 2 (완료) - Frontend
- Next.js 16 + TypeScript + Tailwind CSS
- 채팅 인터페이스 (SSE 스트리밍 실시간 표시)
- 페르소나 선택 화면
- Perplexity 스타일 인용 시스템 (`[1][2][3]` 번호 자동 생성)
- 인용 클릭 시 직접 API 호출로 해당 조문 원문 표시
- 대화 세션 관리 (localStorage 기반 히스토리)
- 사이드바 (대화 목록, 접기/펼치기)

### Phase 3 (진행 중) - 인증 + 배포
- JWT 인증 (사내 사용자 접근 제어) — 미완료
- Docker + Docker Compose 컨테이너화 — **Dockerfile/docker-compose.yml 작성 완료**
- GCP Cloud Run 또는 GCE VM 배포 예정

### 향후 (별도 요청 시) - RAG
- ChromaDB + multilingual-e5-large 임베딩
- 사내 문서(HWP/PDF) 벡터 DB 인덱싱
- MCP와 RAG를 Claude Tool로 동시 등록

---

## 기술 스택

| 레이어 | 기술 | 비고 |
|--------|------|------|
| Backend | Python FastAPI 0.115+ | REST API, SSE 스트리밍 |
| LLM | Azure OpenAI (gpt-5.1-chat) / Anthropic Claude | `.env`의 `LLM_PROVIDER`로 전환 |
| MCP | mcp Python SDK 1.26+ | korean-law-mcp 서버 stdio 연결 |
| Frontend | Next.js 16 + TypeScript | App Router |
| UI | Tailwind CSS v4 | CSS 변수 기반 테마 |
| 배포 | Docker + Docker Compose | Dockerfile 완성, docker-compose.yml 포함 |

---

## 프로젝트 구조

```
Law Agent/
├── CLAUDE.md                          ← 본 파일
├── .env                               ← API 키 및 환경 변수 (gitignore 필요)
├── .env.example                       ← 환경 변수 템플릿
├── docker-compose.yml                 ← Backend + Frontend 통합 실행
│
├── backend/
│   ├── Dockerfile                     ← python:3.11-slim + Node.js 20 (MCP용)

│   ├── pyproject.toml                 ← Python 의존성
│   └── app/
│       ├── main.py                    ← FastAPI 앱 + CORS + 라우터 등록
│       ├── config.py                  ← pydantic-settings 환경 변수
│       ├── api/routes/
│       │   ├── chat.py                ← POST /api/chat (SSE 스트리밍)
│       │   ├── law.py                 ← GET /api/article (조문 직접 조회)
│       │   ├── personas.py            ← GET /api/personas/
│       │   └── health.py              ← GET /api/health
│       ├── core/
│       │   ├── agent.py               ← LLM + MCP Tool Use 오케스트레이터
│       │   ├── llm_provider.py        ← Claude / Azure OpenAI 추상화
│       │   ├── mcp_client.py          ← korean-law MCP 서버 stdio 연결
│       │   ├── personas.py            ← 페르소나 정의 + COMMON_TOOL_STRATEGY
│       │   └── streaming.py           ← SSE 이벤트 포맷 유틸
│       ├── models/
│       │   └── schemas.py             ← Pydantic 요청/응답 모델
│       └── utils/
│           ├── llm_utils.py           ← MCP→LLM Tool 스키마 변환
│           └── logger.py              ← 로깅 설정
│
└── frontend/
    ├── Dockerfile                     ← 멀티스테이지 빌드 (builder + runner, node:20-slim)
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx               ← 페르소나 선택 화면 (랜딩)
        │   ├── globals.css            ← CSS 변수 테마, 법령 콘텐츠 스타일
        │   └── chat/
        │       └── page.tsx           ← 메인 채팅 화면
        ├── components/
        │   ├── ChatWindow.tsx         ← 채팅 메시지 목록
        │   ├── ChatInput.tsx          ← 입력창 + 전송/중단 버튼
        │   ├── ChatSidebar.tsx        ← 대화 히스토리 사이드바
        │   ├── MessageBubble.tsx      ← 인용 시스템 + 마크다운 렌더링
        │   ├── LawViewer.tsx          ← 우측 법령 원문 패널
        │   ├── ToolBadge.tsx          ← MCP 도구 호출 표시 배지
        │   └── PersonaSelector.tsx    ← 페르소나 선택 카드
        ├── hooks/
        │   ├── useChat.ts             ← SSE 스트리밍 훅
        │   └── useChatHistory.ts      ← localStorage 세션 관리
        └── lib/
            ├── api.ts                 ← Backend API 클라이언트
            ├── lawParser.ts           ← MCP 응답 파싱 (TextContent, 조문 분리)
            └── types.ts               ← 공유 타입 정의
```

---

## Docker 배포

### 빌드 및 실행

```bash
cd "d:/SKEC Files/Claude Code/Law Agent"

# .env 파일이 루트에 있어야 함 (docker-compose env_file로 backend에 주입)
docker-compose up --build
```

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`

### 외부 서버 배포 시

IP 변경 없이 `BACKEND_URL` 환경변수만 수정 후 컨테이너 재시작:

```yaml
# docker-compose.yml — 기본값 그대로 사용 (Docker 내부 네트워크)
frontend:
  environment:
    - BACKEND_URL=http://backend:8000   # Docker 네트워크 내부 서비스명으로 접근
```

브라우저에서는 서버 IP:3000에 접속하면 되고, `/api/*` 요청은 Next.js가 자동으로 backend 컨테이너로 중계한다. 재빌드 불필요.

### 아키텍처 — API 프록시 방식

브라우저가 직접 backend URL을 알 필요가 없다. 모든 API 호출은 상대경로(`/api/*`)로 하며, Next.js 서버가 내부적으로 backend로 중계한다.

```
브라우저 → /api/chat → Next.js(:3000) → http://backend:8000/api/chat
```

`next.config.ts`의 `rewrites()`가 프록시 역할을 수행. `BACKEND_URL` 환경변수(서버사이드)로 대상 주소를 제어하므로 IP가 바뀌어도 재빌드 없이 컨테이너 재시작만으로 적용된다.

---

## 서버 실행 방법 (로컬 개발)

### Backend (로컬)

```bash
cd "d:/SKEC Files/Claude Code/Law Agent/backend"
source venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

Swagger UI: `http://localhost:8000/docs`

### Frontend (로컬)

```bash
cd "d:/SKEC Files/Claude Code/Law Agent/frontend"
npm run dev
```

브라우저: `http://localhost:3000`  
Backend가 `http://localhost:8000`에서 먼저 실행되어 있어야 한다.

---

## 환경 변수 (.env)

```env
# LLM 설정
LLM_PROVIDER=openai          # openai = Azure OpenAI, claude = Anthropic
LLM_MODEL=gpt-5.1-chat

# Azure OpenAI
AZURE_OPENAI_ENDPOINT=https://skep-ai-board-for-test-foundry.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.1-chat-ai-board-test
AZURE_OPENAI_API_VERSION=2024-05-01-preview
OPENAI_API_KEY=...

# Claude 사용 시
# LLM_PROVIDER=claude
# LLM_MODEL=claude-sonnet-4-6
# ANTHROPIC_API_KEY=sk-ant-...

# MCP 설정
MCP_SERVER_COMMAND=korean-law-mcp
LAW_OC=jason00
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/health` | 서버 상태 및 현재 LLM Provider 확인 |
| GET | `/api/personas/` | 사용 가능한 페르소나 목록 |
| POST | `/api/chat` | 페르소나 기반 법령 질의 (SSE 스트리밍) |
| GET | `/api/article?law=건축법&article=제64조` | 특정 조문 원문 직접 조회 |

### POST /api/chat 요청 형식

```json
{
  "persona": "design-engineer",
  "message": "내화구조 기준 알려줘",
  "history": []
}
```

### 페르소나 ID

| ID | 이름 | 주요 관심 법령 |
|----|------|--------------|
| `design-engineer` | 설계 엔지니어 | 건축법, 소방시설법, 주택법 |
| `construction-engineer` | 시공 엔지니어 | 산업안전보건법, 중대재해처벌법, 건설기술진흥법 |
| `sales-team` | 영업팀 | 도시정비법, 국가계약법, 주택공급규칙 |

### SSE 이벤트 종류

```
event: tool_call     ← LLM이 MCP 도구 호출 시작
event: tool_result   ← MCP 도구 실행 결과
event: content       ← LLM 답변 텍스트 스트리밍
event: error         ← 오류 발생
event: done          ← 응답 완료
```

---

## gstack

웹 브라우징이 필요한 경우 항상 `/browse` 스킬(gstack)을 사용한다. `mcp__claude-in-chrome__*` 도구는 절대 사용하지 않는다.

**사용 가능한 스킬:**
`/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

스킬이 동작하지 않으면: `cd ~/.claude/skills/gstack && ./setup`

**이 프로젝트 품질 검증 순서:**
1. `/review` — 코드 리뷰 (프로덕션 버그 탐지)
2. `/qa http://localhost:3000` — 실제 브라우저로 UI/기능 검증
3. `/cso` — 보안 감사 (dangerouslySetInnerHTML 등 XSS 위험 포인트)
4. `/ship` — 테스트 실행 + PR 생성

---

## 주요 아키텍처 결정

### 1. 인용 클릭 → 직접 API 호출 방식

인용(`[1] 건축법 제64조`)을 클릭하면 LLM이 이미 조회한 결과를 파싱하는 대신,  
프론트엔드가 `/api/article` 엔드포인트를 직접 호출하여 해당 조문만 정확하게 가져온다.

```
클릭 → fetchArticle("건축법", "제64조")
     → GET /api/article?law=건축법&article=제64조
     → search_law("건축법") → MST 추출
     → get_law_text(mst=273437, jo=제64조)
     → 조문 원문 반환
```

**이유:** LLM 도구 응답(TextContent Python repr 형식)을 파싱하는 방식은 특수문자나 긴 본문에서 잘릴 수 있어 신뢰성이 낮다. 직접 호출 방식은 항상 완전한 원문을 반환한다.

### 2. get_law_text의 `jo` 파라미터 사용

`get_law_text(mst=..., jo=제64조)`는 해당 조문 하나만 반환한다.  
`jo` 파라미터 없이 전체 법령 텍스트를 받아 파싱하면 조문 경계 처리가 복잡하고 오류가 발생한다.

### 3. MST vs 법령ID 구분

`search_law` 응답에는 두 가지 식별자가 있다:
- `법령ID: 001823` → `lawId` (구 식별자)
- `MST: 273437` → `mst` (법령일련번호, `get_law_text`에서 사용)

`get_law_text`에는 반드시 `mst`를 전달해야 한다. `법령ID`를 `mst`로 잘못 전달하면 조회 실패.

### 4. 대화 세션 관리

`useChatHistory` 훅이 localStorage에 세션을 저장한다.  
세션 전환 시 `suppressCallbackRef`를 사용해 `loadEntries()` 호출이 `updatedAt`을 갱신하지 않도록 한다 (사이드바 순서가 바뀌는 버그 방지).

### 5. 도구 호출 전략 (COMMON_TOOL_STRATEGY)

모든 페르소나의 시스템 프롬프트에 동일 전략이 포함되어, LLM이 질문 유형에 따라 도구를 선택한다:

- **법령 질문:** `search_ai_law` → `search_law` → `get_law_text`
- **판례 질문:** `search_precedents` → `get_precedent_text`
- **행정심판/법령해석:** `search_admin_appeals` 또는 `search_interpretations`
- **복합 절차 질문:** `chain_procedure_detail`, `chain_dispute_prep`, `chain_full_research` 중 택1

---

## 개발 시 주의사항

1. **MCP 연결:** `korean-law-mcp` 명령어가 PATH에 등록되어 있어야 함. `LAW_OC` 환경변수 필수.
2. **Azure OpenAI 스트리밍:** 빈 `choices` 청크가 올 수 있으므로 `if not chunk.choices: continue` 처리 필요.
3. **Tool Use 루프:** `agent.py`에서 최대 5회 루프. 무한 도구 호출 방지용. 필요 시 `max_loops` 조정.
4. **LLM 전환:** `.env`에서 `LLM_PROVIDER` 변경만으로 Claude ↔ Azure OpenAI 전환 가능.
5. **법령 인용 형식:** LLM이 `[건축법] 제64조` 패턴으로 인용해야 프론트엔드가 인식함. 시스템 프롬프트에 명시되어 있음.

---

## 주요 버그 수정 이력

| 날짜 | 파일 | 내용 |
|------|------|------|
| 2026-03-31 | `llm_provider.py` | `AsyncAzureOpenAI` import 누락, 빈 `choices` 배열 IndexError 수정 |
| 2026-03-31 | `mcp_client.py` | MCP 명령어 `npx -y @law-agent/korean-law` → `korean-law-mcp`, `LAW_OC` 환경변수 전달 추가 |
| 2026-03-31 | `core/agent.py` | 스트리밍 청크가 `name`/`id`를 null로 덮어쓰는 버그 수정 |
| 2026-04-07 | `api/routes/law.py` | MST/법령ID 혼용 버그 수정, `jo` 파라미터로 특정 조문만 조회하도록 변경, 잘못된 `search_ai_law` 폴백 제거 |
| 2026-04-07 | `hooks/useChatHistory.ts` | 세션 전환 시 사이드바 순서 변경 버그 수정 (`suppressCallbackRef`) |
| 2026-04-07 | `lib/lawParser.ts` | `extractTextContent()` 정규식 → 문자 단위 스캔으로 재작성 (법령 본문 잘림 방지) |
