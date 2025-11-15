# Multi-User Support Implementation Summary

## Overview

QuackMail now supports multiple users with isolated IMAP/SMTP configurations. Each user stores their credentials in the database and gets per-user email service instances.

## Changes Made

### Backend Architecture

#### Database Layer (`backend/src/db/`)

- **schema.ts**: Drizzle ORM schema defining:
  - `users`: Email + SHA256 password hash
  - `user_credentials`: Per-user IMAP/SMTP settings
  - `sessions`: JWT token management with 7-day expiry
  
- **index.ts**: LibSQL client initialization and Drizzle ORM setup
- **migrate.ts**: Database initialization script

#### Authentication (`backend/src/services/authService.ts`)

- `register()`: Create new user with credentials
- `login()`: Verify email/password and create session
- `logout()`: Invalidate session token
- `verifyToken()`: Validate JWT and session existence
- `getUserCredentials()`: Fetch user's IMAP/SMTP config
- `updateUserCredentials()`: Update email settings

Features:

- JWT tokens (7-day expiry)
- SHA256 password hashing (⚠️ use bcrypt in production)
- Session validation before token use
- Credential isolation per user

#### Email Services (`backend/src/services/emailServiceFactory.ts`)

- **UserEmailService**: Per-user email operations (refactored from monolithic service)
- **getUserEmailService()**: Factory function with in-memory caching
- Supports: fetch emails, list folders, send, mark as read, delete

Key changes from original:

- Takes user credentials in constructor instead of reading from `.env`
- Each user gets isolated IMAP/SMTP connections
- Service instances cached per user for performance

#### Middleware (`backend/src/middleware/auth.ts`)

- Validates `Authorization: Bearer <token>` header
- Extracts userId from JWT
- Attaches userId to request context
- Used on all protected email endpoints

#### API Routes (`backend/src/index.ts`)

Public endpoints:

- `POST /api/auth/register` - Create account with credentials
- `POST /api/auth/login` - Authenticate and get token

Protected endpoints (require Bearer token):

- `GET /api/user/profile` - Get user info
- `GET /api/user/credentials` - Get IMAP/SMTP settings (no passwords)
- `PUT /api/user/credentials` - Update email settings
- `POST /api/auth/logout` - Invalidate session
- `GET/POST/PUT/DELETE /api/messages/*` - Email operations
- `GET /api/folders` - List email folders

### Configuration

#### .env Variables

```bash
DATABASE_URL=file:./data/quackmail.db
JWT_SECRET=your-secret-key-change-in-production
```

Note: Default IMAP/SMTP hosts in `.env` are no longer used. Users provide their own during registration.

### Database Initialization

```bash
pnpm run db:migrate
```

Creates three tables with proper constraints and defaults.

## API Changes

### Before (Single User)

```bash
POST /api/auth/login
{ "email": "user", "password": "pass" }
# Returns basic token

GET /api/messages
# Uses hardcoded .env credentials
```

### After (Multi-User)

```bash
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "secure-pass",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapSecure": true,
  "imapUser": "user@gmail.com",
  "imapPass": "app-password",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUser": "user@gmail.com",
  "smtpPass": "app-password",
  "fromEmail": "user@gmail.com"
}
# Returns JWT token + user ID

GET /api/messages
Authorization: Bearer <token>
# Uses this user's stored credentials
```

## Data Flow

1. User registers → Credentials stored in `user_credentials` table
2. User logs in → JWT token created + session stored
3. User makes email request → Middleware verifies token
4. Request handler → Gets user's email service from factory
5. Service uses → User's stored IMAP/SMTP credentials
6. Response → Sent back to authenticated user only

## Security Considerations

✅ Implemented:

- JWT-based authentication
- Password hashing (SHA256)
- Session table validation
- Per-user credential isolation
- Bearer token in Authorization header

⚠️ Production Improvements Needed:

1. Replace SHA256 with bcrypt/argon2
2. Add HTTPS/TLS for API
3. Encrypt stored passwords in database
4. Rate limiting on auth endpoints
5. Email verification for registration
6. Use Redis/cache for multi-instance sessions
7. Add refresh token rotation

## Frontend Work Remaining

The frontend still needs:

1. Login page
2. Register page
3. Store JWT token in localStorage/sessionStorage
4. Add Authorization header to all API requests
5. Logout functionality
6. Redirect to login if token invalid/expired

See `MULTIUSER_SETUP.md` for detailed API documentation.

## Testing

Quick test:

```bash
# Start server
pnpm run dev

# Register (in another terminal)
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapSecure": true,
    "imapUser": "test@gmail.com",
    "imapPass": "your-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "test@gmail.com",
    "smtpPass": "your-app-password",
    "fromEmail": "test@gmail.com"
  }'

# Use returned token to fetch messages
TOKEN="..."
curl http://localhost:3001/api/messages \
  -H "Authorization: Bearer $TOKEN"
```

## Files Modified/Created

### Created

- `backend/src/db/schema.ts`
- `backend/src/db/index.ts`
- `backend/src/db/migrate.ts`
- `backend/src/services/authService.ts`
- `backend/src/services/emailServiceFactory.ts`
- `backend/src/middleware/auth.ts`
- `backend/drizzle.config.ts`
- `MULTIUSER_SETUP.md`
- `.env.example`

### Modified

- `backend/src/index.ts` - Complete rewrite with auth routes
- `backend/package.json` - Added drizzle, libsql, jwt dependencies

### Deleted

- `backend/src/emailService.ts` → Replaced with per-user factory

## Next Steps

1. Initialize database: `pnpm run db:migrate`
2. Update `.env` with JWT_SECRET
3. Build frontend login/register/auth flow
4. Add token persistence to frontend
5. Test with real IMAP/SMTP credentials
6. Deploy with production security hardening
