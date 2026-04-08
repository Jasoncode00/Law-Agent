import { LawSource, LawArticle } from './types';

let _counter = 0;
const genId = () => `ls-${++_counter}-${Date.now()}`;

/** 법령 전문 도구 목록 (search_* 보다 우선순위 높음) */
export const TEXT_TOOL_PRIORITY = [
  'get_law_text',
  'get_three_tier',
  'chain_full_research',
  'chain_law_system',
  'chain_procedure_detail',
  'chain_dispute_prep',
  'chain_action_basis',
  'get_related_laws',
  'get_article_history',
  'get_precedent_text',
  'get_interpretation_text',
  'get_annexes',
  'compare_articles',
  'compare_old_new',
  'chain_amendment_track',
  'chain_ordinance_compare',
];

const TOOL_LABEL: Record<string, string> = {
  get_law_text: '법령 전문',
  search_law: '법령 검색',
  search_ai_law: 'AI 법령 검색',
  get_three_tier: '3단 비교',
  chain_full_research: '종합 리서치',
  chain_law_system: '법령 체계',
  chain_procedure_detail: '절차 분석',
  chain_dispute_prep: '분쟁 대비',
  chain_action_basis: '행위 근거',
  get_related_laws: '관련 법령',
  get_article_history: '조문 연혁',
  search_precedents: '판례 검색',
  get_precedent_text: '판례 전문',
  search_interpretations: '법령해석',
  get_interpretation_text: '법령해석',
  get_annexes: '별표/서식',
  compare_articles: '조문 비교',
  compare_old_new: '신구 비교',
  chain_amendment_track: '개정 이력',
  chain_ordinance_compare: '자치법규 비교',
};

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

/** 제0056조 → 제56조 (앞자리 0 제거) */
function normalizeArticleId(id: string): string {
  return id.replace(/^제0*(\d+)조/, '제$1조');
}

/** 중복 조문 제거 — 같은 ID면 내용이 더 긴 쪽 유지 */
function deduplicateArticles(articles: LawArticle[]): LawArticle[] {
  const map = new Map<string, LawArticle>();
  for (const a of articles) {
    const existing = map.get(a.id);
    if (!existing || a.content.length > existing.content.length) {
      map.set(a.id, a);
    }
  }
  return [...map.values()];
}

// ─────────────────────────────────────────────
// TextContent 파서
// Python repr 형식: [TextContent(type='text', text='...', annotations=None)]
// ─────────────────────────────────────────────
/**
 * Python repr 형식의 TextContent에서 text 필드를 추출한다.
 * 정규식 대신 문자 단위 스캔을 사용해 따옴표·특수문자로 인한 조기 종료를 방지한다.
 *
 * 형식: TextContent(type='text', text='...내용...', annotations=None)
 *       또는: TextContent(type='text', text="...내용...", annotations=None)
 */
function extractTextContent(raw: string): string | null {
  if (!raw.includes('TextContent(')) return null;

  // text=' 또는 text=" 의 시작 위치를 찾는다
  // type='text' 안의 'text'와 구별: text 뒤에 =' 또는 =" 가 있어야 함
  let startIdx = -1;
  let quoteChar = '';

  const sq = raw.indexOf("text='");
  const dq = raw.indexOf('text="');

  if (sq === -1 && dq === -1) return null;

  if (sq !== -1 && (dq === -1 || sq < dq)) {
    startIdx = sq + 6;   // "text='" 길이 = 6
    quoteChar = "'";
  } else {
    startIdx = dq + 6;   // 'text="' 길이 = 6
    quoteChar = '"';
  }

  // 닫는 따옴표를 찾을 때까지 문자 단위로 스캔 (이스케이프 처리 포함)
  const chars: string[] = [];
  let i = startIdx;
  while (i < raw.length) {
    const ch = raw[i];
    if (ch === '\\' && i + 1 < raw.length) {
      // 이스케이프 시퀀스 → 두 글자를 그대로 수집 (나중에 unescape)
      chars.push(ch, raw[i + 1]);
      i += 2;
    } else if (ch === quoteChar) {
      // 닫는 따옴표 → 종료
      break;
    } else {
      chars.push(ch);
      i++;
    }
  }

  const extracted = chars.join('');
  if (!extracted.trim()) return null;

  // Python repr 이스케이프 해제
  return extracted
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

// ─────────────────────────────────────────────
// 법령 텍스트 파싱 → 법령별 그룹 배열 반환
//
// search_ai_law 실제 응답:
//   📜 건축법 시행령                  ← "📜 법령명" (법령 시작, 조문 전)
//      제0056조 (건축물의 내화구조)
//      ① ...
//      📅 시행: 2025.12.18 | 국토교통부
//
//   📜 건축법                         ← 다음 법령
//      제0050조 ...
//
// get_law_text 실제 응답:
//   법령명: 건축법                    ← "법령명:" 접두어
//   공포일: 20250826
//   제50조 건축물의 내화구조와 방화벽
//   ① ...
//
// search_law 실제 응답:
//   검색 결과 (총 6건):
//   1. 건축법
//      - 법령ID: 001823
// ─────────────────────────────────────────────
function parseLawPlainText(text: string): { lawName: string; articles: LawArticle[] }[] {
  const lines = text.split('\n').map((l) => l.trim());
  // (?!제|\d) : 조문 번호 직후에 "제" 또는 숫자가 오면 새 조문이 아닌 본문 내 참조로 처리
  // 예) "제90조제2항에 따라..." → 제90조 다음에 "제"가 오므로 매칭 안 됨
  const ARTICLE_LINE = /^(제\d+조(?:의\d+)?)(?!제|\d)\s*[(\s]?(.*)/;

  // 메타 줄 스킵: "시행:", "📅 시행:", "공포일:", "시행일:" 등
  const META_LINE = /^(?:📅\s*)?(?:공포일|시행일|시행|법령구분|소관부처|제정기관|개정일|소관부처명)[:\s：]/;

  // search_ai_law: "📜 건축법 시행령" (이모지 + 법령명)
  const EMOJI_LAW_RE = /^📜\s+(.+)$/;

  // get_law_text: "법령명: 건축법"
  const LAW_PREFIX_RE = /^법령명[:\s：]+\[?(.+?)\]?\s*$/;

  // 도구 안내 줄 스킵: "💡 법령 상세 조회:", "🔍 지능형 법령검색 결과"
  const HINT_LINE = /^[💡🔍]/;

  const groups: { lawName: string; articles: LawArticle[] }[] = [];
  let curLawName = '';
  let curArticle: { id: string; title: string } | null = null;
  let buf: string[] = [];

  const flushArticle = () => {
    if (curArticle) {
      const content = buf.join('\n').trim();
      if (content) {
        // 현재 그룹에 추가
        const group = groups.find((g) => g.lawName === curLawName);
        if (group) {
          group.articles.push({ id: curArticle.id, title: curArticle.title, content });
        } else {
          groups.push({
            lawName: curLawName,
            articles: [{ id: curArticle.id, title: curArticle.title, content }],
          });
        }
      }
      buf = [];
      curArticle = null;
    }
  };

  for (const line of lines) {
    if (!line) { if (curArticle) buf.push(''); continue; }

    // search_ai_law: "📜 건축법 시행령" → 새 법령 시작
    const emojiLawMatch = line.match(EMOJI_LAW_RE);
    if (emojiLawMatch) {
      flushArticle();
      curLawName = emojiLawMatch[1].trim();
      continue;
    }

    // get_law_text: "법령명: 건축법" → 새 법령 시작
    const lawPrefixMatch = line.match(LAW_PREFIX_RE);
    if (lawPrefixMatch) {
      flushArticle();
      curLawName = lawPrefixMatch[1].trim();
      continue;
    }

    // 메타 정보 스킵
    if (META_LINE.test(line)) continue;

    // 도구 안내 줄 스킵
    if (HINT_LINE.test(line)) continue;

    // 조문 시작: "제56조(건축물의 내화구조)" 또는 "제0056조 (...)"
    const articleMatch = line.match(ARTICLE_LINE);
    if (articleMatch) {
      flushArticle();
      const titleRaw = articleMatch[2].trim();
      const parenMatch = titleRaw.match(/^\(([^)]+)\)/);
      const title = parenMatch ? parenMatch[1] : titleRaw.replace(/^\(/, '').replace(/\)$/, '');
      curArticle = { id: normalizeArticleId(articleMatch[1]), title };
      continue;
    }

    // 일반 줄 → 조문 본문에 추가
    if (curArticle) {
      buf.push(line);
    }
  }

  flushArticle();
  return groups;
}

// ─────────────────────────────────────────────
// JSON 파서 헬퍼
// ─────────────────────────────────────────────
function findStr(obj: unknown, keys: string[]): string {
  if (!obj || typeof obj !== 'object') return '';
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (typeof o[k] === 'string' && (o[k] as string).trim()) return (o[k] as string).trim();
  }
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = findStr(val, keys);
      if (found) return found;
    }
  }
  return '';
}

function findArr(obj: unknown, keys: string[]): unknown[] {
  if (!obj || typeof obj !== 'object') return [];
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(o[k]) && (o[k] as unknown[]).length > 0) return o[k] as unknown[];
  }
  for (const val of Object.values(o)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const found = findArr(val, keys);
      if (found.length > 0) return found;
    }
  }
  return [];
}

function toArticle(item: unknown): LawArticle | null {
  if (!item) return null;
  if (typeof item === 'string') {
    const t = item.trim();
    return t ? { id: '결과', title: '', content: t } : null;
  }
  if (typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const id = normalizeArticleId(String(o['조문번호'] || o['조번호'] || o['articleNo'] || o['no'] || '').trim());
  const title = String(o['조문제목'] || o['articleTitle'] || o['title'] || '').trim();
  const content = String(o['조문내용'] || o['content'] || o['내용'] || o['text'] || '').trim();
  if (!content && !id) return null;
  return { id: id || '전문', title, content: content || JSON.stringify(item, null, 2) };
}

// ─────────────────────────────────────────────
// 메인 파서 — 복수 LawSource 반환 (법령별 분리)
// ─────────────────────────────────────────────
export function parseLawSources(toolName: string, raw: string): LawSource[] {
  if (!raw || raw.trim() === '' || raw === 'null' || raw === '{}' || raw === '[]') return [];

  const fallbackName = TOOL_LABEL[toolName] || toolName;

  // 1. TextContent 형식
  const extracted = extractTextContent(raw);
  if (extracted) {
    const groups = parseLawPlainText(extracted);
    const validGroups = groups.filter((g) => g.articles.length > 0);
    if (validGroups.length > 0) {
      return validGroups.map((g) => ({
        id: genId(),
        toolName,
        lawName: g.lawName || fallbackName,
        articles: deduplicateArticles(g.articles),
        raw,
      }));
    }
    // 조문 분리 실패 → 전체를 하나로
    return [{
      id: genId(), toolName, lawName: fallbackName,
      articles: [{ id: '전문', title: '', content: extracted.trim() }],
      raw,
    }];
  }

  // 2. JSON 형식
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length < 5) return [];
    return [{
      id: genId(), toolName, lawName: fallbackName,
      articles: [{ id: '결과', title: '', content: trimmed }],
      raw,
    }];
  }

  if (!parsed || typeof parsed !== 'object') return [];

  // results 배열 각 항목에 법령명이 있는 경우(search_ai_law 등) → 법령별로 분리
  const rawResults = findArr(parsed, ['results', '결과목록', 'items']);
  if (rawResults.length > 0) {
    const grouped = new Map<string, LawArticle[]>();
    for (const item of rawResults) {
      const itemLawName =
        findStr(item, ['법령명', '법령명한글', '법령명_한글', 'lawName']) || fallbackName;
      const article = toArticle(item);
      if (article && article.content.length > 0) {
        if (!grouped.has(itemLawName)) grouped.set(itemLawName, []);
        grouped.get(itemLawName)!.push(article);
      }
    }
    if (grouped.size > 0) {
      return [...grouped.entries()].map(([name, arts]) => ({
        id: genId(),
        toolName,
        lawName: name,
        articles: deduplicateArticles(arts),
        raw,
      }));
    }
  }

  const lawName =
    findStr(parsed, ['법령명', '법령명한글', '법령명_한글', 'lawName', '제목', 'title', '판례명', '해석제목']) ||
    fallbackName;
  const rawArticles = findArr(parsed, [
    '조문', '조', 'articles', '조문목록', '법령본문', '조문내용목록',
    '판례내용', '해석내용',
  ]);
  const articles: LawArticle[] = rawArticles
    .map(toArticle)
    .filter((a): a is LawArticle => a !== null && a.content.length > 0);

  if (articles.length === 0) {
    const content = JSON.stringify(parsed, null, 2);
    if (content.length <= 10) return [];
    articles.push({ id: '결과', title: '', content });
  }

  return [{ id: genId(), toolName, lawName, articles: deduplicateArticles(articles), raw }];
}

/** 하위 호환성 — 단일 LawSource 반환 */
export function parseLawSource(toolName: string, raw: string): LawSource | null {
  return parseLawSources(toolName, raw)[0] ?? null;
}
