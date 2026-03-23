/**
 * Run lightweight migrations so the app works even if DB was created before
 * ai_params and question_types were added to assignments.
 */
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { query } from './connection.js';

function generatePassword(length = 10): string {
  // Avoid ambiguous chars (0/O, 1/I/l)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

// This is the bcrypt hash used by the current seed.sql/seed.pg.sql.
const SEEDED_DEFAULT_PASSWORD_HASH = '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai';

export async function runMigrations(): Promise<void> {
  try {
    const hasAiParams = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'ai_params' LIMIT 1`
    );
    if (hasAiParams.rows.length === 0) {
      await query('ALTER TABLE assignments ADD COLUMN ai_params TEXT');
      console.log('Migration: added assignments.ai_params');
    }

    const hasQuestionTypes = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'question_types' LIMIT 1`
    );
    if (hasQuestionTypes.rows.length === 0) {
      await query('ALTER TABLE assignments ADD COLUMN question_types TEXT');
      console.log('Migration: added assignments.question_types');
    }

    const hasAllowedSubmissions = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'allowed_submissions' LIMIT 1`
    );
    if (hasAllowedSubmissions.rows.length === 0) {
      await query('ALTER TABLE assignments ADD COLUMN allowed_submissions INTEGER NOT NULL DEFAULT 1');
      console.log('Migration: added assignments.allowed_submissions');
    }

    const hasSubmissionAttempts = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_grades' AND column_name = 'submission_attempts' LIMIT 1`
    );
    if (hasSubmissionAttempts.rows.length === 0) {
      await query('ALTER TABLE student_grades ADD COLUMN submission_attempts INTEGER NOT NULL DEFAULT 0');
      console.log('Migration: added student_grades.submission_attempts');
    }

    const hasResponseTable = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'student_assignment_responses' LIMIT 1`
    );
    if (hasResponseTable.rows.length === 0) {
      await query(
        `CREATE TABLE student_assignment_responses (
          response_id BIGSERIAL PRIMARY KEY,
          student_id BIGINT NOT NULL REFERENCES students(student_id),
          assignment_id BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
          question_id BIGINT NOT NULL REFERENCES assignment_questions(question_id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          response_text TEXT,
          selected_option_ids TEXT,
          is_correct INTEGER,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      await query(
        'CREATE INDEX idx_assignment_responses_student_assignment ON student_assignment_responses(student_id, assignment_id)'
      );
      console.log('Migration: added student_assignment_responses');
    }

    const hasAiUsageLogs = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'ai_usage_logs' LIMIT 1`
    );
    if (hasAiUsageLogs.rows.length === 0) {
      await query(
        `CREATE TABLE ai_usage_logs (
          log_id BIGSERIAL PRIMARY KEY,
          student_id BIGINT REFERENCES students(student_id),
          action TEXT NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          details JSONB
        )`
      );
      console.log('Migration: added ai_usage_logs');
    }

    // Plaintext passwords are only used so the teacher UI can display/share passwords after logout.
    // Password hashes remain the source of truth for authentication.
    const hasStudentPasswordsPlaintext = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'student_passwords_plaintext' LIMIT 1`
    );
    if (hasStudentPasswordsPlaintext.rows.length === 0) {
      await query(
        `CREATE TABLE student_passwords_plaintext (
          student_id BIGINT PRIMARY KEY REFERENCES students(student_id) ON DELETE CASCADE,
          password_plaintext TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      console.log('Migration: added student_passwords_plaintext');
    }

    // Ensure every student has a usable password and a teacher-visible plaintext password.
    // - If the plaintext row is missing, generate a new random password, update `students.password_hash`,
    //   and store plaintext for the teacher UI.
    // - If the plaintext row exists, we do not override it (so teacher edits persist).
    const missingOrSeededDefaults = await query(
      `SELECT s.student_id
       FROM students s
       LEFT JOIN student_passwords_plaintext sp ON sp.student_id = s.student_id
       WHERE sp.student_id IS NULL OR s.password_hash = '${SEEDED_DEFAULT_PASSWORD_HASH}'
       ORDER BY s.student_id`
    );

    if (missingOrSeededDefaults.rows.length > 0) {
      const saltRounds = 12;
      const passwordLength = 10;
      for (const row of missingOrSeededDefaults.rows) {
        const studentId = Number(row.student_id);
        if (!Number.isFinite(studentId) || studentId <= 0) continue;

        const password = generatePassword(passwordLength);
        const hash = await bcrypt.hash(password, saltRounds);

        await query('UPDATE students SET password_hash = $1 WHERE student_id = $2', [hash, studentId]);
        await query(
          `INSERT INTO student_passwords_plaintext (student_id, password_plaintext)
           VALUES ($1, $2)
           ON CONFLICT (student_id)
           DO UPDATE SET password_plaintext = EXCLUDED.password_plaintext, updated_at = NOW()`,
          [studentId, password]
        );
      }
      console.log(`Migration: ensured random default passwords for ${missingOrSeededDefaults.rows.length} student(s)`);
    }

    // Safety: if for some reason a student has the seeded-default password hash but still has no plaintext row,
    // the block above will have populated plaintext. We keep this here as documentation.
    // (Not actively used beyond the logic above.)
    void SEEDED_DEFAULT_PASSWORD_HASH;

    const hasUnderstandingScore = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_grades' AND column_name = 'understanding_score' LIMIT 1`
    );
    if (hasUnderstandingScore.rows.length === 0) {
      await query('ALTER TABLE student_grades ADD COLUMN understanding_score REAL');
      console.log('Migration: added student_grades.understanding_score');
    }

    const hasAiDependencyScore = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_grades' AND column_name = 'ai_dependency_score' LIMIT 1`
    );
    if (hasAiDependencyScore.rows.length === 0) {
      await query('ALTER TABLE student_grades ADD COLUMN ai_dependency_score REAL');
      console.log('Migration: added student_grades.ai_dependency_score');
    }

    const hasEngagementScore = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_grades' AND column_name = 'engagement_score' LIMIT 1`
    );
    if (hasEngagementScore.rows.length === 0) {
      await query('ALTER TABLE student_grades ADD COLUMN engagement_score REAL');
      console.log('Migration: added student_grades.engagement_score');
    }
  } catch (err) {
    console.error('Migration error (non-fatal):', err);
  }
}
