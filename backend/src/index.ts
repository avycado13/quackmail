import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { trpcServer } from '@hono/trpc-server'
import { authService } from './services/authService.js'
import { getUserEmailService } from './services/emailServiceFactory.js'
import { authMiddleware } from './middleware/auth.js'
import { appRouter } from './routers/index.js'
import { createContext } from './context.js'

const app = new Hono()
app.use('/api/*', cors())

// Apply auth middleware to tRPC - optional auth (won't error if no token)
app.use('/api/trpc/*', async (c: any, next: any) => {
  const authHeader = c.req.header('Authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      const { userId } = await authService.verifyToken(token)
      ;(c as any).set('userId', userId)
      ;(c as any).set('token', token)
    } catch (error) {
      // Token is invalid, but we continue - some procedures don't need auth
    }
  }
  
  await next()
})

// tRPC endpoint
app.use('/api/trpc/*', trpcServer({
  router: appRouter,
  createContext,
}))

// Public Auth Routes
app.post('/api/auth/register', async (c) => {
  try {
    const body = await c.req.json()

    const result = await authService.register({
      email: body.email,
      password: body.password,
      imapPass: body.imapPass,
      smtpPass: body.smtpPass,
      fromEmail: body.fromEmail,
    })

    return c.json(result, 201)
  } catch (error) {
    console.error('Registration failed:', error)
    return c.json({ error: (error as Error).message }, 400)
  }
})

app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json()

    if (!body.email || !body.password) {
      return c.json({ error: 'Email and password required' }, 400)
    }

    const result = await authService.login(body.email, body.password)

    return c.json(result)
  } catch (error) {
    console.error('Login failed:', error)
    return c.json({ error: (error as Error).message }, 401)
  }
})

// Protected Routes
app.use('/api/messages*', authMiddleware)
app.use('/api/folders*', authMiddleware)
app.use('/api/compose*', authMiddleware)
app.use('/api/user*', authMiddleware)

app.get('/api/user/profile', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    // Fetch user from DB
    return c.json({ userId })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.get('/api/user/credentials', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const creds = await authService.getUserCredentials(userId)

    // Don't return passwords
    const { imapPass, smtpPass, ...safeCreds } = creds
    return c.json(safeCreds)
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.put('/api/user/credentials', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const body = await c.req.json()

    await authService.updateUserCredentials(userId, body)

    const creds = await authService.getUserCredentials(userId)
    const { imapPass, smtpPass, ...safeCreds } = creds

    return c.json(safeCreds)
  } catch (error) {
    console.error('Failed to update credentials:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.post('/api/auth/logout', async (c: any) => {
  try {
    const token = c.get('token') as string
    await authService.logout(token)
    return c.json({ success: true })
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500)
  }
})

// Email Routes
app.get('/api/messages', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)

    const folder = c.req.query('folder') || 'INBOX'
    const page = parseInt(c.req.query('page') || '1')
    const limit = parseInt(c.req.query('limit') || '20')

    const emails = await emailService.getEmails(folder, page, limit)
    return c.json(emails)
  } catch (error) {
    console.error('Failed to fetch messages:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.get('/api/messages/:id', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)

    const id = c.req.param('id')
    const folder = c.req.query('folder') || 'INBOX'
    const uid = parseInt(id)

    if (isNaN(uid)) {
      return c.json({ error: 'Invalid email ID' }, 400)
    }

    const email = await emailService.getEmail(uid, folder)
    if (!email) {
      return c.json({ error: 'Email not found' }, 404)
    }
    return c.json(email)
  } catch (error) {
    console.error('Failed to fetch email:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.get('/api/folders', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)

    const folders = await emailService.getFolders()
    return c.json(folders)
  } catch (error) {
    console.error('Failed to fetch folders:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.post('/api/compose', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)
    const body = await c.req.json()

    const emailData = {
      to: body.to || [],
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject || '',
      bodyHtml: body.body || '',
      bodyText: body.bodyText,
      attachments: body.attachments,
    }

    const result = await emailService.sendEmail(emailData)

    if (result.success) {
      return c.json({
        success: true,
        message: 'Email sent successfully',
        messageId: result.messageId
      })
    } else {
      return c.json({
        success: false,
        error: result.error
      }, 500)
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.put('/api/messages/:id/read', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)

    const id = c.req.param('id')
    const folder = c.req.query('folder') || 'INBOX'
    const uid = parseInt(id)

    if (isNaN(uid)) {
      return c.json({ error: 'Invalid email ID' }, 400)
    }

    await emailService.markAsRead(uid, folder)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to mark email as read:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

app.delete('/api/messages/:id', async (c: any) => {
  try {
    const userId = c.get('userId') as string
    const emailService = await getUserEmailService(userId)

    const id = c.req.param('id')
    const folder = c.req.query('folder') || 'INBOX'
    const uid = parseInt(id)

    if (isNaN(uid)) {
      return c.json({ error: 'Invalid email ID' }, 400)
    }

    await emailService.deleteEmail(uid, folder)
    return c.json({ success: true })
  } catch (error) {
    console.error('Failed to delete email:', error)
    return c.json({ error: (error as Error).message }, 500)
  }
})

serve({
  fetch: app.fetch,
  port: 3001
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
