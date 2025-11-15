# Tech Context: QuackMail Email Integration

## Technologies Used

### Backend Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Hono (modern web framework for Cloudflare Workers/Edge runtime)
- **Build Tool**: tsx (TypeScript execution and bundling)
- **Package Manager**: pnpm (efficient package management)

### Email Integration Libraries
- **IMAP Client**: imapflow (modern, promise-based IMAP library)
- **SMTP Client**: nodemailer (comprehensive email sending library)
- **Email Parser**: mailparser (robust email content parsing)
- **Environment**: dotenv (environment variable management)

### Frontend Stack
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components with shadcn/ui
- **State Management**: React Query (TanStack Query) for server state
- **Build Tool**: Next.js built-in bundler

### Development Tools
- **Version Control**: Git
- **Containerization**: Docker with docker-compose
- **Code Quality**: ESLint configuration
- **Type Checking**: TypeScript strict mode

## Development Setup

### Environment Requirements
- **Node.js**: Version 18+ (LTS recommended)
- **pnpm**: Version 8+ for package management
- **Docker**: For containerized development/testing

### Project Structure
```
quackmail/
├── backend/                 # Hono API server
│   ├── src/
│   │   ├── index.ts        # Main server file
│   │   └── emailService.ts # Email service abstraction
│   ├── package.json
│   └── .env               # Environment variables
├── frontend/               # Next.js client
│   ├── src/
│   │   ├── app/           # App router pages
│   │   └── components/    # React components
│   └── package.json
├── docker-compose.yml      # Development environment
└── memory-bank/           # Project documentation
```

## Technical Constraints

### Email Protocol Limitations
- **IMAP Compatibility**: Must support IMAP4rev1 standard
- **SMTP Requirements**: SMTP AUTH and STARTTLS support required
- **Connection Limits**: Respect server connection limits and rate limits
- **Message Size**: Handle large email attachments efficiently

### Security Constraints
- **Credential Storage**: Environment variables only, no database storage
- **Connection Security**: TLS/SSL encryption mandatory for all connections
- **Input Validation**: Sanitize all user inputs to prevent injection attacks
- **Session Security**: Stateless authentication with secure token management

### Performance Constraints
- **Memory Usage**: Implement pagination to handle large mailboxes
- **Connection Pooling**: Efficient connection reuse to reduce overhead
- **Background Processing**: Non-blocking operations for real-time features
- **Caching Strategy**: Balance freshness with performance optimization

## Dependencies and Tool Usage Patterns

### Core Dependencies
- **imapflow**: Used for all IMAP operations (connect, fetch, monitor)
- **nodemailer**: Used for SMTP email sending with full feature support
- **mailparser**: Used for parsing complex email content and attachments
- **dotenv**: Used for secure environment variable loading

### Development Dependencies
- **tsx**: Used for running TypeScript in development
- **@types/node**: TypeScript definitions for Node.js APIs
- **ESLint**: Code quality and consistency enforcement

### Runtime Considerations
- **Edge Runtime Compatibility**: Hono designed for edge environments
- **ESM Modules**: Modern ES module syntax throughout
- **Async/Await**: Promise-based asynchronous programming
- **Type Safety**: Full TypeScript coverage for reliability
