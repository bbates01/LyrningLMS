TRUNCATE TABLE teachers, students RESTART IDENTITY CASCADE;

-- Seed students table with test credentials
-- Passwords:
-- jsmith: password123
-- sjohnson: password123
-- mwilliams: password123
-- ebrown: password123
INSERT INTO students (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('John', 'Smith', 'john.smith@example.com', 'jsmith', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '2005-03-15'),
('Sarah', 'Johnson', 'sarah.johnson@example.com', 'sjohnson', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '2004-07-22'),
('Michael', 'Williams', 'michael.williams@example.com', 'mwilliams', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '2005-11-08'),
('Emily', 'Brown', 'emily.brown@example.com', 'ebrown', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '2004-05-19');

-- Seed teachers table with test credentials
-- Passwords:
-- rdavis: password123
-- jmiller: password123
-- dwilson: password123
-- landerson: password123
INSERT INTO teachers (first_name, last_name, email, username, password_hash, date_of_birth) VALUES
('Robert', 'Davis', 'robert.davis@example.com', 'rdavis', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '1978-02-10'),
('Jennifer', 'Miller', 'jennifer.miller@example.com', 'jmiller', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '1982-09-25'),
('David', 'Wilson', 'david.wilson@example.com', 'dwilson', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '1980-12-03'),
('Lisa', 'Anderson', 'lisa.anderson@example.com', 'landerson', '$2b$10$E52vDE/qEqo59LkqzKP0.eRnn7WPd/8MxcVQFmin1.Ljhl4jnbr96', '1985-06-14');
