# QuackMail Multi-User Quick Start

## Prerequisites
- Node.js 18+
- pnpm 10+
- IMAP/SMTP credentials (Gmail, Outlook, etc.)

## Setup Steps

### 1. Install Dependencies
```bash
cd backend
pnpm install
```

### 2. Initialize Database
```bash
pnpm run db:migrate
```

This creates:
- `data/quackmail.db` - SQLite database
- Tables: `users`, `user_credentials`, `sessions`

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` to set:
```
JWT_SECRET=your-super-secret-key-minimum-32-chars
```

### 4. Start Server
```bash
pnpm run dev
```

Server runs at `http://localhost:3001`

## Quick Test

Open another terminal and test the API:

### Register User
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "mypassword",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapSecure": true,
    "imapUser": "test@gmail.com",
    "imapPass": "your-gmail-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "test@gmail.com",
    "smtpPass": "your-gmail-app-password",
    "fromEmail": "test@gmail.com"
  }'
```

Save the returned token:
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Get Folders
```bash
curl http://localhost:3001/api/folders \
  -H "Authorization: Bearer $TOKEN"
```

### Get Inbox Messages
```bash
curl "http://localhost:3001/api/messages?folder=INBOX" \
  -H "Authorization: Bearer $TOKEN"
```

### Send Email
```bash
curl -X POST http://localhost:3001/api/compose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "to": ["recipient@example.com"],
    "subject": "Hello",
    "body": "<p>Test email</p>"
  }'
```

## Gmail Setup

To use with Gmail:

1. Enable 2-Factor Authentication in Gmail account settings
2. Create an App Password (not your actual password):
   - Go to Google Account → Security
   - Select "App passwords" 
   - Create password for "Mail" and "Windows Computer"
   - Use this 16-character password in `imapPass` and `smtpPass`

3. Use in QuackMail:
   ```
   imapUser: your-email@gmail.com
   imapPass: xxxx xxxx xxxx xxxx (the 16-char app password)
   smtpUser: your-email@gmail.com
   smtpPass: xxxx xxxx xxxx xxxx (same app password)
   ```

## Troubleshooting

### "Failed to connect to email server"
- Check IMAP/SMTP credentials are correct
- For Gmail: Use App Password, not account password
- Verify host/port are correct for your email provider

### "User already exists"
- You're trying to register with an email that's already registered
- Use a different email or delete from database

### "Invalid token"
- Token is invalid or expired (7 days)
- Re-login to get a new token

### "Email not found"
- Message UID is incorrect
- Try getting messages list first to get valid UIDs

## Next Steps

1. Update frontend with login/register pages
2. Add token storage to localStorage
3. Add Authorization header to API requests
4. Test with multiple users
5. Set up production environment with:
   - HTTPS/TLS
   - Proper password hashing (bcrypt)
   - Password encryption in database
   - Rate limiting
   - Email verification

## API Documentation

See `API_EXAMPLES.md` for detailed endpoint documentation.

See `MULTIUSER_SETUP.md` for architecture and security notes.

## Project Structure

```
backend/
├── src/
│   ├── index.ts              # Main API routes
│   ├── db/
│   │   ├── schema.ts         # Database schema
│   │   ├── index.ts          # DB connection
│   │   └── migrate.ts        # Migration script
│   ├── services/
│   │   ├── authService.ts    # User auth logic
│   │   └── emailServiceFactory.ts  # Per-user email service
│   └── middleware/
│       └── auth.ts           # JWT validation
├── drizzle/                  # Auto-generated migrations
├── data/
│   └── quackmail.db         # SQLite database
├── .env                      # Configuration
└── package.json
```

## Database Schema

```
users
  ├── id (TEXT, PRIMARY KEY)
  ├── email (TEXT, UNIQUE)
  ├── password (TEXT, hashed)
  ├── created_at (INTEGER)
  └── updated_at (INTEGER)

user_credentials
  ├── id (TEXT, PRIMARY KEY)
  ├── user_id (TEXT, FK→users)
  ├── imap_host (TEXT)
  ├── imap_port (INTEGER)
  ├── imap_secure (INTEGER)
  ├── imap_user (TEXT)
  ├── imap_pass (TEXT)
  ├── smtp_host (TEXT)
  ├── smtp_port (INTEGER)
  ├── smtp_secure (INTEGER)
  ├── smtp_user (TEXT)
  ├── smtp_pass (TEXT)
  ├── from_email (TEXT)
  ├── created_at (INTEGER)
  └── updated_at (INTEGER)

sessions
  ├── id (TEXT, PRIMARY KEY)
  ├── user_id (TEXT, FK→users)
  ├── token (TEXT, UNIQUE)
  ├── expires_at (INTEGER)
  └── created_at (INTEGER)
```

## Support

For issues:
1. Check logs in terminal running `pnpm run dev`
2. Verify email provider credentials
3. Check database exists at `data/quackmail.db`
4. See detailed API docs in `API_EXAMPLES.md`
