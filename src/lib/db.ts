import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';

const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire('node:sqlite');

export interface Member {
  id: string;
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
  member_name: string;
  member_role: string;
  content: string;
  blockers?: string | null;
  category: string;
  created_at: string;
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

// Global cached instance for dev HMR
let dbInstance: any = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const dataDir = getDataDir();
  const dbPath = path.join(dataDir, 'nidar.sqlite');
  const db = new DatabaseSync(dbPath);

  // Enable WAL mode for performance and concurrent reads
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
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

  // Run migration safely for existing tables that might not have is_personal
  try {
    db.exec(`ALTER TABLE checklists ADD COLUMN is_personal INTEGER DEFAULT 0;`);
  } catch (e) {
    // Column already exists, ignore
  }

  dbInstance = db;
  return db;
}
