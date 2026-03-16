-- ============================================================
-- Lyrning - Seed Data
-- ============================================================

-- -----------------------------------------------
-- Students (passwords are bcrypt hashes of 'password123')
-- -----------------------------------------------
INSERT INTO students (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('Alice',   'Johnson',  'alice.johnson@school.edu',  'alice_j',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-03-14'),
('Bob',     'Martinez', 'bob.martinez@school.edu',   'bob_m',     '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-07-22'),
('Chloe',   'Park',     'chloe.park@school.edu',     'chloe_p',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-11-05'),
('David',   'Nguyen',   'david.nguyen@school.edu',   'david_n',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-01-30'),
('Emma',    'Williams', 'emma.williams@school.edu',  'emma_w',    '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-09-18'),
('Felix',   'Chen',     'felix.chen@school.edu',     'felix_c',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-05-02'),
('Grace',   'Thompson', 'grace.thompson@school.edu', 'grace_t',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-12-11'),
('Henry',   'Davis',    'henry.davis@school.edu',    'henry_d',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-08-25');

-- -----------------------------------------------
-- Teachers
-- -----------------------------------------------
INSERT INTO teachers (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('Sarah',  'Bennett',  'sarah.bennett@school.edu',  'sarah_b',  '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1985-04-17'),
('James',  'O''Brien', 'james.obrien@school.edu',   'james_ob', '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1979-08-03'),
('Priya',  'Sharma',   'priya.sharma@school.edu',   'priya_s',  '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1988-12-21');

-- -----------------------------------------------
-- Subjects
-- -----------------------------------------------
INSERT INTO subjects (subject_code, description, credits) VALUES
('MATH101', 'Algebra and Pre-Calculus',          3.0),
('ENG201',  'English Literature and Composition', 3.0),
('SCI101',  'Introduction to Biology',            4.0),
('HIST101', 'World History',                      3.0),
('CS101',   'Introduction to Computer Science',   3.0);

-- -----------------------------------------------
-- Classes  (class_code, subject_id, teacher_id)
-- -----------------------------------------------
INSERT INTO classes (class_code, subject_id, teacher_id, class_name, period, semester, room_number) VALUES
('JX5H921E', 1, 1, 'Algebra II - Period 2',          'Period 2', 'Fall 2025',   '101'),
('K2M8N3PQ', 2, 2, 'English Lit - Period 4',         'Period 4', 'Fall 2025',   '204'),
('R7T4W9YZ', 3, 3, 'Biology Honors - Period 1',      'Period 1', 'Fall 2025',   'Lab B'),
('L1P6Q0S2', 5, 1, 'Intro to CS - Period 6',         'Period 6', 'Fall 2025',   'Lab A'),
('U3V8X1AB', 4, 2, 'World History - Period 3',       'Period 3', 'Spring 2026', '205');

-- -----------------------------------------------
-- Student Classes (student_id, class_id)
-- -----------------------------------------------
INSERT INTO student_classes (student_id, class_id, enrollment_date, status) VALUES
-- Algebra II
(1, 1, '2025-08-25', 'active'),
(2, 1, '2025-08-25', 'active'),
(3, 1, '2025-08-25', 'active'),
(4, 1, '2025-08-25', 'active'),
-- English Lit
(1, 2, '2025-08-25', 'active'),
(3, 2, '2025-08-25', 'active'),
(5, 2, '2025-08-25', 'active'),
(6, 2, '2025-08-25', 'active'),
-- Biology
(2, 3, '2025-08-25', 'active'),
(4, 3, '2025-08-25', 'active'),
(7, 3, '2025-08-25', 'active'),
(8, 3, '2025-08-25', 'active'),
-- Intro to CS
(5, 4, '2025-08-25', 'active'),
(6, 4, '2025-08-25', 'active'),
(7, 4, '2025-08-25', 'active'),
(8, 4, '2025-08-25', 'active'),
-- World History
(1, 5, '2026-01-13', 'active'),
(2, 5, '2026-01-13', 'active'),
(3, 5, '2026-01-13', 'active'),
(4, 5, '2026-01-13', 'active');

-- -----------------------------------------------
-- Assignments
-- -----------------------------------------------
INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date, assignment_link) VALUES
-- Algebra II (class 1)
(1, 'Chapter 1 Quiz',          'Linear equations and inequalities',    'quiz',       25,  '2025-09-05 23:59:00', 'a1b2c3d4e5f6'),
(1, 'Midterm Exam',            'Chapters 1-4 comprehensive exam',      'exam',       100, '2025-10-15 23:59:00', 'b2c3d4e5f6g7'),
(1, 'Polynomial Homework Set', 'Practice problems on polynomials',     'homework',   20,  '2025-09-19 23:59:00', 'c3d4e5f6g7h8'),
-- English Lit (class 2)
(2, 'Short Story Analysis',    'Analyze a short story of your choice', 'essay',      50,  '2025-09-12 23:59:00', 'd4e5f6g7h8i9'),
(2, 'Poetry Response',         'Written response to assigned poems',   'essay',      40,  '2025-10-01 23:59:00', 'e5f6g7h8i9j0'),
(2, 'Midterm Essay',           'Comparative essay, two novels',        'exam',       100, '2025-10-16 23:59:00', 'f6g7h8i9j0k1'),
-- Biology (class 3)
(3, 'Cell Structure Lab',      'Microscopy lab report',                'lab',        50,  '2025-09-10 23:59:00', 'g7h8i9j0k1l2'),
(3, 'DNA & Genetics Quiz',     'Quiz on chapters 3-4',                 'quiz',       30,  '2025-09-25 23:59:00', 'h8i9j0k1l2m3'),
(3, 'Ecosystem Research Paper','Research paper on a local ecosystem',  'project',    75,  '2025-11-01 23:59:00', 'i9j0k1l2m3n4'),
-- Intro to CS (class 4)
(4, 'Hello World Project',     'First Python program',                 'project',    20,  '2025-09-08 23:59:00', 'j0k1l2m3n4o5'),
(4, 'Loops & Conditionals HW', 'Coding exercises on control flow',     'homework',   30,  '2025-09-22 23:59:00', 'k1l2m3n4o5p6'),
(4, 'Final Project',           'Build a small interactive program',    'project',    100, '2025-12-01 23:59:00', 'l2m3n4o5p6q7');

-- -----------------------------------------------
-- Student Grades
-- -----------------------------------------------
INSERT INTO student_grades
    (student_id, assignment_id, points_earned, percentage, letter_grade,
     submission_date, graded_date,
     understanding_score, ai_dependency_score, engagement_score)
VALUES
-- Alice (1) – Algebra II assignments (1,2,3)
(1, 1,  23,   92.0, 'A',  '2025-09-05 18:30:00', '2025-09-07 09:00:00', 8.5, 2.0, 9.0),
(1, 2,  88,   88.0, 'B+', '2025-10-15 20:00:00', '2025-10-18 10:00:00', 8.0, 2.5, 8.5),
(1, 3,  19,   95.0, 'A',  '2025-09-18 22:45:00', '2025-09-20 09:00:00', 9.0, 1.5, 9.5),
-- Alice (1) – English Lit (4,5,6)
(1, 4,  44,   88.0, 'B+', '2025-09-12 16:00:00', '2025-09-15 10:00:00', 7.5, 3.5, 8.0),
(1, 5,  36,   90.0, 'A-', '2025-09-30 21:00:00', '2025-10-03 09:00:00', 8.0, 3.0, 8.5),
(1, 6,  91,   91.0, 'A-', '2025-10-16 19:00:00', '2025-10-19 10:00:00', 8.5, 2.5, 9.0),

-- Bob (2) – Algebra II (1,2,3)
(2, 1,  18,   72.0, 'C',  '2025-09-05 23:30:00', '2025-09-07 09:00:00', 5.5, 6.5, 6.0),
(2, 2,  74,   74.0, 'C',  '2025-10-15 22:00:00', '2025-10-18 10:00:00', 5.0, 7.0, 5.5),
(2, 3,  14,   70.0, 'C-', '2025-09-18 23:50:00', '2025-09-20 09:00:00', 5.0, 7.5, 5.0),
-- Bob (2) – Biology (7,8,9)
(2, 7,  42,   84.0, 'B',  '2025-09-10 17:00:00', '2025-09-13 09:00:00', 7.0, 4.0, 7.5),
(2, 8,  26,   86.7, 'B',  '2025-09-25 20:00:00', '2025-09-27 09:00:00', 7.5, 4.5, 7.0),

-- Chloe (3) – Algebra II (1,2,3)
(3, 1,  25,  100.0, 'A',  '2025-09-04 14:00:00', '2025-09-07 09:00:00', 9.5, 1.0, 9.5),
(3, 2,  97,   97.0, 'A',  '2025-10-14 11:00:00', '2025-10-18 10:00:00', 9.5, 1.0, 9.5),
(3, 3,  20,  100.0, 'A',  '2025-09-17 15:00:00', '2025-09-20 09:00:00', 9.5, 0.5, 10.0),
-- Chloe (3) – English Lit (4,5,6)
(3, 4,  47,   94.0, 'A',  '2025-09-11 13:00:00', '2025-09-15 10:00:00', 9.0, 1.5, 9.5),
(3, 5,  39,   97.5, 'A',  '2025-09-29 17:00:00', '2025-10-03 09:00:00', 9.5, 1.0, 9.5),

-- David (4) – Algebra II (1,2,3)
(4, 1,  21,   84.0, 'B',  '2025-09-05 20:00:00', '2025-09-07 09:00:00', 7.0, 4.0, 7.5),
(4, 2,  80,   80.0, 'B-', '2025-10-15 18:00:00', '2025-10-18 10:00:00', 7.0, 4.5, 7.0),
-- David (4) – Biology (7,8)
(4, 7,  38,   76.0, 'C+', '2025-09-10 22:00:00', '2025-09-13 09:00:00', 6.0, 5.5, 6.5),
(4, 8,  24,   80.0, 'B-', '2025-09-25 21:00:00', '2025-09-27 09:00:00', 6.5, 5.0, 6.5),

-- Emma (5) – English Lit (4,5,6)
(5, 4,  40,   80.0, 'B-', '2025-09-12 23:00:00', '2025-09-15 10:00:00', 6.5, 5.5, 7.0),
(5, 5,  32,   80.0, 'B-', '2025-10-01 22:30:00', '2025-10-03 09:00:00', 6.5, 6.0, 6.5),
-- Emma (5) – Intro to CS (10,11)
(5, 10, 18,   90.0, 'A-', '2025-09-07 20:00:00', '2025-09-09 09:00:00', 8.0, 3.5, 8.5),
(5, 11, 27,   90.0, 'A-', '2025-09-21 19:00:00', '2025-09-23 09:00:00', 8.0, 3.0, 9.0),

-- Felix (6) – English Lit (4,5)
(6, 4,  35,   70.0, 'C-', '2025-09-12 23:58:00', '2025-09-15 10:00:00', 5.0, 8.0, 5.0),
(6, 5,  28,   70.0, 'C-', '2025-10-01 23:55:00', '2025-10-03 09:00:00', 4.5, 8.5, 4.5),
-- Felix (6) – Intro to CS (10,11)
(6, 10, 20,  100.0, 'A',  '2025-09-06 16:00:00', '2025-09-09 09:00:00', 9.5, 1.0, 9.5),
(6, 11, 30,  100.0, 'A',  '2025-09-20 14:00:00', '2025-09-23 09:00:00', 9.5, 0.5, 10.0),

-- Grace (7) – Biology (7,8)
(7, 7,  45,   90.0, 'A-', '2025-09-09 18:00:00', '2025-09-13 09:00:00', 8.5, 2.5, 8.5),
(7, 8,  29,   96.7, 'A',  '2025-09-24 20:00:00', '2025-09-27 09:00:00', 9.0, 2.0, 9.0),
-- Grace (7) – Intro to CS (10,11)
(7, 10, 17,   85.0, 'B',  '2025-09-08 21:00:00', '2025-09-09 09:00:00', 7.5, 3.5, 8.0),
(7, 11, 26,   86.7, 'B',  '2025-09-22 19:00:00', '2025-09-23 09:00:00', 7.5, 4.0, 7.5),

-- Henry (8) – Biology (7,8)
(8, 7,  30,   60.0, 'D',  '2025-09-10 23:55:00', '2025-09-13 09:00:00', 4.0, 8.0, 4.5),
(8, 8,  18,   60.0, 'D',  '2025-09-25 23:50:00', '2025-09-27 09:00:00', 4.0, 8.5, 4.0),
-- Henry (8) – Intro to CS (10,11)
(8, 10, 15,   75.0, 'C',  '2025-09-08 23:00:00', '2025-09-09 09:00:00', 6.0, 7.0, 5.5),
(8, 11, 22,   73.3, 'C',  '2025-09-22 22:00:00', '2025-09-23 09:00:00', 5.5, 7.5, 5.5);

-- -----------------------------------------------
-- Student Metrics (weekly)
-- -----------------------------------------------
INSERT INTO student_metrics
    (student_id, class_id, week_number, week_start_date, week_end_date,
     understanding_score, ai_dependency_score, engagement_score, notes)
VALUES
-- Alice – Algebra II
(1, 1, 1, '2025-08-25', '2025-08-29', 8.0, 2.0, 9.0, 'Strong start, participates actively.'),
(1, 1, 2, '2025-09-01', '2025-09-05', 8.5, 2.0, 9.0, NULL),
(1, 1, 3, '2025-09-08', '2025-09-12', 8.5, 1.5, 9.5, 'Showed improvement on polynomials.'),
(1, 1, 4, '2025-09-15', '2025-09-19', 9.0, 1.5, 9.5, NULL),
-- Bob – Algebra II
(2, 1, 1, '2025-08-25', '2025-08-29', 5.0, 7.0, 5.5, 'Struggled with linear equations.'),
(2, 1, 2, '2025-09-01', '2025-09-05', 5.5, 6.5, 6.0, 'Some improvement after tutoring session.'),
(2, 1, 3, '2025-09-08', '2025-09-12', 5.0, 7.0, 5.5, 'Heavy AI use detected on homework.'),
(2, 1, 4, '2025-09-15', '2025-09-19', 5.0, 7.5, 5.0, 'Recommend intervention meeting.'),
-- Chloe – Algebra II
(3, 1, 1, '2025-08-25', '2025-08-29', 9.5, 1.0, 9.5, 'Exceptional student.'),
(3, 1, 2, '2025-09-01', '2025-09-05', 9.5, 0.5, 10.0, NULL),
(3, 1, 3, '2025-09-08', '2025-09-12', 9.5, 1.0, 9.5, 'Helping peers in study groups.'),
(3, 1, 4, '2025-09-15', '2025-09-19', 9.5, 0.5, 10.0, NULL),
-- Felix – Intro to CS (high AI dependency flagged)
(6, 4, 1, '2025-08-25', '2025-08-29', 9.0, 1.0, 9.5, 'Talented coder, independent.'),
(6, 4, 2, '2025-09-01', '2025-09-05', 9.5, 0.5, 10.0, NULL),
-- Felix – English Lit (low scores, high AI dependency)
(6, 2, 1, '2025-08-25', '2025-08-29', 4.5, 8.5, 4.5, 'Minimal engagement in discussions.'),
(6, 2, 2, '2025-09-01', '2025-09-05', 4.5, 8.5, 4.5, 'AI writing detected in short story draft.'),
(6, 2, 3, '2025-09-08', '2025-09-12', 5.0, 8.0, 5.0, 'Meeting scheduled with student.'),
-- Henry – Biology
(8, 3, 1, '2025-08-25', '2025-08-29', 4.0, 8.0, 4.5, 'Often disengaged during lab.'),
(8, 3, 2, '2025-09-01', '2025-09-05', 4.0, 8.5, 4.0, 'Lab report showed AI-generated sections.'),
(8, 3, 3, '2025-09-08', '2025-09-12', 4.5, 7.5, 5.0, 'Slight improvement after parent email.');
