import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import { authService } from './authService';

export interface ImapConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
}

export interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string[];
  date: string;
  bodyHtml: string;
  bodyText?: string;
  folder: string;
  unread: boolean;
  uid: number;
}

export interface EmailFolder {
  name: string;
  count: number;
}

export interface SendEmailData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

class UserEmailService {
  private userId: string;
  private imapClient: ImapFlow | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private connected = false;
  private imapConfig: ImapConfig;
  private smtpConfig: SmtpConfig;
  private fromEmail: string;

  constructor(userId: string, imapConfig: ImapConfig, smtpConfig: SmtpConfig, fromEmail: string) {
    this.userId = userId;
    this.imapConfig = imapConfig;
    this.smtpConfig = smtpConfig;
    this.fromEmail = fromEmail;
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.smtpTransporter = nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      auth: {
        user: this.smtpConfig.user,
        pass: this.smtpConfig.pass,
      },
    });
  }

  async connect(): Promise<void> {
    if (this.connected && this.imapClient) {
      return;
    }

    try {
      this.imapClient = new ImapFlow({
        host: this.imapConfig.host,
        port: this.imapConfig.port,
        secure: this.imapConfig.secure,
        auth: {
          user: this.imapConfig.user,
          pass: this.imapConfig.pass,
        },
        logger: false,
      });

      await this.imapClient.connect();
      this.connected = true;
      console.log(`IMAP connection established for user ${this.userId}`);
    } catch (error) {
      console.error('IMAP connection failed:', error);
      throw new Error(`Failed to connect to email server: ${(error as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.imapClient && this.connected) {
      await this.imapClient.close();
      this.connected = false;
      this.imapClient = null;
      console.log(`IMAP connection closed for user ${this.userId}`);
    }
  }

  async getFolders(): Promise<EmailFolder[]> {
    await this.connect();

    if (!this.imapClient) {
      throw new Error('IMAP client not initialized');
    }

    try {
      const folders = await this.imapClient.list();

      const folderPromises = folders.map(async (folder) => {
        try {
          const status = await this.imapClient!.status(folder.path, { unseen: true });
          return {
            name: folder.path,
            count: status.unseen || 0,
          };
        } catch (statusError) {
          console.warn(`Could not get status for folder ${folder.path}:`, statusError);
          return {
            name: folder.path,
            count: 0,
          };
        }
      });

      return await Promise.all(folderPromises);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      throw new Error(`Failed to fetch email folders: ${(error as Error).message}`);
    }
  }

  async getEmails(folder: string = 'INBOX', page: number = 1, limit: number = 20): Promise<EmailMessage[]> {
    await this.connect();

    if (!this.imapClient) {
      throw new Error('IMAP client not initialized');
    }

    try {
      await this.imapClient.mailboxOpen(folder);
      const mailbox = this.imapClient.mailbox;

      if (!mailbox) {
        throw new Error(`Mailbox ${folder} not found`);
      }

      const totalMessages = mailbox.exists;
      const start = Math.max(1, totalMessages - (page * limit) + 1);
      const end = Math.max(1, totalMessages - ((page - 1) * limit));

      if (start > end) {
        return [];
      }

      const range = `${start}:${end}`;
      const messages = this.imapClient.fetch(range, {
        uid: true,
        flags: true,
        envelope: true,
        bodyStructure: true,
        source: true,
      });

      const emails: EmailMessage[] = [];

      for await (const message of messages) {
        try {
          let bodyHtml = '';
          let bodyText = '';

          if (message.source) {
            const parsed: ParsedMail = await simpleParser(message.source);

            if (parsed.html) {
              bodyHtml = typeof parsed.html === 'string' ? parsed.html : "";
            }

            if (parsed.text) {
              bodyText = typeof parsed.text === 'string' ? parsed.text : "";
            }

            if (!bodyHtml && bodyText) {
              bodyHtml = bodyText.replace(/\n/g, '<br>');
            }
          }

          const email: EmailMessage = {
            id: String(message.uid),
            subject: message.envelope?.subject || '(No Subject)',
            from: message.envelope?.from?.[0]?.address || 'Unknown',
            to: message.envelope?.to?.map(addr => addr.address).filter((addr): addr is string => Boolean(addr)) || [],
            date: message.envelope?.date?.toISOString() || new Date().toISOString(),
            bodyHtml: bodyHtml || '(No content)',
            bodyText,
            folder,
            unread: !message.flags?.has('\\Seen'),
            uid: message.uid,
          };

          emails.push(email);
        } catch (parseError) {
          console.error(`Failed to parse message ${message.uid}:`, parseError);
        }
      }

      emails.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return emails;
    } catch (error) {
      console.error('Failed to fetch emails:', error);
      throw new Error(`Failed to fetch emails: ${(error as Error).message}`);
    }
  }

  async getEmail(uid: number, folder: string = 'INBOX'): Promise<EmailMessage | null> {
    await this.connect();

    if (!this.imapClient) {
      throw new Error('IMAP client not initialized');
    }

    try {
      await this.imapClient.mailboxOpen(folder);
      const mailbox = this.imapClient.mailbox;

      if (!mailbox) {
        throw new Error(`Mailbox ${folder} not found`);
      }

      const messages = this.imapClient.fetch(`${uid}`, {
        uid: true,
        flags: true,
        envelope: true,
        source: true,
      });

      for await (const message of messages) {
        let bodyHtml = '';
        let bodyText = '';

        if (message.source) {
          const parsed: ParsedMail = await simpleParser(message.source);

          if (parsed.html) {
            bodyHtml = typeof parsed.html === 'string' ? parsed.html : "";
          }

          if (parsed.text) {
            bodyText = typeof parsed.text === 'string' ? parsed.text : "";
          }

          if (!bodyHtml && bodyText) {
            bodyHtml = bodyText.replace(/\n/g, '<br>');
          }
        }

        return {
          id: String(message.uid),
          subject: message.envelope?.subject || '(No Subject)',
          from: message.envelope?.from?.[0]?.address || 'Unknown',
          to: message.envelope?.to?.map(addr => addr.address).filter((addr): addr is string => Boolean(addr)) || [],
          date: message.envelope?.date?.toISOString() || new Date().toISOString(),
          bodyHtml: bodyHtml || '(No content)',
          bodyText,
          folder,
          unread: !message.flags?.has('\\Seen'),
          uid: message.uid,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch email:', error);
      throw new Error(`Failed to fetch email: ${(error as Error).message}`);
    }
  }

  async sendEmail(data: SendEmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.smtpTransporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: data.to,
        cc: data.cc,
        bcc: data.bcc,
        subject: data.subject,
        html: data.bodyHtml,
        text: data.bodyText,
        attachments: data.attachments,
      };

      const info = await this.smtpTransporter.sendMail(mailOptions);

      console.log('Email sent successfully:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  async markAsRead(uid: number, _folder: string = 'INBOX'): Promise<void> {
    await this.connect();

    if (!this.imapClient) {
      throw new Error('IMAP client not initialized');
    }

    try {
      await this.imapClient.messageFlagsAdd(`${uid}`, ['\\Seen'], { uid: true });
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      throw new Error(`Failed to mark email as read: ${(error as Error).message}`);
    }
  }

  async deleteEmail(uid: number, _folder: string = 'INBOX'): Promise<void> {
    await this.connect();

    if (!this.imapClient) {
      throw new Error('IMAP client not initialized');
    }

    try {
      await this.imapClient.messageFlagsAdd(`${uid}`, ['\\Deleted'], { uid: true });
      await this.imapClient.messageDelete(`${uid}`, { uid: true });
    } catch (error) {
      console.error('Failed to delete email:', error);
      throw new Error(`Failed to delete email: ${(error as Error).message}`);
    }
  }
}

// Service factory with in-memory caching
const userServiceCache = new Map<string, UserEmailService>();

export async function getUserEmailService(userId: string): Promise<UserEmailService> {
  if (userServiceCache.has(userId)) {
    return userServiceCache.get(userId)!;
  }

  try {
    const creds = await authService.getUserCredentials(userId);

    const imapConfig: ImapConfig = {
      host: creds.imapHost,
      port: creds.imapPort,
      secure: creds.imapSecure === 1,
      user: creds.imapUser,
      pass: creds.imapPass,
    };

    const smtpConfig: SmtpConfig = {
      host: creds.smtpHost,
      port: creds.smtpPort,
      secure: creds.smtpSecure === 1,
      user: creds.smtpUser,
      pass: creds.smtpPass,
    };

    const service = new UserEmailService(userId, imapConfig, smtpConfig, creds.fromEmail);
    userServiceCache.set(userId, service);

    return service;
  } catch (error) {
    throw new Error(`Failed to initialize email service for user ${userId}: ${(error as Error).message}`);
  }
}
