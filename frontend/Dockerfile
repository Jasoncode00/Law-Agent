# 1. 빌드 단계
FROM node:20-slim AS builder
WORKDIR /app

# 2. 의존성 설치 — package.json만 먼저 복사해 캐시 활용
COPY package*.json ./
RUN npm ci --omit=dev || npm install

# 3. 소스 복사 및 빌드 (.dockerignore로 .env, node_modules 등 제외됨)
COPY . .
RUN npm run build

# 4. 실행 단계 (경량 이미지)
FROM node:20-slim
WORKDIR /app

# 5. 비루트 사용자 생성
RUN useradd -m -u 1000 appuser

# 6. 빌드 결과물만 복사
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

# 7. 소유권 이전 후 비루트 사용자로 전환
RUN chown -R appuser:appuser /app
USER appuser

# 8. 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

EXPOSE 3000
CMD ["npm", "run", "start"]
