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
  } catch (err) {
    console.error('Migration error (non-fatal):', err);
  }
}
