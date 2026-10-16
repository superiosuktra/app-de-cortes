import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { ROOT_DIR } from './config.js';

const dataDir = path.join(ROOT_DIR, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE,
      name TEXT,
      picture TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_states (
      user_id TEXT PRIMARY KEY,
      credentials_json TEXT,
      saved_cuts_json TEXT,
      queue_json TEXT,
      settings_json TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT NOT NULL,
      video_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cuts (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);
  console.log('✅ Banco de dados SQLite multiusuário inicializado em:', dbPath);
}

export default db;
