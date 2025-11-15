import { db, users, sessions, userCredentials } from '../db/index';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ImapFlow } from 'imapflow';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

interface LoginPayload {
  email: string;
  password: string;
  imapPass?: string;
  smtpPass?: string;
  fromEmail?: string;
}

interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

export const authService = {
  async register(payload: LoginPayload): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, payload.email))
      .limit(1);

    if (existingUser.length > 0) {

      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = this.hashPassword(payload.password);

    // Create user
    const result = await db.insert(users).values({
      email: payload.email,
      password: hashedPassword,
    }).returning();

    const newUser = result[0];

    // Create user credentials if provided
    if (payload.imapPass && payload.smtpPass && payload.fromEmail) {
      try {
        // Validate IMAP credentials before storing them
        const validated = await this.validateImapCredentials(
          payload.email,
          payload.imapPass,
          process.env.IMAP_HOST || 'imap.gmail.com',
          parseInt(process.env.IMAP_PORT || '993'),
          process.env.IMAP_SECURE === 'true'
        );

        if (!validated) {
          // Clean up the user we just created since credentials are invalid
          await db.delete(users).where(eq(users.id, newUser.id));
          throw new Error('Invalid email credentials. Please check your email and password.');
        }

        // Store validated credentials
        await db.insert(userCredentials).values({
          userId: newUser.id,
          imapHost: process.env.IMAP_HOST || 'imap.gmail.com',
          imapPort: parseInt(process.env.IMAP_PORT || '993'),
          imapSecure: process.env.IMAP_SECURE === 'true' ? 1 : 0,
          imapUser: payload.email, // Use email as username
          imapPass: payload.imapPass,
          smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
          smtpPort: parseInt(process.env.SMTP_PORT || '587'),
          smtpSecure: process.env.SMTP_SECURE !== 'false' ? 1 : 0, // Default to secure
          smtpUser: payload.email, // Use email as username
          smtpPass: payload.smtpPass,
          fromEmail: payload.fromEmail,
        });
      } catch (error: any) {
        // Clean up the user we just created since validation failed
        await db.delete(users).where(eq(users.id, newUser.id));
        if (error.message === 'Invalid email credentials. Please check your email and password.') {
          throw error;
        }
        throw new Error('Failed to validate email credentials. Please try again.');
      }
    }

    // Create session
    const token = this.generateToken(newUser.id);
    await this.createSession(newUser.id, token);

    return {
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResult.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = userResult[0];

    // Verify password
    if (!this.verifyPassword(password, user.password)) {
      throw new Error('Invalid credentials');
    }

    // Create session
    const token = this.generateToken(user.id);
    await this.createSession(user.id, token);

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };
  },

  async logout(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  },

  async verifyToken(token: string): Promise<{ userId: string }> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };

      // Check if session exists and hasn't expired
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.token, token))
        .limit(1);

      if (session.length === 0) {
        throw new Error('Session not found');
      }

      if (session[0].expiresAt < Math.floor(Date.now() / 1000)) {
        throw new Error('Session expired');
      }

      return decoded;
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  async getUserCredentials(userId: string) {
    const creds = await db
      .select()
      .from(userCredentials)
      .where(eq(userCredentials.userId, userId))
      .limit(1);

    if (creds.length === 0) {

      throw new Error('User credentials not found');
    }

    return creds[0];
  },

  async updateUserCredentials(userId: string, payload: Partial<LoginPayload>) {
    const updates: any = {};

    // Only allow updating the fields users can change (not server config)
    // Note: Server config (host/port/secure) are read from environment variables
    if (payload.imapPass) updates.imapPass = payload.imapPass;
    if (payload.smtpPass) updates.smtpPass = payload.smtpPass;
    if (payload.fromEmail) updates.fromEmail = payload.fromEmail;

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates provided');
    }

    updates.updatedAt = Math.floor(Date.now() / 1000);

    return await db
      .update(userCredentials)
      .set(updates)
      .where(eq(userCredentials.userId, userId));
  },

  generateToken(userId: string): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  },

  async createSession(userId: string, token: string): Promise<void> {
    const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60; // 7 days

    await db.insert(sessions).values({
      userId,
      token,
      expiresAt,
    });
  },

  async validateImapCredentials(email: string, password: string, host: string, port: number, secure: boolean): Promise<boolean> {
    let client: ImapFlow | null = null;

    try {
      client = new ImapFlow({
        host,
        port,
        secure,
        auth: {
          user: email,
          pass: password,
        },
        logger: false,
      });

      await client.connect();
      await client.logout();
      return true;
    } catch (error) {
      console.log('IMAP validation failed:', error);
      return false;
    } finally {
      if (client) {
        try {
          await client.close();
        } catch (closeError) {
          // Ignore close errors
        }
      }
    }
  },

  hashPassword(password: string): string {
    return crypto.createHash('sha256').update(password).digest('hex');
  },

  verifyPassword(password: string, hash: string): boolean {
    return crypto.createHash('sha256').update(password).digest('hex') === hash;
  },
};
