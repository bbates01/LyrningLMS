-- ============================================================
-- Lyrning - Learning Management Database Schema (SQLite)
-- ============================================================

-- Students
CREATE TABLE students (
    student_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    date_of_birth TEXT NOT NULL
);

-- Teachers
CREATE TABLE teachers (
    teacher_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    date_of_birth TEXT NOT NULL
);

-- Subjects
CREATE TABLE subjects (
    subject_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_code TEXT  NOT NULL UNIQUE,
    description  TEXT,
    credits      REAL NOT NULL DEFAULT 3.0
);

-- Classes
CREATE TABLE classes (
    class_id     INTEGER PRIMARY KEY AUTOINCREMENT,
    class_code   TEXT  NOT NULL UNIQUE,
    subject_id   INTEGER  NOT NULL REFERENCES subjects(subject_id),
    teacher_id   INTEGER  NOT NULL REFERENCES teachers(teacher_id),
    class_name   TEXT NOT NULL,
    period       TEXT,
    semester     TEXT,
    room_number  TEXT
);

-- Student ↔ Class enrollment
CREATE TABLE student_classes (
    student_id      INTEGER  NOT NULL REFERENCES students(student_id),
    class_id        INTEGER  NOT NULL REFERENCES classes(class_id),
    enrollment_date TEXT NOT NULL DEFAULT (date('now')),
    status          TEXT NOT NULL DEFAULT 'active',
    PRIMARY KEY (student_id, class_id)
);

-- Assignments
CREATE TABLE assignments (
    assignment_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id        INTEGER          NOT NULL REFERENCES classes(class_id),
    assignment_name TEXT NOT NULL,
    description     TEXT,
    type            TEXT,
    max_points      REAL NOT NULL DEFAULT 100,
    due_date        TEXT,
    assignment_link TEXT UNIQUE
);

-- Assignment PDF documents (stored in DB as BLOB; multiple per assignment)
CREATE TABLE assignment_documents (
    document_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    filename      TEXT,
    mime_type     TEXT NOT NULL DEFAULT 'application/pdf',
    pdf_blob      BLOB NOT NULL,
    uploaded_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Assignment questions (one per question; order by sort_order)
CREATE TABLE assignment_questions (
    question_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    correct_answer TEXT
);

-- Options for a question (e.g. multiple-choice options; front end randomizes display order)
CREATE TABLE assignment_question_options (
    option_id    INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id  INTEGER NOT NULL REFERENCES assignment_questions(question_id) ON DELETE CASCADE,
    option_text  TEXT NOT NULL,
    is_correct   INTEGER NOT NULL DEFAULT 0
);

-- Student Grades (per assignment)
CREATE TABLE student_grades (
    student_id          INTEGER          NOT NULL REFERENCES students(student_id),
    assignment_id       INTEGER          NOT NULL REFERENCES assignments(assignment_id),
    points_earned       REAL,
    percentage          REAL,
    letter_grade        TEXT,
    submission_date     TEXT,
    graded_date         TEXT,
    understanding_score REAL,
    ai_dependency_score REAL,
    engagement_score    REAL,
    PRIMARY KEY (student_id, assignment_id)
);

-- Student Metrics (weekly rollup per class)
CREATE TABLE student_metrics (
    student_id          INTEGER  NOT NULL REFERENCES students(student_id),
    class_id            INTEGER  NOT NULL REFERENCES classes(class_id),
    week_number         INTEGER  NOT NULL,
    week_start_date     TEXT,
    week_end_date       TEXT,
    understanding_score REAL,
    ai_dependency_score REAL,
    engagement_score    REAL,
    notes               TEXT,
    PRIMARY KEY (student_id, class_id, week_number)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_classes_subject    ON classes(subject_id);
CREATE INDEX idx_classes_teacher    ON classes(teacher_id);
CREATE INDEX idx_assignments_class  ON assignments(class_id);
CREATE INDEX idx_assignment_documents_assignment ON assignment_documents(assignment_id);
CREATE INDEX idx_assignment_questions_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_assignment_question_options_question ON assignment_question_options(question_id);
CREATE INDEX idx_grades_student     ON student_grades(student_id);
CREATE INDEX idx_grades_assignment  ON student_grades(assignment_id);
CREATE INDEX idx_metrics_student    ON student_metrics(student_id);
CREATE INDEX idx_metrics_class      ON student_metrics(class_id);
