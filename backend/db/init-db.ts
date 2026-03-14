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

console.log('Dropping existing tables (if any)...');
db.pragma('foreign_keys = OFF');
for (const table of tables) {
  db.exec(`DROP TABLE IF EXISTS ${table}`);
}
db.pragma('foreign_keys = ON');

const schemaPath = path.join(process.cwd(), 'backend', 'db', 'schema.sql');
const seedPath = path.join(process.cwd(), 'backend', 'db', 'seed.sql');

console.log('Running schema...');
const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schemaSql);

console.log('Running seed...');
const seedSql = fs.readFileSync(seedPath, 'utf-8');
db.exec(seedSql);

db.close();
console.log('Database initialized at', dbPath);
