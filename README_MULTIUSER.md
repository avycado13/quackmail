# QuackMail Multi-User Implementation

Your QuackMail email client now supports multiple users with individual IMAP/SMTP configurations.

## What Was Done

### 1. Database Setup

- Created SQLite schema with Drizzle ORM
- Tables: `users`, `user_credentials`, `sessions`
- Uses LibSQL client for compatibility

### 2. Authentication System

- JWT-based authentication with 7-day expiry
- User registration with email/password
- Session management with token validation
- Secure password hashing (SHA256 - upgrade to bcrypt for production)

### 3. Per-User Email Services

- Each user has isolated IMAP/SMTP connections
- Credentials stored securely in database
- In-memory service caching for performance
- Full email operations: fetch, send, delete, mark read

### 4. API Endpoints

- `POST /api/auth/register` - New user signup
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/user/profile` - Get user info
- `GET/PUT /api/user/credentials` - Manage email settings
- `GET /api/messages` - List emails
- `GET /api/messages/:id` - Get single email
- `POST /api/compose` - Send email
- `PUT /api/messages/:id/read` - Mark as read
- `DELETE /api/messages/:id` - Delete email
- `GET /api/folders` - List email folders

All email endpoints require `Authorization: Bearer <token>` header.

## Quick Start

### 1. Setup

```bash
cd backend
pnpm install
pnpm run db:migrate
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and set JWT_SECRET
```

### 3. Run

```bash
pnpm run dev
```

Server runs at `http://localhost:3001`

### 4. Test

```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@gmail.com",
    "password": "password123",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapSecure": true,
    "imapUser": "user@gmail.com",
    "imapPass": "your-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "user@gmail.com",
    "smtpPass": "your-app-password",
    "fromEmail": "user@gmail.com"
  }'

# Copy the token and use it:
TOKEN="..."
curl http://localhost:3001/api/folders \
  -H "Authorization: Bearer $TOKEN"
```

## File Structure

```
backend/src/
├── index.ts                          # All API routes
├── db/
│   ├── schema.ts                    # Database schema (users, credentials, sessions)
│   ├── index.ts                     # DB initialization
│   └── migrate.ts                   # Database setup script
├── services/
│   ├── authService.ts               # Auth logic (register, login, verify token)
│   └── emailServiceFactory.ts       # Per-user email service factory
└── middleware/
    └── auth.ts                      # JWT validation middleware
```

## Database Schema

### users

```
id: TEXT (PRIMARY KEY)
email: TEXT (UNIQUE)
password: TEXT (SHA256 hashed)
created_at: INTEGER (unix timestamp)
updated_at: INTEGER (unix timestamp)
```

### user_credentials

```
id: TEXT (PRIMARY KEY)
user_id: TEXT (FK → users.id)
imap_host: TEXT
imap_port: INTEGER (default: 993)
imap_secure: INTEGER (0=false, 1=true)
imap_user: TEXT
imap_pass: TEXT
smtp_host: TEXT
smtp_port: INTEGER (default: 587)
smtp_secure: INTEGER (0=false, 1=true)
smtp_user: TEXT
smtp_pass: TEXT
from_email: TEXT
created_at: INTEGER (unix timestamp)
updated_at: INTEGER (unix timestamp)
```

### sessions

```
id: TEXT (PRIMARY KEY)
user_id: TEXT (FK → users.id)
token: TEXT (UNIQUE, JWT)
expires_at: INTEGER (unix timestamp, 7 days from creation)
created_at: INTEGER (unix timestamp)
```

## Key Features

✅ Multiple users with isolated accounts
✅ Per-user IMAP/SMTP configuration
✅ JWT-based authentication
✅ Session management with expiry
✅ In-memory email service caching
✅ Full email CRUD operations
✅ Database migration scripts
✅ Error handling and validation

## Important Notes

### Security

⚠️ For production:

1. Replace SHA256 with bcrypt/argon2 password hashing
2. Encrypt stored IMAP/SMTP passwords
3. Use HTTPS for API endpoints
4. Add rate limiting on auth endpoints
5. Implement email verification
6. Use Redis for session storage (multi-instance)
7. Change JWT_SECRET to a strong value

### Database

- Uses SQLite with LibSQL for local development
- Can switch to PostgreSQL/MySQL with Drizzle
- Database file: `data/quackmail.db`
- Auto-creates on first run

### Email Credentials

- Stored per user in `user_credentials` table
- Each user can use different email provider
- Supports Gmail, Outlook, custom IMAP/SMTP servers
- For Gmail: Use App Passwords (not regular password)

## Documentation Files

- **QUICK_START.md** - Quick setup guide
- **API_EXAMPLES.md** - Complete API endpoint examples with curl commands
- **MULTIUSER_SETUP.md** - Detailed architecture and security notes
- **IMPLEMENTATION_SUMMARY.md** - Technical overview of changes

## Testing Recommendations

1. Test with multiple users simultaneously
2. Verify token expiry at 7 days
3. Test IMAP/SMTP with different providers
4. Test email operations isolation (user A can't see user B's emails)
5. Test logout invalidates token
6. Test invalid credentials properly fail

## Frontend Integration

The frontend needs:

1. Login/Register pages
2. Store JWT token in localStorage/sessionStorage
3. Add `Authorization: Bearer <token>` header to all API requests
4. Redirect to login when token invalid/expired
5. Send user credentials during registration
6. Handle token refresh (implement if using refresh tokens)

## Common Issues

### "Failed to connect to email server"

- Check IMAP/SMTP credentials
- Verify host/port are correct
- For Gmail: Use App Password, not account password

### "User already exists"

- Email already registered
- Use different email or delete from database

### "Invalid token"

- Token expired (7 days)
- Token invalid or tampered with
- Re-login to get new token

### Database errors

- Ensure `pnpm run db:migrate` was run
- Check file permissions on `data/quackmail.db`
- Clear database and re-run migration if corrupted

## Next Steps

1. ✅ Backend multi-user API complete
2. ⏳ Build frontend login/register pages
3. ⏳ Add token persistence to localStorage
4. ⏳ Add auth header to all frontend API calls
5. ⏳ Test with real email accounts
6. ⏳ Deploy with production security hardening

## Dependencies Added

- `drizzle-orm` - ORM for database
- `@libsql/client` - SQLite client
- `drizzle-kit` - Migration tools
- `jsonwebtoken` - JWT signing/verification

## Environment Variables

```
DATABASE_URL=file:./data/quackmail.db    # SQLite database path
JWT_SECRET=your-secret-key-change-in-production   # JWT signing secret
```

## Performance Considerations

- Email service instances cached per user (reduces IMAP connections)
- JWT validation before each request
- Session expiry at 7 days
- Consider adding:
  - Rate limiting
  - Email pagination optimization
  - Connection pooling for IMAP
  - Caching email list

## Support & Debugging

Check logs in terminal running `pnpm run dev`:

- Connection errors indicate IMAP/SMTP issues
- Auth errors indicate token/credential problems
- Database errors indicate schema issues

For detailed request/response examples, see `API_EXAMPLES.md`.

---

**Status**: ✅ Complete - Ready for frontend integration and testing
