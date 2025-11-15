# AGENTS.md - QuackMail Development Guide

## Build, Lint, Test Commands

**Root workspace:**
- `pnpm install` - Install dependencies for all workspaces
- `pnpm -r dev` - Run dev mode in all packages (backend on port 3001, frontend on port 3000)

**Backend (Node.js/Hono):**
- `pnpm --filter backend dev` - Development mode with hot reload
- `pnpm --filter backend db:push` - Push Drizzle schema changes to SQLite
- `pnpm --filter backend db:migrate` - Run migrations
- `pnpm --filter backend test` - No tests configured yet

**Frontend (Next.js):**
- `pnpm --filter frontend dev` - Development mode (port 3000)
- `pnpm --filter frontend build` - Build for production
- `pnpm --filter frontend lint` - Run ESLint

## Architecture Overview

**Project structure:** pnpm workspace with two packages
- **Backend:** Hono.js REST API (TypeScript, port 3001), Drizzle ORM, SQLite database
- **Frontend:** Next.js 16 React app (TypeScript, port 3000), TanStack Query, Tailwind CSS

**Database:** SQLite (backend/data/quackmail.db) with three main tables:
- `users` - email, hashed password, timestamps
- `user_credentials` - IMAP/SMTP config per user (host, port, credentials)
- `sessions` - JWT tokens with 7-day expiry

**Key services:**
- `authService` - register, login, logout, JWT generation, token verification
- `emailServiceFactory` - cached per-user email service instances
- `authMiddleware` - validates Bearer JWT tokens and extracts userId

**Email flow:** IMAP for reading (imapflow library), SMTP for sending (nodemailer)

## Code Style & Conventions

**TypeScript:**
- Strict mode enabled (`strict: true` in tsconfig)
- ESM imports with `.js` extensions: `import { x } from './file.js'`
- Async/await for all async operations; error handling with try-catch
- Types defined inline in interfaces (e.g., `LoginPayload`, `AuthResponse`)

**Naming & structure:**
- Services as export objects with methods: `export const authService = { method() {} }`
- Route handlers receive Hono context `c`, extract userId via `c.get('userId')`
- Error messages as simple English strings; HTTP status codes: 400 (client), 401 (auth), 404 (not found), 500 (server)
- Database queries use Drizzle: `db.select().from(table).where(eq(col, val))`

**Frontend:**
- React 19 functional components with hooks
- TanStack Query for data fetching (setup pending)
- Tailwind CSS for styling with Radix UI components
- API calls to `http://localhost:3001/api/*` with Bearer token in Authorization header

**No external rule files** (no .cursorrules, CLAUDE.md, .windsurfrules, etc.)
