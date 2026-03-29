import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to initialize Postgres');
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function tableExists(table: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1 LIMIT 1`,
    [table],
  );
  return res.rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const res = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column],
  );
  return res.rows.length > 0;
}

async function main() {
  const reset = process.env.RESET_DB === 'true' || process.env.RESET_DB === '1';

  const hasStudents = await tableExists('students');
  if (hasStudents && !reset) {
    // Lightweight migrations for existing databases.
    if (await tableExists('assignments')) {
      const hasAssignmentLink = await columnExists('assignments', 'assignment_link');
      if (!hasAssignmentLink) {
        console.log('Migrating: adding assignments.assignment_link');
        await pool.query('ALTER TABLE assignments ADD COLUMN assignment_link TEXT;');
        await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_assignments_assignment_link ON assignments(assignment_link);');
      }
      const hasAiParams = await columnExists('assignments', 'ai_params');
      if (!hasAiParams) {
        console.log('Migrating: adding assignments.ai_params');
        await pool.query('ALTER TABLE assignments ADD COLUMN ai_params TEXT;');
      }
      const hasQuestionTypes = await columnExists('assignments', 'question_types');
      if (!hasQuestionTypes) {
        console.log('Migrating: adding assignments.question_types');
        await pool.query('ALTER TABLE assignments ADD COLUMN question_types TEXT;');
      }
      const hasAllowedSubmissions = await columnExists('assignments', 'allowed_submissions');
      if (!hasAllowedSubmissions) {
        console.log('Migrating: adding assignments.allowed_submissions');
        await pool.query('ALTER TABLE assignments ADD COLUMN allowed_submissions INTEGER NOT NULL DEFAULT 1;');
      }
      const hasAttemptScoringPolicy = await columnExists('assignments', 'attempt_scoring_policy');
      if (!hasAttemptScoringPolicy) {
        console.log('Migrating: adding assignments.attempt_scoring_policy');
        await pool.query(`ALTER TABLE assignments ADD COLUMN attempt_scoring_policy TEXT NOT NULL DEFAULT 'latest';`);
      }
      const hasKeepType = await columnExists('assignments', 'keep_type');
      if (!hasKeepType) {
        console.log('Migrating: adding assignments.keep_type');
        await pool.query(`ALTER TABLE assignments ADD COLUMN keep_type TEXT NOT NULL DEFAULT 'latest';`);
        await pool.query(`UPDATE assignments SET keep_type = COALESCE(NULLIF(attempt_scoring_policy, ''), 'latest');`);
      }
      if (await columnExists('assignments', 'allow_partial_short_answer')) {
        console.log('Migrating: dropping assignments.allow_partial_short_answer');
        await pool.query(`ALTER TABLE assignments DROP COLUMN allow_partial_short_answer;`);
      }
      if (await columnExists('assignments', 'allow_partial_select_all_that_apply')) {
        console.log('Migrating: dropping assignments.allow_partial_select_all_that_apply');
        await pool.query(`ALTER TABLE assignments DROP COLUMN allow_partial_select_all_that_apply;`);
      }
    }
    if (await tableExists('assignment_questions')) {
      const hasQuestionMaxPoints = await columnExists('assignment_questions', 'max_points');
      if (!hasQuestionMaxPoints) {
        console.log('Migrating: adding assignment_questions.max_points');
        await pool.query('ALTER TABLE assignment_questions ADD COLUMN max_points REAL NOT NULL DEFAULT 1;');
      }
    }

    if (await tableExists('student_grades')) {
      const hasSubmissionAttempts = await columnExists('student_grades', 'submission_attempts');
      if (!hasSubmissionAttempts) {
        console.log('Migrating: adding student_grades.submission_attempts');
        await pool.query('ALTER TABLE student_grades ADD COLUMN submission_attempts INTEGER NOT NULL DEFAULT 0;');
      }
    }

    if (!(await tableExists('student_assignment_responses'))) {
      console.log('Migrating: creating student_assignment_responses');
      await pool.query(
        `CREATE TABLE student_assignment_responses (
          response_id BIGSERIAL PRIMARY KEY,
          student_id BIGINT NOT NULL REFERENCES students(student_id),
          assignment_id BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
          question_id BIGINT NOT NULL REFERENCES assignment_questions(question_id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          response_text TEXT,
          selected_option_ids TEXT,
          is_correct INTEGER,
          correctness_score REAL,
          points_earned REAL,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );`
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_assignment_responses_student_assignment ON student_assignment_responses(student_id, assignment_id);'
      );
    }
    if (await tableExists('student_assignment_responses')) {
      const hasCorrectnessScore = await columnExists('student_assignment_responses', 'correctness_score');
      if (!hasCorrectnessScore) {
        console.log('Migrating: adding student_assignment_responses.correctness_score');
        await pool.query('ALTER TABLE student_assignment_responses ADD COLUMN correctness_score REAL;');
      }
      const hasResponsePointsEarned = await columnExists('student_assignment_responses', 'points_earned');
      if (!hasResponsePointsEarned) {
        console.log('Migrating: adding student_assignment_responses.points_earned');
        await pool.query('ALTER TABLE student_assignment_responses ADD COLUMN points_earned REAL;');
      }
    }

    if (!(await tableExists('student_assignment_attempt_grades'))) {
      console.log('Migrating: creating student_assignment_attempt_grades');
      await pool.query(
        `CREATE TABLE student_assignment_attempt_grades (
          student_id BIGINT NOT NULL REFERENCES students(student_id),
          assignment_id BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          points_earned REAL,
          percentage REAL,
          letter_grade TEXT,
          understanding_score REAL,
          ai_dependency_score REAL,
          engagement_score REAL,
          submission_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          graded_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (student_id, assignment_id, attempt_number)
        );`
      );
      await pool.query(
        'CREATE INDEX IF NOT EXISTS idx_attempt_grades_student_assignment ON student_assignment_attempt_grades(student_id, assignment_id, attempt_number);'
      );
    }
    if (await tableExists('student_assignment_attempt_grades')) {
      const hasIsKept = await columnExists('student_assignment_attempt_grades', 'is_kept');
      if (!hasIsKept) {
        console.log('Migrating: adding student_assignment_attempt_grades.is_kept');
        await pool.query('ALTER TABLE student_assignment_attempt_grades ADD COLUMN is_kept BOOLEAN NOT NULL DEFAULT FALSE;');
      }
    }

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
