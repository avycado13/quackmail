# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /build

# Copy monorepo config and lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install only frontend dependencies (and shared deps)
RUN pnpm install --frozen-lockfile --filter frontend

# Copy frontend source code
COPY frontend ./frontend

# Build frontend
RUN pnpm --filter frontend build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy monorepo config and lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy frontend package.json
COPY frontend/package.json ./frontend/

# Install production dependencies only for frontend
RUN pnpm install --frozen-lockfile --filter frontend --prod

# Copy built frontend from builder
COPY --from=builder /build/frontend/.next ./frontend/.next
COPY --from=builder /build/frontend/public ./frontend/public
COPY --from=builder /build/frontend/package.json ./frontend/

EXPOSE 3000

CMD ["pnpm", "--filter", "frontend", "start"]
