# LyrningLMS

LyrningLMS is a role-based LMS with AI-assisted assignment authoring, student assignment delivery/submission, and teacher/admin analytics.

This README reflects the current implementation in the repository as of March 2026.

## What Is Implemented

### Teacher flow

- Teacher login and class selection
- Create, edit, and delete classes
- Add existing students to a class, create new students in a class, and remove students from a class
- Create assignments with:
  - due date (optional)
  - max points
  - allowed submission attempts
  - attempt scoring policy (`latest`, `highest`, `average`)
  - AI tutor instructions
- Upload PDFs for assignment generation context (PDFs are processed, not permanently stored)
- AI-generated questions from PDF/context with support for:
  - multiple choice
  - true/false
  - short answer
  - select-all-that-apply
- Save and edit assignment questions/options
- Teacher grades view per class with assignment averages and per-student results
- Teacher metrics view per class and per student (weekly snapshots)

### Student flow

- Student-only login page via shared assignment link path
- JWT-authenticated assignment access and submission
- Multi-attempt assignment submissions with attempt tracking
- Auto-grading for objective question types
- AI-assisted grading fallback for short answer
- AI tutor chat during assignment attempts
- AI tutor refuses direct/near-verbatim assignment-question answering
- Per-attempt and aggregate scoring, including:
  - points
  - percentage
  - letter grade
  - understanding score
  - AI dependency score
  - engagement score

### Admin flow

- Dedicated admin login (`/admin`)
- Read-only cross-class analytics
- Global metrics with multi-select cascading filters:
  - subject
  - semester
  - period
  - teacher
- Read-only class detail views for grades and metrics

## Tech Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- Database: Postgres (`pg`)
- AI: Groq-compatible OpenAI API client

## Project Structure

```text
backend/
  server.ts
  routes/
    auth.ts
    classes.ts
    ai.ts
    student.ts
    admin.ts
  db/
    schema.pg.sql
    seed.pg.sql
    init-db.ts
    migrate.ts
  auth/
    studentToken.ts
    adminToken.ts

frontend/
  App.tsx
  components/
  services/

dev.sh
package.json
```

## Prerequisites

- Node.js 20.x (repo includes `.nvmrc`)
- npm
- Postgres database (local or hosted, e.g. Neon)
- Groq API key for AI endpoints

## Environment Variables

Create `.env` at project root:

```env
DATABASE_URL=postgresql://neondb_owner:your_password_here@your_host_here/neondb?sslmode=require
PORT=3001
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
RESET_DB=false

# Optional (defaults exist in code for local dev)
# JWT_SECRET=change-me
# STUDENT_JWT_SECRET=change-me
# STUDENT_JWT_EXPIRES_IN=8h
# ADMIN_JWT_SECRET=change-me
# ADMIN_JWT_EXPIRES_IN=12h
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Initialize database schema + seed

```bash
npm run db:init
```

3. Run app (frontend + backend)

```bash
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## Available Scripts

- `npm run dev` - starts frontend and backend via `dev.sh`
- `npm run dev:both` - starts both processes with `concurrently`
- `npm run dev:backend` - backend only (`tsx watch backend/server.ts`)
- `npm run dev:frontend` - frontend only (`vite` in `frontend/`)
- `npm run db:init` - initialize/reset database schema + seed
- `npm run build` - build frontend
- `npm run preview` - preview frontend build
- `npm start` - runs `db:init`, then starts backend

## Authentication and Accounts

### Teacher login

- Login page: `/`
- Seeded teacher usernames:
  - `sarah_b`
  - `james_ob`
  - `priya_s`

### Student login

- Student login page: `/student/login?class=<classId>&assignment=<assignmentId>`
- Student assignment page: `/student/assignment/<classId>/<assignmentId>`
- Seeded student usernames:
  - `alice_j`, `bob_m`, `chloe_p`, `david_n`, `emma_w`, `felix_c`, `grace_t`, `henry_d`

Important password behavior:

- Student seed hashes start from a shared default hash, but migrations convert students to random generated passwords and store teacher-viewable plaintext passwords.
- Teachers can view/update student passwords in the class info credential tools.

### Admin login

- Admin login page: `/admin`
- Default admin credentials:
  - Username: `admin`
  - Password: `adminMetrics!`

## API Surface (High-Level)

Base route groups:

- `/api/auth` - teacher/student/admin login and student password management
- `/api/classes` - class CRUD, enrollment, assignment CRUD, grades, class metrics
- `/api/ai` - tutor chat, PDF text extraction, question generation, batch question updates
- `/api/student` - JWT-protected student assignment payload + submission
- `/api/admin` - JWT-protected read-only admin analytics endpoints

Health check:

- `GET /health`

## Data and Grading Notes

- Assignments support multiple attempts with configurable keep policy (`latest`, `highest`, `average`).
- Per-attempt results are stored in `student_assignment_attempt_grades`.
- Aggregate grade values are persisted in `student_grades`.
- Weekly metrics snapshots are stored in `student_metrics`.
- PDFs are currently processed for AI context but not stored permanently.

## Known Limitations

- Assignment PDF download endpoint intentionally returns 404 (`/api/classes/assignments/:assignmentId/pdf`).
- Some analytics values (for example engagement) currently use simplified scoring behavior and can be refined.

## Troubleshooting

### Database connection errors

- Confirm `DATABASE_URL` in `.env`
- Re-run:

```bash
npm run db:init
```

### AI endpoints failing

- Confirm `GROQ_API_KEY` is set
- Confirm backend is running on the expected port

### Port conflicts

- Change backend `PORT` in `.env`
- If needed, adjust frontend API override (`VITE_API_URL`) in your environment