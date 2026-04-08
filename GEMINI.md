# SKEC Law Agent - 개발 가이드 (GEMINI.md)

## 📌 프로젝트 개요
SKEP 건설회사를 위한 **법령 검색/해석 AI Agent**. `korean-law` MCP 서버를 활용하여 페르소나별(설계/시공/영업) 맞춤형 법령 자문을 제공함.

## 🛠 기술 스택
- **Backend:** Python FastAPI 0.115+, Uvicorn
- **LLM:** Azure OpenAI (gpt-5.1-chat) / Claude 3.5 Sonnet
- **MCP:** `mcp` Python SDK (stdio 연결)
- **Frontend:** Next.js 16 (Phase 2 완료)

## 📂 주요 파일 구조 및 역할
- `backend/app/main.py`: FastAPI 앱 설정 및 라우터 등록
- `backend/app/core/agent.py`: LLM + MCP 도구 호출 오케스트레이터 (Multi-turn Loop)
- `backend/app/core/llm_provider.py`: Claude/OpenAI API 추상화 레이어
- `backend/app/core/mcp_client.py`: `korean-law` MCP 서버 연결 및 호출 관리
- `backend/app/core/personas.py`: 페르소나별 시스템 프롬프트 정의
- `backend/app/api/routes/chat.py`: SSE 스트리밍 채팅 엔드포인트 (`/api/chat`)

## 🚀 실행 방법 (Backend)
1. **환경 변수 설정:** `Law Agent/.env` 파일에 API 키 설정
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   OPENAI_API_KEY=
   LLM_PROVIDER=claude
   MCP_SERVER_COMMAND=npx -y @law-agent/korean-law
   ```
2. **가상환경 활성화 및 서버 실행:**
   ```powershell
   cd "Law Agent/backend"
   .\venv\Scripts\Activate.ps1
   uvicorn app.main:app --reload
   ```

## 📝 현재 진행 상황 (Current Status)
- [x] **Phase 1: Backend 핵심 로직 완료**
  - 멀티 LLM 지원 및 MCP 도구 연동 완료
  - SSE 스트리밍 기반 채팅 API 구현 완료
  - 페르소나 시스템 구축 완료
- [x] **Phase 2: Frontend 개발 완료**
  - Next.js 16 + Tailwind CSS 4 기반 UI 구축
  - 법령 뷰어, SSE 스트리밍 채팅, 조문 출처 카드 등 구현
  - **[버그 수정]** 인용 정규식 최적화 및 법령 맵핑 로직 강화 (LLM Hallucination 방어)
  - **[성능 개선]** `LawViewer.tsx` 불필요한 재렌더링 방지 및 `SourceCard` 런타임 에러(ReferenceError) 해결
  - 백엔드 시스템 프롬프트 인용 규칙(`[법령명] 제N조`) 통일 완료

## ⚠️ 개발 주의사항
- **SSE 스트리밍:** 프론트엔드 구현 시 `EventSource` 또는 `fetch` 스트리밍 처리가 필요함.
- **도구 호출:** LLM이 도구를 호출할 때 `tool_use` -> `tool_result` -> 최종 답변의 흐름을 `agent.py`에서 관리함.
- **MCP 명령어:** `npx` 명령어가 로컬 환경에서 실행 가능해야 함.
