# Multi-User Setup Guide

QuackMail now supports multiple users with individual IMAP/SMTP credentials.

## Architecture

- **Database**: SQLite with Drizzle ORM
- **Authentication**: JWT tokens with session management
- **Email Services**: Per-user email service instances with connection pooling
- **Credentials Storage**: Encrypted in database per user

## Database Schema

### Users Table
- `id`: Unique user ID
- `email`: User email (unique)
- `password`: SHA256 hashed password
- `createdAt`, `updatedAt`: Timestamps

### User Credentials Table
- `userId`: Reference to user
- `imapHost`, `imapPort`, `imapSecure`: IMAP settings
- `imapUser`, `imapPass`: IMAP credentials
- `smtpHost`, `smtpPort`, `smtpSecure`: SMTP settings
- `smtpUser`, `smtpPass`: SMTP credentials
- `fromEmail`: Email address to send from

### Sessions Table
- `userId`: Reference to user
- `token`: JWT token
- `expiresAt`: Token expiration time

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and set your values:

```bash
cp .env.example .env
```

Key variables:
- `DATABASE_URL`: SQLite database path (default: `file:./data/quackmail.db`)
- `JWT_SECRET`: Secret for JWT signing (change in production!)

### 3. Initialize Database

```bash
pnpm run db:migrate
```

This creates tables: `users`, `user_credentials`, and `sessions`

### 4. Start Server

```bash
pnpm run dev
```

Server runs on `http://localhost:3001`

## API Endpoints

### Authentication

#### Register
```bash
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapSecure": true,
  "imapUser": "user@gmail.com",
  "imapPass": "gmail-app-password",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": false,
  "smtpUser": "user@gmail.com",
  "smtpPass": "gmail-app-password",
  "fromEmail": "user@gmail.com"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "abc123...",
    "email": "user@example.com"
  }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "secure-password"
}
```

Response:
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "abc123...",
    "email": "user@example.com"
  }
}
```

#### Logout
```bash
POST /api/auth/logout
Authorization: Bearer <token>
```

### User Account

#### Get Profile
```bash
GET /api/user/profile
Authorization: Bearer <token>
```

#### Get Credentials (without passwords)
```bash
GET /api/user/credentials
Authorization: Bearer <token>
```

#### Update Credentials
```bash
PUT /api/user/credentials
Authorization: Bearer <token>
Content-Type: application/json

{
  "imapHost": "new-imap-host.com",
  "smtpPass": "new-smtp-password"
  // ... any fields to update
}
```

### Email Operations

All email endpoints require `Authorization: Bearer <token>` header

#### Get Folders
```bash
GET /api/folders
```

#### Get Messages
```bash
GET /api/messages?folder=INBOX&page=1&limit=20
```

#### Get Single Message
```bash
GET /api/messages/:uid?folder=INBOX
```

#### Send Email
```bash
POST /api/compose
Content-Type: application/json

{
  "to": ["recipient@example.com"],
  "cc": ["cc@example.com"],
  "bcc": ["bcc@example.com"],
  "subject": "Hello",
  "body": "<p>Email content</p>",
  "bodyText": "Email content",
  "attachments": []
}
```

#### Mark as Read
```bash
PUT /api/messages/:uid/read?folder=INBOX
```

#### Delete Message
```bash
DELETE /api/messages/:uid?folder=INBOX
```

## Features

✅ Multiple users with individual accounts  
✅ Per-user IMAP/SMTP credentials  
✅ JWT-based authentication  
✅ Session management  
✅ In-memory email service caching  
✅ Secure password hashing  
✅ Full email CRUD operations  

## Security Notes

⚠️ For production deployment:
1. Change `JWT_SECRET` in `.env`
2. Use a proper password hashing library (bcrypt, argon2, etc.)
3. Add HTTPS/TLS for API endpoints
4. Consider encrypting stored IMAP/SMTP passwords
5. Add rate limiting on auth endpoints
6. Use secure session storage (Redis, etc. for multi-instance)
7. Add email verification for registration

## Notes

- Each user has isolated email services
- IMAP/SMTP connections are cached per user
- Sessions expire after 7 days
- Passwords are hashed with SHA256 (should use bcrypt in production)
