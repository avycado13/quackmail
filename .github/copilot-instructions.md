# Copilot Instructions for QuackMail

## Project Overview
QuackMail is a multi-user email client that provides isolated IMAP/SMTP connections per user. The system consists of:
- Next.js frontend for user interface
- Hono.js backend API server
- SQLite database (via Drizzle ORM)
- Per-user IMAP/SMTP connections

## Key Architecture Patterns

### User Isolation Pattern
All email operations are isolated per user:
```typescript
// ✅ DO: Always get email service through factory with userId
const emailService = await getUserEmailService(userId);

// ❌ DON'T: Never create email service directly
const emailService = new UserEmailService(credentials);
```

### Authentication Flow
JWT-based auth with database session validation:
```typescript
// Required on all protected routes
app.use('/api/*', authMiddleware);

// Auth middleware extracts userId from JWT
const userId = ctx.get('userId');
```

### Database Schema Structure
Follow established table relationships:
- `users` ← one-to-one → `user_credentials`
- `users` ← one-to-many → `sessions`

## Critical Development Workflows

### Database Updates
1. Edit schema in `backend/src/db/schema.ts`
2. Run migration: `pnpm run db:migrate`
3. Check `backend/drizzle/` for generated SQL

### Testing Changes
Test new features with multiple user accounts:
```bash
# Create test users with different email providers
pnpm test:setup-users

# Run test suite
pnpm test
```

### Environment Configuration
Required `.env` variables:
```
JWT_SECRET=<32+ char string>
DATABASE_URL=file:./data/quackmail.db
```

## Common Patterns

### Error Handling
Use custom error classes with HTTP status codes:
```typescript
// backend/src/errors.ts
throw new UnauthorizedError("Invalid token");
throw new BadRequestError("User already exists");
```

### Email Service Factory Pattern
```typescript
// ✅ DO: Use factory to get cached service
const service = emailServiceFactory.getUserEmailService(userId);

// ❌ DON'T: Create new service instances
new EmailService(config); // Wrong!
```

### Frontend Auth Pattern
All API requests must include token:
```typescript
// frontend/src/lib/api.ts
const headers = {
  Authorization: `Bearer ${getToken()}`
};
```

## Integration Points

### Email Provider Integration
Support various IMAP/SMTP providers:
- Gmail (requires app password)
- Outlook 
- Custom IMAP/SMTP servers

See `QUICK_START.md` for provider-specific setup.

### Frontend-Backend Communication
All email operations go through protected API routes:
```
GET /api/messages?folder=INBOX
GET /api/folders
POST /api/compose
```

## Project Organization
```
backend/
  src/
    db/          # Database schema & migrations
    services/    # Core business logic
    middleware/  # Auth & validation
frontend/
  src/
    app/        # Next.js pages
    components/ # React components
    lib/        # Shared utilities
```

## Common Pitfalls

### Authentication
- ❌ Don't skip token validation
- ❌ Don't store raw passwords
- ❌ Don't expose credentials in API responses

### Email Services
- ❌ Don't create multiple services per user
- ❌ Don't share connections between users
- ❌ Don't hardcode email credentials

### Database
- ❌ Don't manually edit SQLite file
- ❌ Don't skip foreign key constraints
- ❌ Don't expose internal IDs in APIs