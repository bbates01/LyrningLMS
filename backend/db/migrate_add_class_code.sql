-- Migration: add class_code to classes (run when DB is in use and you can't drop/recreate)
-- Run with: PGPASSWORD=admin psql -U postgres -h localhost -d lyrning -f backend/db/migrate_add_class_code.sql

ALTER TABLE classes ADD COLUMN IF NOT EXISTS class_code VARCHAR(20);

UPDATE classes SET class_code = 'JX5H921E' WHERE class_id = 1;
UPDATE classes SET class_code = 'K2M8N3PQ' WHERE class_id = 2;
UPDATE classes SET class_code = 'R7T4W9YZ' WHERE class_id = 3;
UPDATE classes SET class_code = 'L1P6Q0S2' WHERE class_id = 4;
UPDATE classes SET class_code = 'U3V8X1AB' WHERE class_id = 5;

ALTER TABLE classes ALTER COLUMN class_code SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'classes_class_code_key') THEN
    ALTER TABLE classes ADD CONSTRAINT classes_class_code_key UNIQUE (class_code);
  END IF;
END $$;
