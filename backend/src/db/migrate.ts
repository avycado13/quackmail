import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL || `file:${path.join(__dirname, '../../data/quackmail.db')}`;

// Ensure data directory exists
const dataDir = path.dirname(dbPath.replace('file:', ''));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const client = createClient({ url: dbPath });

async function runMigrations() {
  try {
    console.log('Setting up database...');
    
    // Execute migration SQL statements one at a time
    const statements = [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch() as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch() as integer))
      )`,
      
      `CREATE TABLE IF NOT EXISTS user_credentials (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        imap_host TEXT NOT NULL,
        imap_port INTEGER NOT NULL DEFAULT 993,
        imap_secure INTEGER NOT NULL DEFAULT 1,
        imap_user TEXT NOT NULL,
        imap_pass TEXT NOT NULL,
        smtp_host TEXT NOT NULL,
        smtp_port INTEGER NOT NULL DEFAULT 587,
        smtp_secure INTEGER NOT NULL DEFAULT 0,
        smtp_user TEXT NOT NULL,
        smtp_pass TEXT NOT NULL,
        from_email TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch() as integer)),
        updated_at INTEGER NOT NULL DEFAULT (cast(unixepoch() as integer)),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`,
      
      `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        user_id TEXT NOT NULL,
        token TEXT NOT NULL UNIQUE,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (cast(unixepoch() as integer)),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )`
    ];

    for (const statement of statements) {
      try {
        await client.execute(statement);
        console.log('✓ Created table');
      } catch (err: any) {
        if (err.message?.includes('already exists')) {
          console.log('✓ Table already exists');
        } else {
          throw err;
        }
      }
    }

    console.log('\nDatabase setup completed!');
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

runMigrations();
