-- ============================================================
-- Lyrning - Learning Management Database Schema (Postgres)
-- ============================================================

CREATE TABLE students (
    student_id    BIGSERIAL PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    date_of_birth DATE NOT NULL
);

CREATE TABLE teachers (
    teacher_id    BIGSERIAL PRIMARY KEY,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    date_of_birth DATE NOT NULL
);

CREATE TABLE admins (
    admin_id      BIGSERIAL PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE subjects (
    subject_id   BIGSERIAL PRIMARY KEY,
    subject_code TEXT  NOT NULL UNIQUE,
    description  TEXT,
    credits      REAL NOT NULL DEFAULT 3.0
);

CREATE TABLE classes (
    class_id     BIGSERIAL PRIMARY KEY,
    class_code   TEXT  NOT NULL UNIQUE,
    subject_id   BIGINT  NOT NULL REFERENCES subjects(subject_id),
    teacher_id   BIGINT  NOT NULL REFERENCES teachers(teacher_id),
    class_name   TEXT NOT NULL,
    period       TEXT,
    semester     TEXT,
    room_number  TEXT
);

CREATE TABLE student_classes (
    student_id      BIGINT  NOT NULL REFERENCES students(student_id),
    class_id        BIGINT  NOT NULL REFERENCES classes(class_id),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status          TEXT NOT NULL DEFAULT 'active',
    PRIMARY KEY (student_id, class_id)
);

CREATE TABLE assignments (
    assignment_id   BIGSERIAL PRIMARY KEY,
    class_id        BIGINT          NOT NULL REFERENCES classes(class_id),
    assignment_name TEXT NOT NULL,
    description     TEXT,
    type            TEXT,
    max_points      REAL NOT NULL DEFAULT 100,
    due_date        TIMESTAMPTZ,
    assignment_link TEXT UNIQUE,
    ai_params       TEXT,
    question_types  TEXT,
    allowed_submissions INTEGER NOT NULL DEFAULT 1,
    keep_type       TEXT NOT NULL DEFAULT 'latest',
    attempt_scoring_policy TEXT NOT NULL DEFAULT 'latest',
    pdf_summary     TEXT
);

-- Note: assignment_documents table removed; PDFs are not stored.

CREATE TABLE assignment_questions (
    question_id   BIGSERIAL PRIMARY KEY,
    assignment_id BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'multiple_choice',
    max_points    REAL NOT NULL DEFAULT 1,
    correct_answer TEXT
);

CREATE TABLE assignment_question_options (
    option_id    BIGSERIAL PRIMARY KEY,
    question_id  BIGINT NOT NULL REFERENCES assignment_questions(question_id) ON DELETE CASCADE,
    option_text  TEXT NOT NULL,
    is_correct   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE student_grades (
    student_id          BIGINT          NOT NULL REFERENCES students(student_id),
    assignment_id       BIGINT          NOT NULL REFERENCES assignments(assignment_id),
    points_earned       REAL,
    percentage          REAL,
    letter_grade        TEXT,
    submission_date     TIMESTAMPTZ,
    graded_date         TIMESTAMPTZ,
    understanding_score REAL,
    ai_dependency_score REAL,
    engagement_score    REAL,
    submission_attempts INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (student_id, assignment_id)
);

CREATE TABLE student_assignment_responses (
    response_id         BIGSERIAL PRIMARY KEY,
    student_id          BIGINT NOT NULL REFERENCES students(student_id),
    assignment_id       BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    question_id         BIGINT NOT NULL REFERENCES assignment_questions(question_id) ON DELETE CASCADE,
    attempt_number      INTEGER NOT NULL,
    response_text       TEXT,
    selected_option_ids TEXT,
    is_correct          INTEGER,
    correctness_score   REAL,
    points_earned       REAL,
    submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_assignment_attempt_grades (
    student_id          BIGINT NOT NULL REFERENCES students(student_id),
    assignment_id       BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    attempt_number      INTEGER NOT NULL,
    points_earned       REAL,
    percentage          REAL,
    letter_grade        TEXT,
    understanding_score REAL,
    ai_dependency_score REAL,
    engagement_score    REAL,
    is_kept             BOOLEAN NOT NULL DEFAULT FALSE,
    submission_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, assignment_id, attempt_number)
);

CREATE TABLE student_chat_messages (
    chat_message_id BIGSERIAL PRIMARY KEY,
    student_id      BIGINT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    assignment_id   BIGINT NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
    attempt_number  INTEGER NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_metrics (
    student_id          BIGINT  NOT NULL REFERENCES students(student_id),
    class_id            BIGINT  NOT NULL REFERENCES classes(class_id),
    week_number         INTEGER  NOT NULL,
    week_start_date     DATE,
    week_end_date       DATE,
    accuracy_score      REAL,
    understanding_score REAL,
    ai_dependency_score REAL,
    engagement_score    REAL,
    notes               TEXT,
    PRIMARY KEY (student_id, class_id, week_number)
);

-- Indexes
CREATE INDEX idx_classes_subject    ON classes(subject_id);
CREATE INDEX idx_classes_teacher    ON classes(teacher_id);
CREATE INDEX idx_assignments_class  ON assignments(class_id);
CREATE INDEX idx_assignment_questions_assignment ON assignment_questions(assignment_id);
CREATE INDEX idx_assignment_question_options_question ON assignment_question_options(question_id);
CREATE INDEX idx_grades_student     ON student_grades(student_id);
CREATE INDEX idx_grades_assignment  ON student_grades(assignment_id);
CREATE INDEX idx_assignment_responses_student_assignment ON student_assignment_responses(student_id, assignment_id);
CREATE INDEX idx_attempt_grades_student_assignment ON student_assignment_attempt_grades(student_id, assignment_id, attempt_number);
CREATE INDEX idx_student_chat_messages_session ON student_chat_messages(student_id, assignment_id, attempt_number, created_at);
CREATE INDEX idx_student_chat_messages_assignment_student ON student_chat_messages(assignment_id, student_id, attempt_number);
CREATE INDEX idx_metrics_student    ON student_metrics(student_id);
CREATE INDEX idx_metrics_class      ON student_metrics(class_id);

