import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Postgres');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

<<<<<<< HEAD
async function tableExists(table: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table],
  );
  return res.rowCount > 0;
}
=======
const tables = [
  'student_metrics',
  'student_grades',
  'assignment_documents',
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
>>>>>>> 8dbd0e19b3dc829c0023e44c7c82316412f7f426

async function main() {
  const reset = process.env.RESET_DB === 'true' || process.env.RESET_DB === '1';

  const hasStudents = await tableExists('students');
  if (hasStudents && !reset) {
    console.log('Postgres DB already initialized');
    process.exit(0);
  }

  if (reset) {
    console.log('RESET_DB enabled: dropping public schema');
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }

  const schemaPath = path.join(process.cwd(), 'backend', 'db', 'schema.pg.sql');
  const seedPath = path.join(process.cwd(), 'backend', 'db', 'seed.pg.sql');

  console.log('Running Postgres schema...');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(schemaSql);

  console.log('Running Postgres seed...');
  const seedSql = fs.readFileSync(seedPath, 'utf-8');
  await pool.query(seedSql);

  console.log('Postgres database initialized');
  process.exit(0);
}

main().catch((err) => {
  console.error('DB init error', err);
  process.exit(1);
});
