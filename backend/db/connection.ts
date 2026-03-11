import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const dbPath =
  process.env.SQLITE_DB_PATH ||
  path.join(process.cwd(), 'backend', 'db', 'lyrning.sqlite');

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

/** Convert Postgres-style $1, $2 placeholders to SQLite ? and return ordered param list */
function toSqliteParams(text: string, params?: any[]): [string, any[]] {
  if (!params || params.length === 0) return [text, []];
  const sql = text.replace(/\$(\d+)/g, '?');
  return [sql, params];
}

export function query(text: string, params?: any[]): Promise<{ rows: any[] }> {
  const [sql, bound] = toSqliteParams(text, params);
  const stmt = db.prepare(sql);
  // better-sqlite3 exposes whether a statement returns rows via stmt.reader
  if (stmt.reader) {
    const rows = stmt.all(...bound);
    return Promise.resolve({ rows });
  }

  stmt.run(...bound);
  return Promise.resolve({ rows: [] });
}

export default db;
