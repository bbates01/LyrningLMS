/**
 * Run lightweight migrations so the app works even if DB was created before
 * ai_params and question_types were added to assignments.
 */
import { query } from './connection.js';

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
