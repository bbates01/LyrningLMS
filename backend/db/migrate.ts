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

/** Runs first so admin login works even if a later migration step fails. */
async function ensureAdminsTableAndSeed(): Promise<void> {
  try {
    const hasAdmins = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'admins' LIMIT 1`
    );
    if (hasAdmins.rows.length === 0) {
      await query(`
        CREATE TABLE admins (
          admin_id BIGSERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`);
      console.log('Migration: created admins table');
    }
    const adminSeedCheck = await query(
      `SELECT COUNT(*)::int AS c FROM admins WHERE username = 'admin'`
    );
    const adminCount = Number((adminSeedCheck.rows[0] as { c: number })?.c ?? 0);
    if (adminCount === 0) {
      const hash = await bcrypt.hash('adminMetrics!', 12);
      await query('INSERT INTO admins (username, password_hash) VALUES ($1, $2) ON CONFLICT (username) DO NOTHING', [
        'admin',
        hash,
      ]);
      console.log('Migration: seeded default admin user (username: admin)');
    }
  } catch (err) {
    console.error('Migration: admins table/seed failed:', err);
  }
}

export async function runMigrations(): Promise<void> {
  await ensureAdminsTableAndSeed();
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

    const hasAttemptScoringPolicy = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'attempt_scoring_policy' LIMIT 1`
    );
    if (hasAttemptScoringPolicy.rows.length === 0) {
      await query(`ALTER TABLE assignments ADD COLUMN attempt_scoring_policy TEXT NOT NULL DEFAULT 'latest'`);
      console.log('Migration: added assignments.attempt_scoring_policy');
    }
    const hasKeepType = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'keep_type' LIMIT 1`
    );
    if (hasKeepType.rows.length === 0) {
      await query(`ALTER TABLE assignments ADD COLUMN keep_type TEXT NOT NULL DEFAULT 'latest'`);
      await query(`UPDATE assignments SET keep_type = COALESCE(NULLIF(attempt_scoring_policy, ''), 'latest')`);
      console.log('Migration: added assignments.keep_type');
    }
    const hasPartialShort = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'allow_partial_short_answer' LIMIT 1`
    );
    if (hasPartialShort.rows.length > 0) {
      await query(`ALTER TABLE assignments DROP COLUMN allow_partial_short_answer`);
      console.log('Migration: dropped assignments.allow_partial_short_answer');
    }
    const hasPartialSata = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'allow_partial_select_all_that_apply' LIMIT 1`
    );
    if (hasPartialSata.rows.length > 0) {
      await query(`ALTER TABLE assignments DROP COLUMN allow_partial_select_all_that_apply`);
      console.log('Migration: dropped assignments.allow_partial_select_all_that_apply');
    }
    const hasQuestionMaxPoints = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignment_questions' AND column_name = 'max_points' LIMIT 1`
    );
    if (hasQuestionMaxPoints.rows.length === 0) {
      await query(`ALTER TABLE assignment_questions ADD COLUMN max_points REAL NOT NULL DEFAULT 1`);
      console.log('Migration: added assignment_questions.max_points');
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
          correctness_score REAL,
          points_earned REAL,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      await query(
        'CREATE INDEX idx_assignment_responses_student_assignment ON student_assignment_responses(student_id, assignment_id)'
      );
      console.log('Migration: added student_assignment_responses');
    }
    const hasResponseCorrectnessScore = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_assignment_responses' AND column_name = 'correctness_score' LIMIT 1`
    );
    if (hasResponseCorrectnessScore.rows.length === 0) {
      await query('ALTER TABLE student_assignment_responses ADD COLUMN correctness_score REAL');
      console.log('Migration: added student_assignment_responses.correctness_score');
    }
    const hasResponsePointsEarned = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_assignment_responses' AND column_name = 'points_earned' LIMIT 1`
    );
    if (hasResponsePointsEarned.rows.length === 0) {
      await query('ALTER TABLE student_assignment_responses ADD COLUMN points_earned REAL');
      console.log('Migration: added student_assignment_responses.points_earned');
    }

    const hasAttemptGradesTable = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'student_assignment_attempt_grades' LIMIT 1`
    );
    if (hasAttemptGradesTable.rows.length === 0) {
      await query(
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
        )`
      );
      await query(
        'CREATE INDEX idx_attempt_grades_student_assignment ON student_assignment_attempt_grades(student_id, assignment_id, attempt_number)'
      );
      console.log('Migration: added student_assignment_attempt_grades');
    }
    const hasAttemptGradesKept = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_assignment_attempt_grades' AND column_name = 'is_kept' LIMIT 1`
    );
    if (hasAttemptGradesKept.rows.length === 0) {
      await query('ALTER TABLE student_assignment_attempt_grades ADD COLUMN is_kept BOOLEAN NOT NULL DEFAULT FALSE');
      console.log('Migration: added student_assignment_attempt_grades.is_kept');
    }
    await query(`UPDATE assignments SET keep_type = COALESCE(NULLIF(keep_type, ''), COALESCE(NULLIF(attempt_scoring_policy, ''), 'latest'))`);
    await query(`UPDATE assignments SET attempt_scoring_policy = COALESCE(NULLIF(keep_type, ''), 'latest')`);
    await query(`UPDATE student_assignment_attempt_grades SET is_kept = FALSE`);
    await query(
      `WITH ranked AS (
         SELECT
           sag.student_id,
           sag.assignment_id,
           sag.attempt_number,
           COALESCE(a.keep_type, a.attempt_scoring_policy, 'latest') AS keep_type,
           ROW_NUMBER() OVER (
             PARTITION BY sag.student_id, sag.assignment_id
             ORDER BY
               CASE
                 WHEN COALESCE(a.keep_type, a.attempt_scoring_policy, 'latest') = 'highest' THEN COALESCE(sag.percentage, -1)
                 ELSE 0
               END DESC,
               sag.attempt_number DESC
           ) AS rn
         FROM student_assignment_attempt_grades sag
         JOIN assignments a ON a.assignment_id = sag.assignment_id
       )
       UPDATE student_assignment_attempt_grades t
       SET is_kept = TRUE
       FROM ranked r
       WHERE t.student_id = r.student_id
         AND t.assignment_id = r.assignment_id
         AND t.attempt_number = r.attempt_number
         AND r.rn = 1`
    );

    const hasChatMessagesTable = await query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'student_chat_messages' LIMIT 1`
    );
    if (hasChatMessagesTable.rows.length === 0) {
      await query(
        `CREATE TABLE student_chat_messages (
          chat_message_id BIGSERIAL PRIMARY KEY,
          student_id BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
          assignment_id BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
          attempt_number INTEGER NOT NULL,
          role TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )`
      );
      await query(
        'CREATE INDEX idx_student_chat_messages_session ON student_chat_messages(student_id, assignment_id, attempt_number, created_at)'
      );
      await query(
        'CREATE INDEX idx_student_chat_messages_assignment_student ON student_chat_messages(assignment_id, student_id, attempt_number)'
      );
      console.log('Migration: added student_chat_messages');
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

    const hasPdfSummary = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'assignments' AND column_name = 'pdf_summary' LIMIT 1`
    );
    if (hasPdfSummary.rows.length === 0) {
      await query('ALTER TABLE assignments ADD COLUMN pdf_summary TEXT');
      console.log('Migration: added assignments.pdf_summary');
    }

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

    const hasWeeklyAccuracyScore = await query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'student_metrics' AND column_name = 'accuracy_score' LIMIT 1`
    );
    if (hasWeeklyAccuracyScore.rows.length === 0) {
      await query('ALTER TABLE student_metrics ADD COLUMN accuracy_score REAL');
      console.log('Migration: added student_metrics.accuracy_score');
    }

    // Ensure legacy assignments without due dates get a default due date.
    // We keep schema as-is for compatibility, but data should always have a due date.
    const dueDateBackfill = await query(
      `UPDATE assignments
       SET due_date = NOW() + INTERVAL '7 days'
       WHERE due_date IS NULL
       RETURNING assignment_id`
    );
    if (dueDateBackfill.rows.length > 0) {
      console.log(`Migration: backfilled due_date for ${dueDateBackfill.rows.length} assignment(s)`);
    }
  } catch (err) {
    console.error('Migration error (non-fatal):', err);
  }
}
