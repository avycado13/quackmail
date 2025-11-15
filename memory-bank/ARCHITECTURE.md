# QuackMail Multi-User Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                   │
│                   (Login/Register/Email UI)                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                    HTTP/REST API
                    Bearer Token
                         │
         ┌───────────────┴────────────────┐
         │                                │
    ┌────▼─────────────────────────────┐ │
    │   Hono.js API Server (Port 3001) │ │
    │                                  │ │
    │  ┌──────────────────────────────┐│ │
    │  │   Auth Middleware            ││ │
    │  │  - Validate JWT Token        ││ │
    │  │  - Extract User ID           ││ │
    │  │  - Check Session Valid       ││ │
    │  └──────────────────────────────┘│ │
    │                                  │ │
    │  ┌──────────────────────────────┐│ │
    │  │   Auth Service               ││ │
    │  │  - Register User             ││ │
    │  │  - Login / Logout            ││ │
    │  │  - Verify Token              ││ │
    │  │  - Manage Credentials        ││ │
    │  └──────────────────────────────┘│ │
    │                                  │ │
    │  ┌──────────────────────────────┐│ │
    │  │   Email Service Factory      ││ │
    │  │  - Get User Email Service    ││ │
    │  │  - Cache Service Instances   ││ │
    │  └──────────────────────────────┘│ │
    │                                  │ │
    │  ┌──────────────────────────────┐│ │
    │  │   API Routes                 ││ │
    │  │  - /api/auth/*               ││ │
    │  │  - /api/messages/*           ││ │
    │  │  - /api/folders              ││ │
    │  │  - /api/compose              ││ │
    │  │  - /api/user/*               ││ │
    │  └──────────────────────────────┘│ │
    └────┬─────────────────────────────┘ │
         │                               │
         │  Database Access             │
         │  (Drizzle ORM)               │
         │                               │
    ┌────▼────────────────────────────┐  │
    │   SQLite Database                │  │
    │   (data/quackmail.db)            │  │
    │                                  │  │
    │  ┌──────────────────────────────┐│  │
    │  │ users                        ││  │
    │  │ ├─ id                        ││  │
    │  │ ├─ email (UNIQUE)            ││  │
    │  │ ├─ password (hashed)         ││  │
    │  │ └─ timestamps                ││  │
    │  └──────────────────────────────┘│  │
    │                                  │  │
    │  ┌──────────────────────────────┐│  │
    │  │ user_credentials             ││  │
    │  │ ├─ user_id (FK)              ││  │
    │  │ ├─ imap_host/port/user/pass  ││  │
    │  │ ├─ smtp_host/port/user/pass  ││  │
    │  │ ├─ from_email                ││  │
    │  │ └─ timestamps                ││  │
    │  └──────────────────────────────┘│  │
    │                                  │  │
    │  ┌──────────────────────────────┐│  │
    │  │ sessions                     ││  │
    │  │ ├─ user_id (FK)              ││  │
    │  │ ├─ token (UNIQUE JWT)        ││  │
    │  │ ├─ expires_at                ││  │
    │  │ └─ created_at                ││  │
    │  └──────────────────────────────┘│  │
    └──────────────────────────────────┘  │
         │                                │
         └────────────────────────────────┘
         │
    IMAP/SMTP Connections (per user)
         │
    ┌────▼────────────────────────────┐
    │   External Email Servers         │
    │  ├─ Gmail (imap.gmail.com)      │
    │  ├─ Outlook, etc.               │
    │  └─ Custom IMAP/SMTP servers    │
    └─────────────────────────────────┘
```

## Data Flow: User Registration

```
Client                          Server                      Database
  │                              │                             │
  ├──── POST /auth/register ────>│                             │
  │     {email, password,        │                             │
  │      imap/smtp creds}        │                             │
  │                              │                             │
  │                              ├──── Hash Password ───────>  │
  │                              │                             │
  │                              ├──── INSERT users ────────>  │
  │                              │                             │
  │                              ├──── INSERT credentials ─>  │
  │                              │     (user_credentials)      │
  │                              │                             │
  │                              ├──── Generate JWT ────────>  │
  │                              │                             │
  │                              ├──── INSERT session ──────>  │
  │                              │                             │
  │  <──── {token, user} ────────┤                             │
  │                              │                             │
```

## Data Flow: User Login

```
Client                          Server                      Database
  │                              │                             │
  ├──── POST /auth/login ───────>│                             │
  │     {email, password}        │                             │
  │                              │                             │
  │                              ├──── SELECT users ───────>  │
  │                              │     WHERE email=?           │
  │                              │                             │
  │                              │<───── user record ────────┤
  │                              │                             │
  │                              ├──── Verify Password ───────┤
  │                              │                             │
  │                              ├──── Generate JWT ────────┤
  │                              │                             │
  │                              ├──── INSERT session ─────>│
  │                              │                             │
  │  <──── {token, user} ────────┤                             │
  │                              │                             │
```

## Data Flow: Get Email Messages

```
Client                          Server                    Database      Email Server
  │                              │                          │               │
  ├─── GET /messages ──────────>│                          │               │
  │     Bearer: <token>          │                          │               │
  │                              │                          │               │
  │                              ├─ Validate Token ────────>│               │
  │                              │<─ Valid + userId ───────┤               │
  │                              │                          │               │
  │                              ├─ Get Credentials ──────>│               │
  │                              │<─ IMAP settings ───────┤               │
  │                              │                          │               │
  │                              ├────── IMAP Connect ─────────────────>│
  │                              │                          │          IMAP│
  │                              │<────── List Folders ─────────────────┤│
  │                              │                          │          IMAP│
  │                              │<────── Fetch Emails ─────────────────┤│
  │                              │                          │              │
  │                              ├──── Parse Emails ──────┤              │
  │                              │                          │              │
  │  <── [{messages}] ──────────┤                          │              │
  │                              │                          │              │
```

## Per-User Email Service Architecture

```
┌─────────────────────────────────────────────────────┐
│            Email Service Factory                    │
│                                                     │
│  getUserEmailService(userId)                        │
│   ├─ Check Cache                                    │
│   │   └─ Found? Return cached service               │
│   │                                                 │
│   ├─ Not Found:                                     │
│   │  ├─ Get User Credentials from DB               │
│   │  │                                              │
│   │  ├─ Initialize IMAP Config                     │
│   │  │  ├─ host, port, secure                      │
│   │  │  └─ user, pass                              │
│   │  │                                              │
│   │  ├─ Initialize SMTP Config                     │
│   │  │  ├─ host, port, secure                      │
│   │  │  └─ user, pass                              │
│   │  │                                              │
│   │  ├─ Create UserEmailService instance           │
│   │  │  ├─ ImapFlow client                         │
│   │  │  ├─ Nodemailer transporter                  │
│   │  │  └─ Connection state                        │
│   │  │                                              │
│   │  └─ Cache service instance                     │
│   │                                                 │
│   └─ Return service                                │
│                                                     │
│  Methods:                                           │
│  ├─ connect()           → IMAP connection          │
│  ├─ disconnect()        → Close IMAP               │
│  ├─ getFolders()        → List mail folders        │
│  ├─ getEmails()         → Fetch paginated emails   │
│  ├─ getEmail(uid)       → Get single email         │
│  ├─ sendEmail()         → Send via SMTP            │
│  ├─ markAsRead()        → Set \Seen flag          │
│  └─ deleteEmail()       → Set \Deleted flag        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Authentication Flow with JWT

```
┌─────────────────────────────────────────────────────┐
│              JWT Token Lifecycle                    │
│                                                     │
│  1. Registration/Login                              │
│     └─ Sign JWT with userId                        │
│     └─ Expiry: 7 days                              │
│     └─ Secret: JWT_SECRET from .env               │
│                                                     │
│  2. Client stores token                             │
│     └─ localStorage / sessionStorage / cookies     │
│                                                     │
│  3. Client sends with each request                  │
│     └─ Authorization: Bearer <token>               │
│                                                     │
│  4. Server validates token                          │
│     ├─ Decode JWT signature                        │
│     ├─ Extract userId                              │
│     ├─ Check session exists in DB                  │
│     ├─ Check session not expired                   │
│     └─ Attach userId to request context            │
│                                                     │
│  5. Request handler uses userId                     │
│     └─ getUserEmailService(userId)                │
│                                                     │
│  6. Token expires after 7 days                      │
│     └─ Client must re-login                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Isolation & Security

```
┌──────────────────────────────────────────────────────┐
│          User Data Isolation                         │
│                                                      │
│  User A                        User B               │
│  ├─ Credentials               ├─ Credentials       │
│  │  └─ imap.gmail.com         │  └─ imap.outlook  │
│  │     user@gmail.com         │     user@outlook  │
│  │     password123            │     password456    │
│  │                            │                   │
│  ├─ Session Token A           ├─ Session Token B  │
│  │  └─ Valid 7 days           │  └─ Valid 7 days │
│  │                            │                   │
│  ├─ Email Service Instance    ├─ Email Service    │
│  │  └─ IMAP: gmail connection │  │  └─ IMAP: outlook
│  │  └─ SMTP: gmail auth       │  │  └─ SMTP: outlook
│  │                            │                   │
│  └─ Mailbox Access           └─ Mailbox Access   │
│     └─ user@gmail.com inbox     └─ user@outlook  │
│        (only A can see)           (only B can see)│
│                                                      │
│  Auth Middleware enforces:                          │
│  ├─ Token only works for User A's endpoints        │
│  ├─ Can't access User B's credentials             │
│  ├─ Can't read User B's emails                    │
│  └─ Each user isolated by userId check           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌──────────────────────────────────────────────────────┐
│           Error Handling Paths                       │
│                                                      │
│  Invalid Token                                       │
│  └─ Middleware rejects                              │
│  └─ 401 Unauthorized                                │
│                                                      │
│  Token Expired (>7 days)                            │
│  └─ Session check fails                             │
│  └─ 401 Unauthorized                                │
│                                                      │
│  Invalid Credentials                                │
│  └─ Wrong email/password at login                   │
│  └─ 401 Unauthorized                                │
│                                                      │
│  IMAP Connection Error                              │
│  └─ Bad host/port/credentials                       │
│  └─ 500 Internal Server Error                       │
│  └─ Message: "Failed to connect to email server"    │
│                                                      │
│  Database Error                                      │
│  └─ Schema issue or missing table                   │
│  └─ 500 Internal Server Error                       │
│                                                      │
│  User Already Exists                                │
│  └─ Register with duplicate email                   │
│  └─ 400 Bad Request                                 │
│  └─ Message: "User already exists"                  │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────┐
│                  Tech Stack                         │
│                                                     │
│  Runtime:        Node.js 18+                        │
│  Framework:      Hono.js (lightweight web)         │
│  Language:       TypeScript                         │
│  ORM:            Drizzle ORM                        │
│  Database:       SQLite + LibSQL                    │
│  Auth:           JWT (jsonwebtoken)                 │
│  IMAP Client:    imapflow                           │
│  SMTP Client:    nodemailer                         │
│  Email Parser:   mailparser                         │
│  Password Hash:  crypto (SHA256)                    │
│                  [Use bcrypt in production]        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## Deployment Architecture (Recommended)

```
┌─────────────────────────────────────────────────────┐
│              Production Setup                       │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │           Load Balancer / CDN               │  │
│  └────────────────────┬────────────────────────┘  │
│                       │                            │
│  ┌────────────────────┴────────────────────────┐  │
│  │      Frontend (Static + Vercel/Netlify)    │  │
│  │      - Login/Register pages                │  │
│  │      - Email UI                            │  │
│  │      - Token in localStorage               │  │
│  └────────────┬─────────────────────────────┬──┘  │
│               │                             │     │
│               └─────────────────────────────┘     │
│                       │                            │
│     ┌─────────────────┴─────────────────────┐    │
│     │         HTTPS / TLS                    │    │
│     └──────────────────┬──────────────────────┘   │
│                        │                          │
│  ┌─────────────────────▼──────────────────────┐  │
│  │     API Server Cluster (Docker)            │  │
│  │  - 2-3 instances behind load balancer     │  │
│  │  - Hono.js on port 3001                  │  │
│  │  - Environment variables for secrets      │  │
│  └──┬────────────────────────────────────────┘  │
│     │                                           │
│     └──────────┬──────────────────┬──────────┐  │
│                │                  │          │  │
│  ┌─────────────▼────────┐  ┌──────▼──────────┴─┐
│  │   PostgreSQL DB      │  │   Redis Session  │
│  │  (if scaling)        │  │   Store          │
│  │  - users             │  │  (multi-instance)│
│  │  - credentials       │  │                  │
│  │  - sessions          │  │                  │
│  └──────────────────────┘  └──────────────────┘
│                │
│  ┌─────────────▼────────────────────┐
│  │  External Email Servers (IMAP)   │
│  │  - Gmail                          │
│  │  - Outlook                        │
│  │  - Custom servers                 │
│  └────────────────────────────────┘
│                                    │
│  ┌─────────────┬──────────────────┘
│  │   Backups   │
│  │   - Database snapshots
│  │   - Encrypted credentials
│  └─────────────┘
│
└─────────────────────────────────────────────────────┘

Additional Services:
- SSL/TLS Certificate (Let's Encrypt)
- Rate Limiting (Cloudflare / Middleware)
- Logging (DataDog / CloudWatch)
- Error Tracking (Sentry)
- Monitoring (Datadog / New Relic)
```

---

This architecture ensures:
- ✅ Secure multi-user isolation
- ✅ Per-user email credential security
- ✅ Scalable with proper session management
- ✅ JWT-based stateless authentication
- ✅ Fast email service caching
- ✅ Support for multiple email providers
