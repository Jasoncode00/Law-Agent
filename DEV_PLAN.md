# SKEP Law Agent - 풀스택 개발 계획

## Context
SKEP 건설회사에서 사용할 **법령 검색/해석 Agent** 개발. 사용자의 페르소나(설계 엔지니어, 시공 엔지니어, 영업팀 등)에 따라 동일한 법령도 다른 관점으로 해석/안내해야 함. korean-law MCP 서버가 이미 설치되어 있으며, 최종적으로 AWS 또는 자체 서버에 배포 예정. RAG는 별도 요청 시 추가 예정 (현재 범위 제외).

## 사용 가능한 MCP 도구 (korean-law)

### 검색 도구
- `search_law` - 법령 검색
- `search_precedents` - 판례 검색
- `search_all` - 통합 검색
- `search_admin_appeals` - 행정심판 검색
- `search_interpretations` - 법령해석 검색
- `search_ordinance` - 자치법규 검색
- `search_english_law` - 영문법령 검색
- `search_ai_law` - AI 법령 검색

### 조회 도구
- `get_law_text` - 법령 전문 조회
- `get_precedent_text` - 판례 전문
- `get_article_history` - 조문 연혁
- `get_related_laws` - 관련 법령
- `get_three_tier` - 법령/시행령/시행규칙 3단 비교
- `get_annexes` - 별표/서식 조회

### 체인(워크플로우) 도구
- `chain_full_research` - 종합 법령 리서치
- `chain_law_system` - 법령 체계 분석
- `chain_procedure_detail` - 절차 상세 분석
- `chain_dispute_prep` - 분쟁 대비 분석
- `chain_amendment_track` - 개정 이력 추적
- `chain_action_basis` - 행위 근거 법령 분석

### 비교/분석 도구
- `compare_articles` - 조문 비교
- `compare_old_new` - 신구 조문 비교

### 용어 도구
- `get_daily_term` / `get_legal_term_detail` - 용어 해설

---

## 전체 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                     사내 사용자 (브라우저)                         │
│   ┌──────────┐  ┌──────────────┐  ┌──────────┐                  │
│   │설계 엔지니어│  │ 시공 엔지니어  │  │  영업팀   │  ← 페르소나 선택 │
│   └─────┬────┘  └──────┬───────┘  └─────┬────┘                  │
└─────────┼──────────────┼────────────────┼────────────────────────┘
          │              │                │
          ▼              ▼                ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Frontend (Next.js + TypeScript)                  │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐              │
│  │ 채팅 인터페이스│ │ 법령 뷰어     │ │ 검색 히스토리 │              │
│  └──────┬──────┘ └──────┬───────┘ └──────┬───────┘              │
└─────────┼──────────────┼────────────────┼────────────────────────┘
          │              │                │
          ▼    REST API (SSE 스트리밍)     ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Backend (Python FastAPI)                         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │            LLM Provider (추상화 레이어)                     │  │
│  │  ┌─────────────────┐  ┌─────────────────┐                │  │
│  │  │ ClaudeProvider   │  │ OpenAIProvider   │  ← .env 전환  │  │
│  │  │ (anthropic SDK)  │  │ (openai SDK)     │               │  │
│  │  └────────┬────────┘  └────────┬────────┘                │  │
│  │           └──────────┬─────────┘                          │  │
│  │                      ▼                                    │  │
│  │  ┌──────────────────────────────────────┐                │  │
│  │  │  시스템 프롬프트 (페르소나 기반)         │                │  │
│  │  │  + Tool Use (MCP 도구 호출)            │                │  │
│  │  └──────────────┬───────────────────────┘                │  │
│  └─────────────────┼─────────────────────────────────────────┘  │
│                    │                                             │
│  ┌─────────────────▼─────────────────────────────────────────┐  │
│  │              MCP Client (mcp Python SDK)                   │  │
│  │              korean-law MCP 서버 stdio 연결                 │  │
│  └─────────────────┬─────────────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              korean-law MCP Server (이미 설치됨)                  │
│  ┌───────────┐ ┌────────────┐ ┌───────────┐ ┌──────────┐       │
│  │ 검색 도구   │ │ 조회 도구   │ │ 체인 도구  │ │ 비교 도구 │       │
│  └─────┬─────┘ └─────┬──────┘ └─────┬─────┘ └────┬─────┘       │
└────────┼─────────────┼──────────────┼────────────┼──────────────┘
         ▼             ▼              ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│              국가법령정보센터 Open API (law.go.kr)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 기술 스택

### 왜 Python FastAPI + Next.js 인가?

| 비교 항목 | FastAPI (Python) | Express (Node.js) | Next.js 풀스택 |
|-----------|-----------------|-------------------|---------------|
| LLM SDK | anthropic, openai **모두 Python 1순위** | 공식 지원 | 서버리스와 MCP 충돌 |
| MCP SDK | `mcp` Python SDK 공식 지원 | 지원 | stdio 연결 제한 |
| REST API 문서 | **자동 생성** (Swagger /docs) | 수동 설정 | 수동 설정 |
| 스트리밍 | `StreamingResponse` 네이티브 | 가능 | SSE 제한적 |
| 향후 RAG 확장 | ChromaDB, LangChain **네이티브** | 열악 | 열악 |

### 기술 스택 전체 요약

| 레이어 | 기술 | 역할 |
|--------|------|------|
| **Frontend** | Next.js 15 + TypeScript | 채팅 UI, 페르소나 선택, 법령 뷰어 |
| **UI** | Tailwind CSS + shadcn/ui | 빠른 UI 개발, 반응형 |
| **Backend** | Python FastAPI 0.115+ | REST API, 비즈니스 로직 |
| **LLM** | anthropic SDK + openai SDK | **멀티 LLM 지원** (.env로 전환) |
| **MCP** | mcp SDK (Python) 1.26+ | korean-law MCP 서버 연결 |
| **배포** | Docker + Docker Compose | AWS ECS 또는 자체 서버 (Phase 3) |

---

## 핵심 기술적 고려사항 (Technical Considerations)

### 1. MCP 연동 및 자동화
- **실행 환경 격리:** `korean-law` MCP 서버 실행 명령어(`npx` 등)와 API Key를 백엔드 `.env`에서 관리하여 환경 변화에 유연하게 대응.
- **Tool 스키마 자동 변환:** MCP 서버의 JSON Schema를 Claude(`input_schema`)와 GPT(`parameters`) 형식으로 자동 변환하는 유틸리티(`llm_utils.py`) 구현.

### 2. 답변 품질 및 신뢰성
- **페르소나별 검색 가이드:** 시스템 프롬프트에 페르소나별 우선 순위 법령(예: 설계자-건축법, 시공자-산업안전보건법)을 명시하여 LLM의 도구 선택 정확도 향상.
- **구조화된 출처 인용 (Citations):** 모든 답변은 반드시 조문 ID와 조문 번호를 포함하도록 강제하고, 프론트엔드에서 이를 클릭 시 즉시 법령 뷰어로 연결되는 링크 제공.

### 3. 안정성 및 관측 가능성 (Observability)
- **에러 핸들링:** SSE 스트리밍 중 도구 호출 실패나 타임아웃 발생 시, 사용자에게 명확한 에러 메시지를 전달하는 프로토콜(`event: error`) 정의.
- **도구 호출 로깅:** LLM이 호출한 도구명, 입력 파라미터, 실행 결과를 로깅하여 할루시네이션 및 성능 모니터링.

### 4. 컨텍스트 및 성능 관리
- **토큰 관리:** `get_law_text` 등에서 반환된 방대한 법령 전문이 LLM 컨텍스트 한도를 넘지 않도록 요약 또는 청킹 전략 적용.
- **대화 이력 관리:** Phase 1에서는 메모리/세션 기반, Phase 3에서는 DB 기반의 대화 이력 관리 구현.

---

## LLM 멀티 프로바이더 설계

### Claude vs GPT - Tool Use 차이점

| 항목 | Claude API | GPT API (OpenAI) |
|------|-----------|-------------------|
| SDK | `anthropic` | `openai` |
| Tool 정의 | `tools: [{ name, input_schema }]` | `tools: [{ function: { name, parameters } }]` |
| Tool 호출 응답 | `tool_use` content block | `tool_calls` in message |
| Tool 결과 전달 | `tool_result` content block | `tool` role message |
| 스트리밍 | `stream=True` (SSE) | `stream=True` (SSE) |

### 추상화 구조

```python
# core/llm_provider.py - LLM 교체는 이 파일 + .env만 변경

class LLMProvider(ABC):
    """LLM 프로바이더 인터페이스"""
    async def chat_with_tools(self, messages, tools, system_prompt):
        """Tool Use 포함 채팅 - 스트리밍 반환"""
        ...

class ClaudeProvider(LLMProvider):
    """anthropic SDK 사용"""
    # tool_use block → MCP 도구 호출 → tool_result block 루프

class OpenAIProvider(LLMProvider):
    """openai SDK 사용"""
    # function_call → MCP 도구 호출 → tool role message 루프
```

```env
# .env에서 전환
LLM_PROVIDER=claude          # 또는 openai
ANTHROPIC_API_KEY=sk-ant-... # Claude 사용 시
OPENAI_API_KEY=sk-...        # GPT 사용 시
LLM_MODEL=claude-sonnet-4-20250514  # 또는 gpt-4o
```

**핵심:** MCP 도구 스키마를 각 LLM의 Tool 형식으로 변환하는 어댑터만 다름.
나머지 (페르소나, MCP 호출, 스트리밍)는 동일.

---

## 데이터 흐름 (요청 → 응답)

```
1. 사용자: "설계 엔지니어" 페르소나 선택 → "내화구조 기준 알려줘" 입력

2. Frontend → Backend: POST /api/chat
   { persona: "design-engineer", message: "내화구조 기준 알려줘" }

3. Backend (FastAPI):
   a. 페르소나 시스템 프롬프트 로드
   b. LLM Provider 선택 (환경 변수 기반)
   c. LLM API 호출 (Tool Use):
      - system: "당신은 건설 설계 엔지니어를 위한 법령 자문 Agent입니다..."
      - tools: [MCP 도구 목록 → LLM 형식으로 변환]
      - messages: [사용자 질의]

4. LLM → 도구 자동 선택 & 호출:
   a. search_law("내화구조") → 건축법, 건축물의 피난·방화구조 등의 기준
   b. get_law_text(법령ID) → 관련 조문 전문
   c. get_three_tier(법령ID) → 법률/시행령/시행규칙 3단 비교

5. LLM: 검색 결과를 설계 엔지니어 관점으로 재구성
   - 적용 대상 건축물 분류
   - 내화구조 기술기준 체크리스트
   - 관련 별표/서식 안내

6. Backend → Frontend: SSE 스트리밍 응답

7. Frontend: 채팅 형태 + 법령 뷰어로 실시간 표시
```

---

## 프로젝트 폴더 구조 (Phase별 생성 파일 표시)

```
Law Agent/
├── DEV_PLAN.md                             # 본 문서 (개발 계획)
├── README.md                               # Phase 1
├── .env.example                            # Phase 1
├── .gitignore                              # Phase 1
├── docker-compose.yml                      # Phase 3
│
├── backend/                                # ── Phase 1 시작 ──
│   ├── pyproject.toml                      # P1
│   ├── app/
│   │   ├── __init__.py                     # P1
│   │   ├── main.py                         # P1 (P3에서 auth 미들웨어 추가)
│   │   ├── config.py                       # P1
│   │   │
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── chat.py                 # P1 ← 핵심: 채팅 SSE 엔드포인트
│   │   │   │   ├── personas.py             # P1 ← 페르소나 목록 API
│   │   │   │   ├── health.py               # P1
│   │   │   │   └── auth.py                 # P3
│   │   │   └── dependencies.py             # P1 (P3에서 auth 추가)
│   │   │
│   │   ├── core/                           # ── Agent 핵심 로직 ──
│   │   │   ├── agent.py                    # P1 ← 핵심: LLM + Tool Use 오케스트레이터
│   │   │   ├── llm_provider.py             # P1 ← 핵심: 멀티 LLM 추상화
│   │   │   ├── mcp_client.py               # P1 ← 핵심: MCP 서버 연결
│   │   │   ├── personas.py                 # P1 ← 페르소나 정의 & 프롬프트
│   │   │   └── streaming.py                # P1 ← SSE 스트리밍 유틸
│   │   │
│   │   ├── utils/
│   │   │   ├── llm_utils.py                # P1 ← NEW: Tool 스키마 변환 및 유틸
│   │   │   └── logger.py                   # P1 ← NEW: 도구 호출 로깅
│   │   │
│   │   ├── models/
│   │   │   ├── schemas.py                  # P1 ← Pydantic 요청/응답 모델
│   │   │   └── database.py                 # P3 ← SQLAlchemy 모델
│   │   │
│   │   └── auth/                           # ── Phase 3 추가 ──
│   │       ├── jwt.py                      # P3
│   │       └── middleware.py               # P3
│   │
│   ├── scripts/
│   │   └── seed_personas.py                # P1
│   │
│   └── tests/
│       ├── test_chat.py                    # P1
│       ├── test_mcp.py                     # P1
│       └── test_auth.py                    # P3
│
├── frontend/                               # ── Phase 2 전체 추가 ──
│   ├── package.json                        # P2
│   ├── next.config.js                      # P2
│   ├── tailwind.config.js                  # P2
│   ├── tsconfig.json                       # P2
│   │
│   └── src/
│       ├── app/
│       │   ├── layout.tsx                  # P2 (P3에서 auth provider 추가)
│       │   ├── page.tsx                    # P2 ← 랜딩/페르소나 선택
│       │   ├── chat/
│       │   │   └── page.tsx                # P2 ← 메인 채팅 화면
│       │   └── login/
│       │       └── page.tsx                # P3
│       │
│       ├── components/
│       │   ├── ChatWindow.tsx              # P2
│       │   ├── MessageBubble.tsx           # P2
│       │   ├── PersonaSelector.tsx         # P2
│       │   ├── SourceCard.tsx              # P2 ← 법령 출처 카드
│       │   └── StreamingText.tsx           # P2 ← SSE 실시간 표시
│       │
│       ├── hooks/
│       │   ├── useChat.ts                  # P2 ← SSE 스트리밍 훅
│       │   └── useAuth.ts                  # P3
│       │
│       └── lib/
│           ├── api.ts                      # P2 ← Backend API 클라이언트
│           └── types.ts                    # P2
│
└── infra/                                  # ── Phase 3 추가 ──
    ├── Dockerfile.backend                  # P3
    ├── Dockerfile.frontend                 # P3
    ├── nginx.conf                          # P3
    └── deploy/
        ├── aws-ecs-task.json               # P3
        └── docker-compose.prod.yml         # P3
```

---

## 단계별 개발 로드맵 (3단계)

### Phase 1: Backend 핵심 (API + LLM + MCP)
**목표:** FastAPI 서버에서 페르소나 기반 법령 질의가 동작

**생성 파일:** ~16개 | **수정 파일:** 0개 (신규 프로젝트)

| 작업 | 핵심 파일 | 설명 |
|------|----------|------|
| FastAPI 서버 셋업 | `main.py`, `config.py` | 서버 기동, 환경 변수, 로깅 설정 |
| MCP 클라이언트 | `core/mcp_client.py` | korean-law MCP 서버 stdio 연결 및 도구 로드 |
| LLM 추상화 & 유틸 | `llm_provider.py`, `llm_utils.py` | Claude/GPT 멀티 프로바이더 & **Tool 스키마 변환** |
| Agent 오케스트레이터 | `core/agent.py` | LLM + Tool Use 루프 (에러 핸들링 포함) |
| 페르소나 시스템 | `core/personas.py` | 페르소나별 시스템 프롬프트 및 **검색 가이드** |
| 채팅 API | `api/routes/chat.py` | POST /api/chat (SSE 스트리밍, **오류 이벤트 처리**) |
| 스키마 | `models/schemas.py` | 요청/응답 Pydantic 모델 |

**검증:** Swagger UI (`http://localhost:8000/docs`)에서 직접 테스트 (로깅 확인)

**Backend 의존성 (pyproject.toml):**
```
anthropic >= 0.52
openai >= 1.60
mcp >= 1.26
fastapi >= 0.115
uvicorn[standard] >= 0.34
pydantic-settings >= 2.7
sse-starlette >= 2.2
```

---

### Phase 2: Frontend 개발
**목표:** 브라우저에서 사용 가능한 채팅 UI

**생성 파일:** ~15개 | **수정 파일:** 1개
- `backend/app/main.py` → CORS 설정 업데이트

| 작업 | 핵심 파일 | 설명 |
|------|----------|------|
| 페르소나 선택 | `page.tsx` | 랜딩 화면, 역할 선택 |
| 채팅 화면 | `chat/page.tsx` | 메인 채팅 인터페이스 |
| 스트리밍 표시 | `StreamingText.tsx` | SSE 실시간 렌더링 및 에러 처리 |
| 법령 뷰어/출처 | `SourceCard.tsx`, `LawViewer.tsx` | **인용 클릭 시 조문 자동 이동/접기 기능** |
| API 연동 | `hooks/useChat.ts` | Backend SSE 연결 훅 |

---

### Phase 3: 인증 + 배포
**목표:** 사내 서버에 배포, 접근 제어

**생성 파일:** ~10개 | **수정 파일:** 3개
- `backend/app/main.py` → auth 미들웨어 추가
- `backend/app/api/dependencies.py` → auth 의존성 추가
- `frontend/src/app/layout.tsx` → auth provider 추가

| 작업 | 핵심 파일 | 설명 |
|------|----------|------|
| JWT 인증 | `auth/jwt.py`, `middleware.py` | 토큰 발급/검증 |
| Docker 설정 | `Dockerfile.*`, `docker-compose.yml` | 컨테이너화 |
| 배포 설정 | `infra/deploy/` | AWS ECS 또는 자체 서버 |

---

### 향후: RAG 시스템 (별도 요청 시 추가)
- `backend/app/rag/` 폴더 신규 생성
- `core/agent.py`에 RAG 도구 등록 추가 (기존 파일 1개 수정)
- `pyproject.toml`에 chromadb, sentence-transformers 의존성 추가
- MCP와 RAG를 동시에 LLM Tool로 등록, LLM이 자동 판단하여 호출

---

## Phase별 수정 영향도 요약

```
        Phase 1         Phase 2         Phase 3
        (Backend)       (Frontend)      (인증+배포)
        ─────────       ──────────      ──────────
backend/
  core/   ■ 신규 생성    변경 없음       변경 없음
  api/    ■ 신규 생성    변경 없음       ▲ 2개 수정
  auth/   없음          없음           ■ 신규 생성
  models/ ■ 신규 생성    변경 없음       ▲ 1개 추가

frontend/ 없음          ■ 전체 신규     ▲ 2개 수정

infra/    없음          없음           ■ 전체 신규

■ = 신규 폴더/파일 생성   ▲ = 기존 파일 일부 수정
```

---

## 검증 방법
1. **Phase 1:** Swagger UI (`/docs`)에서 채팅 API 테스트 + LLM 전환 테스트 (Claude ↔ GPT)
2. **Phase 2:** 브라우저에서 페르소나 선택 → 채팅 → 스트리밍 응답 확인
3. **Phase 3:** Docker 빌드 → 로컬 배포 테스트 → 서버 배포
