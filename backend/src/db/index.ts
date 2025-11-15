import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import path from 'path';
import { fileURLToPath } from 'url';
import * as schema from './schema';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DATABASE_URL || `file:${path.join(__dirname, '../../data/quackmail.db')}`;

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath.replace('file:', ''));
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const client = createClient({ url: dbPath });

export const db = drizzle(client, { schema });

export * from './schema';
