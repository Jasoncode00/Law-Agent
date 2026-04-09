# 1. Python 기반 이미지 사용
FROM python:3.11-slim

# 2. Node.js 및 korean-law-mcp 설치 (MCP 실행을 위해 필수)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g korean-law-mcp \
    && rm -rf /var/lib/apt/lists/*

# 3. 작업 디렉토리 설정
WORKDIR /app

# 4. 의존성 파일 복사 및 설치
COPY pyproject.toml .
RUN pip install --no-cache-dir .

# 5. 소스 코드 복사
COPY . .

# 6. 실행 (Uvicorn)
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
