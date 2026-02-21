-- ============================================================
-- Lyrning - Learning Management Database Schema
-- ============================================================

-- Students
CREATE TABLE students (
    student_id    SERIAL PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL
);

-- Teachers
CREATE TABLE teachers (
    teacher_id    SERIAL PRIMARY KEY,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    username      VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL
);

-- Subjects
CREATE TABLE subjects (
    subject_id   SERIAL PRIMARY KEY,
    subject_code VARCHAR(20)  NOT NULL UNIQUE,
    description  TEXT,
    credits      NUMERIC(4,2) NOT NULL DEFAULT 3.0
);

-- Classes
CREATE TABLE classes (
    class_id     SERIAL PRIMARY KEY,
    subject_id   INT  NOT NULL REFERENCES subjects(subject_id),
    teacher_id   INT  NOT NULL REFERENCES teachers(teacher_id),
    class_name   VARCHAR(150) NOT NULL,
    period       VARCHAR(50),
    semester     VARCHAR(50),
    room_number  VARCHAR(20)
);

-- Student ↔ Class enrollment
CREATE TABLE student_classes (
    student_id      INT  NOT NULL REFERENCES students(student_id),
    class_id        INT  NOT NULL REFERENCES classes(class_id),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'active',
    PRIMARY KEY (student_id, class_id)
);

-- Assignments
CREATE TABLE assignments (
    assignment_id   SERIAL PRIMARY KEY,
    class_id        INT          NOT NULL REFERENCES classes(class_id),
    assignment_name VARCHAR(200) NOT NULL,
    description     TEXT,
    type            VARCHAR(50),
    max_points      NUMERIC(6,2) NOT NULL DEFAULT 100,
    due_date        TIMESTAMP
);

-- Student Grades (per assignment)
CREATE TABLE student_grades (
    student_id          INT          NOT NULL REFERENCES students(student_id),
    assignment_id       INT          NOT NULL REFERENCES assignments(assignment_id),
    points_earned       NUMERIC(6,2),
    percentage          NUMERIC(5,2),
    letter_grade        VARCHAR(5),
    submission_date     TIMESTAMP,
    graded_date         TIMESTAMP,
    understanding_score NUMERIC(3,1),
    ai_dependency_score NUMERIC(3,1),
    engagement_score    NUMERIC(3,1),
    PRIMARY KEY (student_id, assignment_id)
);

-- Student Metrics (weekly rollup per class)
CREATE TABLE student_metrics (
    student_id          INT  NOT NULL REFERENCES students(student_id),
    class_id            INT  NOT NULL REFERENCES classes(class_id),
    week_number         INT  NOT NULL,
    week_start_date     DATE,
    week_end_date       DATE,
    understanding_score NUMERIC(3,1),
    ai_dependency_score NUMERIC(3,1),
    engagement_score    NUMERIC(3,1),
    notes               TEXT,
    PRIMARY KEY (student_id, class_id, week_number)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_classes_subject    ON classes(subject_id);
CREATE INDEX idx_classes_teacher    ON classes(teacher_id);
CREATE INDEX idx_assignments_class  ON assignments(class_id);
CREATE INDEX idx_grades_student     ON student_grades(student_id);
CREATE INDEX idx_grades_assignment  ON student_grades(assignment_id);
CREATE INDEX idx_metrics_student    ON student_metrics(student_id);
CREATE INDEX idx_metrics_class      ON student_metrics(class_id);
