import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const dbPath =
  process.env.SQLITE_DB_PATH ||
  path.join(process.cwd(), 'backend', 'db', 'lyrning.sqlite');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

const schemaPath = path.join(process.cwd(), 'backend', 'db', 'schema.sql');
const seedPath = path.join(process.cwd(), 'backend', 'db', 'seed.sql');

const shouldReset = process.env.RESET_SQLITE_DB === '1' || process.env.RESET_SQLITE_DB === 'true';
const hasStudentsTable =
  db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1`
    )
    .get('students') != null;

if (hasStudentsTable && !shouldReset) {
  console.log('SQLite database already initialized at', dbPath);
  db.close();
  process.exit(0);
}

if (shouldReset) {
  const tables = [
    'assignment_question_options',
    'assignment_questions',
    'assignment_documents',
    'student_metrics',
    'student_grades',
    'student_classes',
    'assignments',
    'classes',
    'subjects',
    'teachers',
    'students',
  ];

  console.log('RESET_SQLITE_DB enabled: dropping existing tables (if any)...');
  db.pragma('foreign_keys = OFF');
  for (const table of tables) {
    db.exec(`DROP TABLE IF EXISTS ${table}`);
  }
  db.pragma('foreign_keys = ON');
}

console.log('Running schema...');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

console.log('Running seed...');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
db.exec(seedSql);

db.close();
console.log('Database initialized at', dbPath);
