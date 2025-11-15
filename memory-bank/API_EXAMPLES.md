# QuackMail Multi-User API Examples

## 1. Register a New User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure-password-123",
    "imapHost": "imap.gmail.com",
    "imapPort": 993,
    "imapSecure": true,
    "imapUser": "john@gmail.com",
    "imapPass": "your-gmail-app-password",
    "smtpHost": "smtp.gmail.com",
    "smtpPort": 587,
    "smtpSecure": false,
    "smtpUser": "john@gmail.com",
    "smtpPass": "your-gmail-app-password",
    "fromEmail": "john@gmail.com"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4e5f6g7h8",
    "email": "john@example.com"
  }
}
```

## 2. Login

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "secure-password-123"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "a1b2c3d4e5f6g7h8",
    "email": "john@example.com"
  }
}
```

## 3. Get User Profile

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:3001/api/user/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "userId": "a1b2c3d4e5f6g7h8"
}
```

## 4. Get User Credentials (without passwords)

```bash
curl -X GET http://localhost:3001/api/user/credentials \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "cred-id-123",
  "userId": "a1b2c3d4e5f6g7h8",
  "imapHost": "imap.gmail.com",
  "imapPort": 993,
  "imapSecure": 1,
  "imapUser": "john@gmail.com",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": 587,
  "smtpSecure": 0,
  "smtpUser": "john@gmail.com",
  "fromEmail": "john@gmail.com",
  "createdAt": 1699564800,
  "updatedAt": 1699564800
}
```

## 5. Update User Credentials

```bash
curl -X PUT http://localhost:3001/api/user/credentials \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "imapPass": "new-gmail-app-password",
    "smtpPass": "new-gmail-app-password"
  }'
```

**Response:** Same as Get Credentials

## 6. List Email Folders

```bash
curl -X GET http://localhost:3001/api/folders \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "name": "INBOX",
    "count": 5
  },
  {
    "name": "Sent",
    "count": 12
  },
  {
    "name": "Drafts",
    "count": 2
  },
  {
    "name": "Trash",
    "count": 8
  }
]
```

## 7. Get Messages from Folder

```bash
# Get first page with 20 emails per page
curl -X GET "http://localhost:3001/api/messages?folder=INBOX&page=1&limit=20" \
  -H "Authorization: Bearer $TOKEN"

# Get second page
curl -X GET "http://localhost:3001/api/messages?folder=INBOX&page=2&limit=20" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "12345",
    "uid": 12345,
    "subject": "Welcome to QuackMail",
    "from": "sender@example.com",
    "to": ["john@gmail.com"],
    "date": "2024-11-09T10:30:00.000Z",
    "folder": "INBOX",
    "unread": true,
    "bodyHtml": "<p>Welcome message</p>",
    "bodyText": "Welcome message"
  }
]
```

## 8. Get Single Email Message

```bash
curl -X GET "http://localhost:3001/api/messages/12345?folder=INBOX" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "12345",
  "uid": 12345,
  "subject": "Welcome to QuackMail",
  "from": "sender@example.com",
  "to": ["john@gmail.com"],
  "date": "2024-11-09T10:30:00.000Z",
  "folder": "INBOX",
  "unread": true,
  "bodyHtml": "<p>Welcome message</p>",
  "bodyText": "Welcome message"
}
```

## 9. Send Email

```bash
curl -X POST http://localhost:3001/api/compose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "to": ["recipient@example.com"],
    "cc": ["cc@example.com"],
    "bcc": ["bcc@example.com"],
    "subject": "Hello World",
    "body": "<p>This is an HTML email</p>",
    "bodyText": "This is plain text",
    "attachments": []
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "messageId": "<message-id@gmail.com>"
}
```

## 10. Mark Email as Read

```bash
curl -X PUT "http://localhost:3001/api/messages/12345/read?folder=INBOX" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true
}
```

## 11. Delete Email

```bash
curl -X DELETE "http://localhost:3001/api/messages/12345?folder=INBOX" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true
}
```

## 12. Logout

```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true
}
```

## Error Responses

### Missing Authorization Header
```bash
curl http://localhost:3001/api/folders
```

**Response (401):**
```json
{
  "error": "Missing authorization header"
}
```

### Invalid Token
```bash
curl http://localhost:3001/api/folders \
  -H "Authorization: Bearer invalid-token"
```

**Response (401):**
```json
{
  "error": "Invalid token"
}
```

### Invalid Credentials
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "wrong-password"
  }'
```

**Response (401):**
```json
{
  "error": "Invalid credentials"
}
```

### User Already Exists
```bash
# Register same email twice
```

**Response (400):**
```json
{
  "error": "User already exists"
}
```

### IMAP Connection Error

If IMAP credentials are incorrect:

```bash
curl http://localhost:3001/api/folders \
  -H "Authorization: Bearer $TOKEN"
```

**Response (500):**
```json
{
  "error": "Failed to connect to email server: Invalid login credentials"
}
```

## JavaScript Client Example

```javascript
// Register
const registerRes = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    imapUser: 'user@gmail.com',
    imapPass: 'app-password',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 587,
    smtpSecure: false,
    smtpUser: 'user@gmail.com',
    smtpPass: 'app-password',
    fromEmail: 'user@gmail.com'
  })
});

const { token } = await registerRes.json();
localStorage.setItem('token', token);

// Get messages
const messagesRes = await fetch('http://localhost:3001/api/messages?folder=INBOX', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const messages = await messagesRes.json();
console.log(messages);

// Send email
const sendRes = await fetch('http://localhost:3001/api/compose', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    to: ['recipient@example.com'],
    subject: 'Hello',
    body: '<p>Email content</p>'
  })
});

const result = await sendRes.json();
console.log(result);
```

## Rate Limiting Recommendations

For production, consider rate limiting:
- Auth endpoints: 5 requests per minute per IP
- Email send: 10 requests per hour per user
- General API: 100 requests per minute per user
