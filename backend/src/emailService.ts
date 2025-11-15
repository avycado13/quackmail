import { ImapFlow } from 'imapflow';
import nodemailer from 'nodemailer';
import { simpleParser, ParsedMail } from 'mailparser';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

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

export class EmailService {
  private imapClient: ImapFlow | null = null;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private connected = false;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    this.smtpTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async connect(): Promise<void> {
    if (this.connected && this.imapClient) {
      return;
    }

    try {
      this.imapClient = new ImapFlow({
        host: process.env.IMAP_HOST || '',
        port: parseInt(process.env.IMAP_PORT || '993'),
        secure: process.env.IMAP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER!,
          pass: process.env.EMAIL_PASS!,
        },
        logger: false, // Disable verbose logging in production
      });

      await this.imapClient.connect();
      this.connected = true;
      console.log('IMAP connection established');
    } catch (error) {
      console.error('IMAP connection failed:', error);
      throw new Error(`Failed to connect to email server: ${(error as Error).message}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.imapClient && this.connected) {
      this.imapClient.close();
      this.connected = false;
      this.imapClient = null;
      console.log('IMAP connection closed');
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
          // Get status for each mailbox to get unread count
          const status = await this.imapClient!.status(folder.path, { unseen: true });
          return {
            name: folder.path,
            count: status.unseen || 0,
          };
        } catch (statusError) {
          // If status fails, return folder with 0 count
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
      // Open the mailbox
      await this.imapClient.mailboxOpen(folder);
      const mailbox = this.imapClient.mailbox;

      if (!mailbox) {
        throw new Error(`Mailbox ${folder} not found`);
      }

      // Calculate range for pagination (newest first)
      const totalMessages = mailbox.exists;
      const start = Math.max(1, totalMessages - (page * limit) + 1);
      const end = Math.max(1, totalMessages - ((page - 1) * limit));

      if (start > end) {
        return []; // No messages in this range
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

          // Parse the email content
          if (message.source) {
            const parsed: ParsedMail = await simpleParser(message.source);

            // Extract HTML content
            if (parsed.html) {
              bodyHtml = typeof parsed.html === 'string' ? parsed.html : "";
            }

            // Extract text content as fallback
            if (parsed.text) {
              bodyText = typeof parsed.text === 'string' ? parsed.text : "";
            }

            // Use text content if HTML is not available
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
          // Continue with other messages
        }
      }

      // Sort by date (newest first)
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
      // Open the mailbox
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

        // Parse the email content
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
        from: process.env.EMAIL_USER,
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
      await this.imapClient.mailboxDelete(`${uid}`)
    } catch (error) {
      console.error('Failed to delete email:', error);
      throw new Error(`Failed to delete email: ${(error as Error).message}`);
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
