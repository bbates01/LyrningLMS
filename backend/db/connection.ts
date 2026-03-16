import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to connect to Postgres');
}

const pool = new Pool({
  connectionString,
  // Neon requires SSL; connection string usually has sslmode=require, but this is safe.
  ssl: { rejectUnauthorized: false },
});

export async function query(text: string, params?: any[]): Promise<{ rows: any[] }> {
  const res = await pool.query(text, params);
  return { rows: res.rows };
}

export default { query };
