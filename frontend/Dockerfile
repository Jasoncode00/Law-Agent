# 1. 빌드 단계
FROM node:20-slim AS builder
WORKDIR /app

# 2. 의존성 설치
COPY package*.json ./
RUN npm install

# 3. 소스 코드 복사 및 빌드
# BACKEND_URL은 Next.js rewrites에서 서버사이드 env로 사용 (빌드타임 불필요)
COPY . .
RUN npm run build

# 4. 실행 단계 (경량 이미지)
FROM node:20-slim
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
CMD ["npm", "run", "start"]
