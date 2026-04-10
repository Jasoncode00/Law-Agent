# 1. Python 기반 이미지
FROM python:3.11-slim

# 2. Node.js 및 korean-law-mcp 설치 (MCP 실행을 위해 필수)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g korean-law-mcp \
    && rm -rf /var/lib/apt/lists/*

# 3. 비루트 사용자 생성 (컨테이너 탈출 시 호스트 피해 최소화)
RUN useradd -m -u 1000 appuser

# 4. 작업 디렉토리 설정
WORKDIR /app

# 5. 의존성 파일만 먼저 복사 — 소스 변경 시 pip 캐시 재사용
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# 6. 소스 코드 복사 (.dockerignore로 .env, venv 등 제외됨)
COPY . .

# 7. 소유권 이전 후 비루트 사용자로 전환
RUN chown -R appuser:appuser /app
USER appuser

# 8. 헬스체크 — /api/health 엔드포인트로 컨테이너 상태 확인
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# 9. 실행
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
