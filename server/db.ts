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
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      video_url TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cuts (
      id TEXT PRIMARY KEY,
      project_id TEXT,
      start_time TEXT,
      end_time TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY(project_id) REFERENCES projects(id)
    );
  `);
  console.log('✅ Banco de dados SQLite inicializado em:', dbPath);
}

export default db;
