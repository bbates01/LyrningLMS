# LyrningLMS

A learning management system that integrates AI as a guided learning tool while giving teachers visibility into student understanding, engagement, and AI dependency.

**Current vertical slice:** Adding a student to a class by class code (teacher shares code → student enters code in “Add class” → enrollment is created). Creating assignments and submitting work are not implemented yet.

---

## App Summary

**Problem:** Teenagers increasingly rely on AI to complete work without learning. Educators need a way to use AI in the classroom that supports understanding instead of shortcuts.

**Product value:** LyrningLMS gives teachers a single place to create assignments, quizzes, labs, and projects and to embed Google’s Gemini API with configurable guardrails. Students get AI help that stays within teacher-set restrictions, while teachers see metrics on understanding, engagement, and AI dependency. That lets educators spot over-reliance early and adjust support. The result: students build independent problem-solving skills while using AI as a learning aid, not a crutch.

---

## Tech Stack

Organized by layer:

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React, TypeScript, Vite (build and dev server), component-based UI |
| **Backend** | Node.js, Express.js (REST API) |
| **Data** | SQLite (relational database, single file) |
| **External** | Google Gemini API (AI learning assistance) |

- **Frontend:** React with TypeScript; Vite for fast builds and HMR.
- **Backend:** Node.js and Express for auth, classes, assignments, and enrollment.
- **Database:** SQLite with tables for students, teachers, classes, subjects, assignments, grades, and metrics.
- **APIs:** REST for the app; Gemini for in-assignment AI tutoring.

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
│   SQLite         │                          │  Google Gemini API   │
│   (lyrning.sqlite) │                         │  (AI tutor)          │
└──────────────────┘                          └──────────────────────┘
```

- **Browser:** Teachers and students use the same app; role is determined at login.
- **Frontend:** SPA that calls the backend for auth, class list, enrollment, and assignments.
- **Backend:** Serves REST endpoints; talks to SQLite and (for AI) to Gemini.
- **Database:** Holds users, classes, enrollments, assignments, and grades. **Class codes** (see below) allow students to join classes without exposing primary keys.

---

## Why Class Codes Was Added

This was not in the original ERD design but has been added for the following reason:

The database uses a **`class_code`** (e.g. `R7T4W9YZ`) on each class in addition to the primary key. We need a stable, shareable way for students to join a class without exposing internal IDs. Teachers share the class code; students enter it in “Add class.” The app looks up the class by `class_code` and creates the enrollment. Primary keys stay internal and are not shown or required from the user. 

---

## Prerequisites

- **Node.js** (v18+) — [nodejs.org](https://nodejs.org)  
  `node --version`
- **npm** (included with Node)  
  `npm --version`
- **Google Gemini API key** (optional; **not required** for testing the vertical slice) — [ai.google.dev](https://ai.google.dev)

No separate database server is required; the app uses **SQLite** (single file).

---

## Local Setup

Do these in order.

### 1. Clone the Repository and install

```bash
git clone [URL]
cd LyrningLMS
npm install
```

### 2. Environment

Create a `.env` in the project root (or copy from `.env.example`):

```env
SQLITE_DB_PATH=./backend/db/lyrning.sqlite
PORT=3001
VITE_API_URL=http://localhost:3001
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
```

- `SQLITE_DB_PATH` is the path to the SQLite database file (default: `./backend/db/lyrning.sqlite`).
- `PORT` is the backend port. Set `VITE_API_URL` to the same base URL (e.g. `http://localhost:3001`) so the frontend can reach the API.
- `GEMINI_API_KEY` is not required for testing the vertical slice (add a student to a class by class code).

### 3. Database

Initialize the SQLite database (creates tables and seed data):

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
- **Database:** With the app running, you can confirm enrollment in SQLite, e.g.  
  `sqlite3 backend/db/lyrning.sqlite "SELECT username, class_id FROM student_classes sc JOIN students s ON s.student_id = sc.student_id WHERE s.username = 'emma_w';"`  
  After the enrollment steps above, Emma should have an extra row for the Biology class.

---

## Project Layout (high level)

- **`frontend/`** — React app (components, services, types).
- **`backend/`** — Express server and routes (`auth`, `classes`), DB connection and queries.
- **`backend/db/`** — `schema.sql`, `seed.sql`, optional migration scripts.

A new teammate can run the project by: installing Node, copying `.env`, running `npm run db:init`, and running `npm run dev`, then following the verification steps above.
