import path from 'path';
import fs from 'fs';
import { createClient, Client } from '@libsql/client';

export interface Member {
  id: string;
  username?: string;
  name: string;
  role: string;
  created_at: string;
  last_active_at: string;
}

export interface Attachment {
  id: number;
  log_id: number;
  file_url: string;
  file_name: string;
  note?: string | null;
  file_size: number;
  mime_type: string;
  created_at: string;
}

export interface Reaction {
  id: number;
  log_id: number;
  member_id: string;
  reaction_type: string;
  member_name?: string;
}

export interface ProgressLog {
  id: number;
  member_id: string;
  member_username?: string;
  member_name: string;
  member_role: string;
  content: string;
  blockers?: string | null;
  category: string;
  created_at: string;
  updated_at?: string | null;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

export interface ChecklistItem {
  id: number;
  title: string;
  category: string;
  is_completed: number; // 0 or 1
  is_personal: number;  // 0 = Team, 1 = Personal
  created_by: string;
  created_by_name?: string;
  completed_by?: string | null;
  completed_by_name?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface Meeting {
  id: number;
  title: string;
  agenda?: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string | null;
  created_by: string;
  created_by_name?: string;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  created_at: string;
}

export function getDataDir(): string {
  const dir = process.env.DATA_DIR || path.join(process.cwd(), 'data');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getUploadsDir(): string {
  const dir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

let clientInstance: Client | null = null;
let initPromise: Promise<void> | null = null;

export function getDb(): Client {
  if (clientInstance) {
    return clientInstance;
  }

  // Connect to Turso Cloud SQLite if credentials exist; otherwise fallback to local SQLite file
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    clientInstance = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  } else {
    const dataDir = getDataDir();
    const dbPath = path.join(dataDir, 'nidar.sqlite');
    clientInstance = createClient({
      url: `file:${dbPath}`,
    });
  }

  return clientInstance;
}

export async function ensureDbInitialized(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    const db = getDb();

    // Create all required tables
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS members (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        last_active_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS progress_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id TEXT NOT NULL REFERENCES members(id),
        content TEXT NOT NULL,
        blockers TEXT,
        category TEXT DEFAULT 'General',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS log_attachments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER NOT NULL REFERENCES progress_logs(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_name TEXT NOT NULL,
        note TEXT,
        file_size INTEGER,
        mime_type TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS log_reactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        log_id INTEGER NOT NULL REFERENCES progress_logs(id) ON DELETE CASCADE,
        member_id TEXT NOT NULL REFERENCES members(id),
        reaction_type TEXT DEFAULT 'like',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(log_id, member_id, reaction_type)
      );

      CREATE TABLE IF NOT EXISTS checklists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        category TEXT DEFAULT 'General',
        is_completed INTEGER DEFAULT 0,
        is_personal INTEGER DEFAULT 0,
        created_by TEXT NOT NULL REFERENCES members(id),
        completed_by TEXT REFERENCES members(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        completed_at TEXT
      );

      CREATE TABLE IF NOT EXISTS meetings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        agenda TEXT,
        scheduled_at TEXT NOT NULL,
        duration_minutes INTEGER DEFAULT 30,
        meeting_url TEXT,
        created_by TEXT NOT NULL REFERENCES members(id),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Safe migrations for backwards-compatibility
    try {
      await db.execute(`ALTER TABLE checklists ADD COLUMN is_personal INTEGER DEFAULT 0;`);
    } catch (e) { /* column exists */ }

    try {
      await db.execute(`ALTER TABLE members ADD COLUMN username TEXT;`);
    } catch (e) { /* column exists */ }

    try {
      await db.execute(`ALTER TABLE log_attachments ADD COLUMN note TEXT;`);
    } catch (e) { /* column exists */ }

    try {
      await db.execute(`UPDATE members SET username = LOWER(REPLACE(name, ' ', '')) WHERE username IS NULL OR username = '';`);
    } catch (e) { /* ignore */ }
  })();

  return initPromise;
}

// Helper: Query multiple rows
export async function queryAll<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({ sql, args });
  return (res.rows as unknown) as T[];
}

// Helper: Query a single row or null
export async function queryOne<T = any>(sql: string, args: any[] = []): Promise<T | null> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({ sql, args });
  if (res.rows.length === 0) return null;
  return (res.rows[0] as unknown) as T;
}

// Helper: Execute INSERT/UPDATE/DELETE
export async function execute(sql: string, args: any[] = []): Promise<{ lastInsertRowid: number; rowsAffected: number }> {
  await ensureDbInitialized();
  const db = getDb();
  const res = await db.execute({ sql, args });
  return {
    lastInsertRowid: Number(res.lastInsertRowid ?? 0),
    rowsAffected: res.rowsAffected,
  };
}
