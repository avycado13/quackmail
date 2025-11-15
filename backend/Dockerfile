# syntax=docker/dockerfile:1
FROM node:20-alpine AS builder

# Install pnpm
RUN npm install -g pnpm

WORKDIR /build

# Copy monorepo config and lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install only backend dependencies (and shared deps)
RUN pnpm install --frozen-lockfile --filter backend

# Copy backend source code
COPY backend ./backend

# Build backend
RUN pnpm --filter backend build

# Production stage
FROM node:20-alpine

RUN npm install -g pnpm

WORKDIR /app

# Copy monorepo config and lockfile
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./

# Copy backend package.json
COPY backend/package.json ./backend/

# Install production dependencies only for backend
RUN pnpm install --frozen-lockfile --filter backend --prod

# Copy built backend from builder
COPY --from=builder /build/backend/dist ./backend/dist
COPY --from=builder /build/backend/package.json ./backend/

EXPOSE 3001

CMD ["pnpm", "--filter", "backend", "start"]
