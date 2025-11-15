# System Patterns: QuackMail Email Integration

## System Architecture

### Backend Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Hono Server   │────│  Email Service   │────│  IMAP/SMTP      │
│                 │    │                  │    │  Providers      │
│ • REST API      │    │ • IMAP Client    │    │                 │
│ • WebSocket     │    │ • SMTP Client    │    │ • Gmail         │
│ • Auth          │    │ • Message Parser │    │ • Outlook       │
└─────────────────┘    └──────────────────┘    │ • Custom        │
                                               └─────────────────┘
```

### Service Layer Pattern
- **EmailService**: Central abstraction for all email operations
- **Connection Management**: Singleton pattern for IMAP connections
- **Error Handling**: Centralized error handling with user-friendly messages
- **Caching**: In-memory caching for frequently accessed data

### Data Flow Patterns
1. **Authentication**: User credentials → Environment validation → IMAP/SMTP connection
2. **Email Fetching**: Folder selection → IMAP query → Message parsing → API response
3. **Email Sending**: Compose data → SMTP transport → Success/failure response
4. **Real-time Updates**: IMAP IDLE → WebSocket push → Frontend refresh

## Key Technical Decisions

### IMAP Implementation
- **Library**: imapflow for modern async/await support
- **Connection**: Persistent connection with automatic reconnection
- **Fetching**: Paginated fetching with metadata-first approach
- **Parsing**: mailparser for robust HTML/text content extraction

### SMTP Implementation
- **Library**: nodemailer for comprehensive email sending
- **Transport**: Secure SMTP with TLS/SSL support
- **Attachments**: Stream-based handling for large files
- **Templates**: Support for HTML/plaintext email composition

### Security Patterns
- **Credential Storage**: Environment variables only
- **Connection Security**: TLS/SSL encryption required
- **Session Management**: Stateless API with JWT tokens
- **Input Validation**: Sanitize all user inputs

### Performance Patterns
- **Pagination**: Limit email fetches to prevent memory issues
- **Background Sync**: Non-blocking email synchronization
- **Connection Pooling**: Reuse connections when possible
- **Caching Strategy**: Cache folder structures and recent emails

## Component Relationships

### Email Service Dependencies
- **imapflow**: Core IMAP client functionality
- **nodemailer**: SMTP email sending
- **mailparser**: Email content parsing
- **dotenv**: Environment configuration

### API Layer Dependencies
- **Hono**: Web framework for REST/WebSocket endpoints
- **JWT**: Authentication token management
- **WebSocket**: Real-time push notifications

### Frontend Integration
- **React Query**: Efficient data fetching and caching
- **WebSocket Client**: Real-time email updates
- **TypeScript**: Type-safe API communication
