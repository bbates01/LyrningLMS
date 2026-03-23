# LyrningLMS

A learning management system that integrates AI as a guided learning tool while giving teachers visibility into student understanding, engagement, and AI dependency.

**Current vertical slice (Sprint 1):** Teachers can upload a PDF, AI generates assignment questions, teachers can edit and confirm them, and an assignment link is created for sharing with students. Students can open the assignment, answer questions, and submit — their grade is stored in the database along with AI-generated metrics (understanding, engagement, and AI-dependency scores). Adding a student to a class by class code is also fully supported.

---

## App Summary

**Problem:** Teenagers increasingly rely on AI to complete work without learning. Educators need a way to use AI in the classroom that supports understanding instead of shortcuts.

**Product value:** LyrningLMS gives teachers a single place to create assignments, quizzes, labs, and projects and to embed the Groq API with configurable guardrails. Students get AI help that stays within teacher-set restrictions, while teachers see metrics on understanding, engagement, and AI dependency. That lets educators spot over-reliance early and adjust support. The result: students build independent problem-solving skills while using AI as a learning aid, not a crutch.

---

## Tech Stack

Organized by layer:

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React, TypeScript, Vite (build and dev server), component-based UI |
| **Backend** | Node.js, Express.js (REST API) |
| **Data** | Postgres (Neon in production) |
| **External** | Groq API (AI learning assistance) |

- **Frontend:** React with TypeScript; Vite for fast builds and HMR.
- **Backend:** Node.js and Express for auth, classes, assignments, and enrollment.
- **Database:** Postgres with tables for students, teachers, classes, subjects, assignments, grades, and metrics.
- **APIs:** REST for the app; Groq for in-assignment AI tutoring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                    (Teacher / Student)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                         │
│  Class list · Class home · Assignments · Grades · Metrics · Info │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST (JSON)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               Express Backend (Node.js)                          │
│  /api/auth  ·  /api/classes  (list, enroll by code, assignments)│
└────┬───────────────────────────────────────────────────────┬────┘
     │ SQL                                                    │ HTTPS
     ▼                                                        ▼
┌──────────────────┐                          ┌──────────────────────┐
│   Postgres       │                          │  Groq API            │
│   (Neon / local) │                          │  (AI tutor)          │
└──────────────────┘                          └──────────────────────┘
```

- **Browser:** Teachers and students use the same app; role is determined at login.
- **Frontend:** SPA that calls the backend for auth, class list, enrollment, and assignments.
- **Backend:** Serves REST endpoints; talks to Postgres and (for AI) to Groq.
- **Database:** Holds users, classes, enrollments, assignments, and grades. **Class codes** (see below) allow students to join classes without exposing primary keys.

---

## Definition of Done

A user story or task is considered **Done** when all of the following are true:

- The feature is fully implemented and matches the acceptance criteria on the Trello card.
- The code is committed and pushed to the shared GitHub repository on the correct branch.
- The README (and ERD if schema changed) has been updated to reflect any new or changed functionality.
- The feature works end-to-end in a local environment using the setup steps in this README.
- No known critical bugs remain for the feature being closed.
- The Trello card has been moved to **Done** or **Accepted by Product Owner**.

---

## Why Class Codes Was Added

This was not in the original ERD design but has been added for the following reason:

The database uses a **`class_code`** (e.g. `R7T4W9YZ`) on each class in addition to the primary key. We need a stable, shareable way for students to join a class without exposing internal IDs. Teachers share the class code; students enter it in “Add class.” The app looks up the class by `class_code` and creates the enrollment. Primary keys stay internal and are not shown or required from the user. 

---

## Prerequisites

- **Node.js 20.x (LTS)** — [nodejs.org](https://nodejs.org)  
  - This project includes an `.nvmrc` file. If you use `nvm`, run `nvm use` in the project root to automatically switch to Node 20.  
  - Verify with: `node --version` (should show something like `v20.x.x`).
- **npm** (included with Node)  
  `npm --version`
- **Postgres database** — in production we use **Neon** via `DATABASE_URL`; locally you can use the same Neon DB or any Postgres instance.
- **Groq API key** (optional; **not required** for testing the vertical slice) — [console.groq.com](https://console.groq.com)

---

## Local Setup

Do these in order.

### 1. Clone the Repository and install

```bash
git clone [URL]
cd LyrningLMS
nvm use   # if you have nvm installed; otherwise make sure you're on Node 20.x
npm install
```

### 2. Environment

Create a `.env` in the project root (or copy from `.env.example`):

```env
DATABASE_URL=postgresql://neondb_owner:your_password_here@your_host_here/neondb?sslmode=require
PORT=3001
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
# Optional: set to true once to drop & reseed Postgres
RESET_DB=false
```

- `DATABASE_URL` is the Postgres connection string (Neon in production).
- `PORT` is the backend port. In production the frontend calls `/api/...` on the same origin.
- `GROQ_API_KEY` is used by the backend for the AI tutor and assignment question generation. Get a key at [console.groq.com](https://console.groq.com). Not required for testing the vertical slice (e.g. add a student to a class by class code).

### 3. Database

Initialize the Postgres database (creates tables and seed data):

```bash
npm run db:init
```

### 4. Run the app

```bash
npm run dev
```

Then open the URL printed in the terminal (e.g. **http://localhost:5173** or **http://localhost:3000**). The backend runs on the port in `.env` (default **3001**).

---

## Test Accounts

Passwords are hashed in the database; for testing you can log in as any account using **`password123`**.  
On the login screen, choose **Student** or **Teacher** and use one of the usernames below.

| Role    | Username  |
|---------|-----------|
| Teacher | `sarah_b`, `james_ob`, `priya_s` |
| Student | `alice_j`, `bob_m`, `chloe_p`, `david_n`, `emma_w`, `felix_c`, `grace_t`, `henry_d` |

---

## Verification: Enroll a Student via Class Code

Use two accounts that are **not** in the same class yet: **Teacher `priya_s`** (Biology Honors) and **Student `emma_w`** (currently only in English Lit and Intro to CS).

### Step 1 — Teacher: Get the class code

1. Log in as **Teacher** with username **`priya_s`**, password **`password123`**.
2. On “Classes I Teach,” click **Biology Honors - Period 1**.
3. Under the main nav, open the **Info** subtab.
4. In **Class code**, note the value (e.g. **`R7T4W9YZ`**). You can copy or type it when acting as the student.
5. (Optional) Log out, or use a different browser/incognito for the student.

### Step 2 — Student: Add the class

1. Log in as **Student** with username **`emma_w`**, password **`password123`**.
2. On “My Classes,” click **Add class**.
3. Enter the class code from Step 1 (e.g. **`R7T4W9YZ`**). Case doesn’t matter.
4. Click **Add class**.

**Success:** The modal closes, the list refreshes, and **Biology Honors - Period 1** appears in Emma’s classes. Clicking it shows the class home and assignments.

**If it fails:** “Invalid class code” means the code is wrong or the DB doesn’t have that class. “Already enrolled” means that student is already in that class.

---

## Verification: Core Flows

- **Login:** Choose Student or Teacher, enter a username and `password123`. You should land on the class list (students: “My Classes”; teachers: “Classes I Teach”).
- **Class home:** Click a class. You should see that class’s name in the header and a roadmap/assignments list. Teachers also see **Home** and **Info** subtabs.
- **Teacher Info:** In a class, open the **Info** subtab. You should see class name, subject, description, **class code**, period, semester, and room.
- **Database:** With the app running, you can confirm enrollment in Postgres using any SQL client connected via `DATABASE_URL`. After the enrollment steps above, Emma should have an extra row for the Biology class in `student_classes`.

---

## Project Layout (high level)

- **`frontend/`** — React app (components, services, types).
- **`backend/`** — Express server and routes (`auth`, `classes`), DB connection and queries.
- **`backend/db/`** — Postgres connection and schema/seed files (see `connection.ts`, `schema.pg.sql`, `seed.pg.sql`, `init-db.ts`).

A new teammate can run the project by: installing Node, copying `.env`, running `npm run db:init`, and running `npm run dev`, then following the verification steps above.

# EARS Requirements

## Complete

1. When a teacher uploads course material (PDF), the system shall store the material for assignment generation.

2. When course material is uploaded, the system shall generate assignment questions using AI.

3. When AI generates assignment questions, the system shall allow teachers to edit the questions before confirming them.

4. When a teacher confirms generated questions, the system shall store the questions and answers in the database.

5. When a teacher logs into the system, the system shall allow navigation to the assignment creation page.

6. The system shall allow teachers to upload assignment materials (e.g., class PDFs).

7. The system shall support AI parameter configuration using a default parameter file.

8. When an assignment is created, the system shall store AI parameters associated with that assignment in the database.

9. When an assignment is created, the system shall generate a shareable assignment link for teachers. *(Sprint 1 — Will)*

10. When a teacher requests an assignment link, the system shall allow the teacher to copy the link to share with students. *(Sprint 1 — Will)*

11. When a student completes an assignment, the system shall synchronize the completed assignment data with the teacher’s system. *(Sprint 1 — Jake)*

12. When a student completes an assignment, the system shall generate performance metrics based on the student’s responses. *(Sprint 1 — Jake)*

13. When a student submits an assignment, the system shall assign a default grade based on the accuracy of the student’s answers. *(Sprint 1 — Jake)*

14. The system documentation shall include an updated ERD reflecting AI assignment parameters and related schema changes. *(Sprint 1 — Marielle)*

15. All developers shall clone the GitHub repository and configure their environment according to the README instructions. *(Sprint 1 — Everyone)*

16. When a user attempts to log in, the system shall restrict the teacher login page to teacher credentials only.

17. When a student attempts to access assignments, the system shall provide a student-specific access page through assignment links.

18. When a student logs in, the system shall authenticate the student credentials before allowing access to the assignment completion page.

19. When generating assignments, the system shall combine the default AI parameters and the custom teacher instructions defined in the assignment configuration.

20. When a student interacts with the assignment system, the system shall provide an AI chat interface for assistance.

---

## Not Complete

1. The system shall calculate an AI dependency metric based on conversations students have with the AI tutor that can be viewed by teachers.

2. When a student opens an assignment completion page, the system shall synchronize assignment questions and answers from the database.

3. The system shall calculate an understanding metric based student's average scores on assignments.











