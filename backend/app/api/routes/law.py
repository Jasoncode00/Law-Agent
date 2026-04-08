import re
from fastapi import APIRouter, Query, HTTPException, Request
from ...core.mcp_client import MCPClient
from ...utils.logger import logger

router = APIRouter()


def _texts_from_result(result) -> str:
    """MCP 결과의 TextContent 목록에서 텍스트를 추출·결합한다."""
    parts = []
    for item in result.content:
        if hasattr(item, 'text') and item.text:
            parts.append(item.text)
    return '\n'.join(parts)


def _extract_law_ids(search_text: str, law_name: str) -> tuple[str | None, str | None]:
    """
    search_law 결과에서 law_name과 가장 잘 일치하는 항목의 (mst, lawId)를 반환.

    search_law 응답 형식:
      1. 건축법
         - 법령ID: 001823
         - MST: 273437
      2. 건축법 시행령
         - 법령ID: 002118
         - MST: 273503
    """
    def normalize(s: str) -> str:
        return re.sub(r'[\s\-·ㆍ·\u318d\u00b7]', '', s)

    norm_target = normalize(law_name)

    # 숫자. 로 시작하는 항목 단위로 분리
    entries = re.split(r'\n(?=\d+\. )', search_text)

    # (mst, law_id, match_score) — 높을수록 우선
    candidates: list[tuple[str | None, str | None, int]] = []

    for entry in entries:
        lines = entry.strip().split('\n')
        if not lines:
            continue
        # 첫 줄: "1. 건축법"
        first_line = re.sub(r'^\d+\.\s*', '', lines[0]).strip()
        norm_first = normalize(first_line)

        law_id_m = re.search(r'법령ID[:\s]+([0-9A-Za-z]+)', entry)
        mst_m = re.search(r'MST[:\s]+([0-9A-Za-z]+)', entry)

        law_id = law_id_m.group(1) if law_id_m else None
        mst = mst_m.group(1) if mst_m else None

        if norm_first == norm_target:
            # 정확히 일치 — 즉시 반환
            logger.info(f"법령명 정확 매칭: '{first_line}' → mst={mst}, lawId={law_id}")
            return mst, law_id
        elif norm_first in norm_target:
            # 법령명이 검색어의 부분 (예: "민법" 검색 시 "민법" < "민법 시행령")
            candidates.append((mst, law_id, 2))
        elif norm_target in norm_first:
            # 검색어가 법령명의 부분 (예: "민법" 검색 시 "난민법" 매칭) — 낮은 우선순위
            candidates.append((mst, law_id, 1))

    if candidates:
        candidates.sort(key=lambda x: -x[2])
        mst, law_id, score = candidates[0]
        logger.info(f"법령명 부분 매칭(score={score}): mst={mst}, lawId={law_id}")
        return mst, law_id

    # 일치 항목 없으면 첫 번째 항목 반환
    mst_m = re.search(r'MST[:\s]+([0-9A-Za-z]+)', search_text)
    law_id_m = re.search(r'법령ID[:\s]+([0-9A-Za-z]+)', search_text)
    best_mst = mst_m.group(1) if mst_m else None
    best_law_id = law_id_m.group(1) if law_id_m else None
    logger.info(f"법령명 불일치, 첫 항목 사용: mst={best_mst}, lawId={best_law_id}")
    return best_mst, best_law_id


@router.get("/article")
async def get_article(
    request: Request,
    law: str = Query(..., min_length=1, max_length=100, description="법령명 (예: 건축법 시행령)"),
    article: str = Query(..., min_length=2, max_length=30, description="조문번호 (예: 제6조의2)"),
):
    """
    법령명 + 조문번호로 MCP를 직접 호출해 해당 조문 원문을 반환한다.
    LLM 답변의 인용 클릭 시 사용.
    """
    mcp: MCPClient = request.app.state.mcp

    # ── 1단계: search_law 로 MST 확보 ──────────────────────────────
    try:
        search_result = await mcp.call_tool("search_law", {"query": law, "display": 5})
        search_text = _texts_from_result(search_result)
        mst, law_id = _extract_law_ids(search_text, law)
        logger.info(f"search_law '{law}': mst={mst}, lawId={law_id}")
    except Exception as e:
        logger.warning(f"search_law 실패: {e}")
        mst, law_id = None, None

    if not mst and not law_id:
        raise HTTPException(status_code=404, detail=f"'{law}' 법령을 찾을 수 없습니다.")

    # ── 2단계: get_law_text + jo 로 해당 조문만 직접 조회 ────────────
    params: dict = {"jo": article}
    if mst:
        params["mst"] = mst
    else:
        params["lawId"] = law_id  # type: ignore[assignment]

    try:
        text_result = await mcp.call_tool("get_law_text", params)
        content = _texts_from_result(text_result)
        logger.info(f"get_law_text(jo={article}): {len(content)} chars")
    except Exception as e:
        logger.error(f"get_law_text 실패: {e}")
        raise HTTPException(status_code=502, detail="법령 조문 조회에 실패했습니다.")

    if not content.strip():
        raise HTTPException(status_code=404, detail=f"{law} {article}를 찾을 수 없습니다.")

    return {"lawName": law, "articleId": article, "content": content}
