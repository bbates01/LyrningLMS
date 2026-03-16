-- Postgres seed data, adapted from SQLite seed.sql

INSERT INTO students (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('Alice',   'Johnson',  'alice.johnson@school.edu',  'alice_j',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-03-14'),
('Bob',     'Martinez', 'bob.martinez@school.edu',   'bob_m',     '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-07-22'),
('Chloe',   'Park',     'chloe.park@school.edu',     'chloe_p',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-11-05'),
('David',   'Nguyen',   'david.nguyen@school.edu',   'david_n',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-01-30'),
('Emma',    'Williams', 'emma.williams@school.edu',  'emma_w',    '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-09-18'),
('Felix',   'Chen',     'felix.chen@school.edu',     'felix_c',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-05-02'),
('Grace',   'Thompson', 'grace.thompson@school.edu', 'grace_t',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2005-12-11'),
('Henry',   'Davis',    'henry.davis@school.edu',    'henry_d',   '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '2006-08-25');

INSERT INTO teachers (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('Sarah',  'Bennett',  'sarah.bennett@school.edu',  'sarah_b',  '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1985-04-17'),
('James',  'O''Brien', 'james.obrien@school.edu',   'james_ob', '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1979-08-03'),
('Priya',  'Sharma',   'priya.sharma@school.edu',   'priya_s',  '$2b$12$8zdkLMBe8.oFbsRIl9ycp.uPg5u1NYIBCzdgtoqzgovrPis4vajai', '1988-12-21');

INSERT INTO subjects (subject_code, description, credits) VALUES
('MATH101', 'Algebra and Pre-Calculus',          3.0),
('ENG201',  'English Literature and Composition', 3.0),
('SCI101',  'Introduction to Biology',            4.0),
('HIST101', 'World History',                      3.0),
('CS101',   'Introduction to Computer Science',   3.0);

INSERT INTO classes (class_code, subject_id, teacher_id, class_name, period, semester, room_number) VALUES
('JX5H921E', 1, 1, 'Algebra II - Period 2',          'Period 2', 'Fall 2025',   '101'),
('K2M8N3PQ', 2, 2, 'English Lit - Period 4',         'Period 4', 'Fall 2025',   '204'),
('R7T4W9YZ', 3, 3, 'Biology Honors - Period 1',      'Period 1', 'Fall 2025',   'Lab B'),
('L1P6Q0S2', 5, 1, 'Intro to CS - Period 6',         'Period 6', 'Fall 2025',   'Lab A'),
('U3V8X1AB', 4, 2, 'World History - Period 3',       'Period 3', 'Spring 2026', '205');

INSERT INTO student_classes (student_id, class_id, enrollment_date, status) VALUES
(1, 1, '2025-08-25', 'active'),
(2, 1, '2025-08-25', 'active'),
(3, 1, '2025-08-25', 'active'),
(4, 1, '2025-08-25', 'active'),
(1, 2, '2025-08-25', 'active'),
(3, 2, '2025-08-25', 'active'),
(5, 2, '2025-08-25', 'active'),
(6, 2, '2025-08-25', 'active'),
(2, 3, '2025-08-25', 'active'),
(4, 3, '2025-08-25', 'active'),
(7, 3, '2025-08-25', 'active'),
(8, 3, '2025-08-25', 'active'),
(5, 4, '2025-08-25', 'active'),
(6, 4, '2025-08-25', 'active'),
(7, 4, '2025-08-25', 'active'),
(8, 4, '2025-08-25', 'active'),
(1, 5, '2026-01-13', 'active'),
(2, 5, '2026-01-13', 'active'),
(3, 5, '2026-01-13', 'active'),
(4, 5, '2026-01-13', 'active');

INSERT INTO assignments (class_id, assignment_name, description, type, max_points, due_date) VALUES
(1, 'Chapter 1 Quiz',          'Linear equations and inequalities',    'quiz',       25,  '2025-09-05 23:59:00+00'),
(1, 'Midterm Exam',            'Chapters 1-4 comprehensive exam',      'exam',       100, '2025-10-15 23:59:00+00'),
(1, 'Polynomial Homework Set', 'Practice problems on polynomials',     'homework',   20,  '2025-09-19 23:59:00+00'),
(2, 'Short Story Analysis',    'Analyze a short story of your choice', 'essay',      50,  '2025-09-12 23:59:00+00'),
(2, 'Poetry Response',         'Written response to assigned poems',   'essay',      40,  '2025-10-01 23:59:00+00'),
(2, 'Midterm Essay',           'Comparative essay, two novels',        'exam',       100, '2025-10-16 23:59:00+00'),
(3, 'Cell Structure Lab',      'Microscopy lab report',                'lab',        50,  '2025-09-10 23:59:00+00'),
(3, 'DNA & Genetics Quiz',     'Quiz on chapters 3-4',                 'quiz',       30,  '2025-09-25 23:59:00+00'),
(3, 'Ecosystem Research Paper','Research paper on a local ecosystem',  'project',    75,  '2025-11-01 23:59:00+00'),
(4, 'Hello World Project',     'First Python program',                 'project',    20,  '2025-09-08 23:59:00+00'),
(4, 'Loops & Conditionals HW', 'Coding exercises on control flow',     'homework',   30,  '2025-09-22 23:59:00+00'),
(4, 'Final Project',           'Build a small interactive program',    'project',    100, '2025-12-01 23:59:00+00');

INSERT INTO student_grades
    (student_id, assignment_id, points_earned, percentage, letter_grade,
     submission_date, graded_date,
     understanding_score, ai_dependency_score, engagement_score)
VALUES
(1, 1,  23,   92.0, 'A',  '2025-09-05 18:30:00+00', '2025-09-07 09:00:00+00', 8.5, 2.0, 9.0),
(1, 2,  88,   88.0, 'B+', '2025-10-15 20:00:00+00', '2025-10-18 10:00:00+00', 8.0, 2.5, 8.5),
(1, 3,  19,   95.0, 'A',  '2025-09-18 22:45:00+00', '2025-09-20 09:00:00+00', 9.0, 1.5, 9.5);

INSERT INTO student_metrics
    (student_id, class_id, week_number, week_start_date, week_end_date,
     understanding_score, ai_dependency_score, engagement_score, notes)
VALUES
(1, 1, 1, '2025-08-25', '2025-08-29', 8.0, 2.0, 9.0, 'Strong start, participates actively.'),
(1, 1, 2, '2025-09-01', '2025-09-05', 8.5, 2.0, 9.0, NULL),
(1, 1, 3, '2025-09-08', '2025-09-12', 8.5, 1.5, 9.5, 'Showed improvement on polynomials.');

