# Lyrning LMS - Setup & Running Guide

## Prerequisites

1. **Node.js** (v20.x recommended; repo includes `.nvmrc`)
2. A **Postgres database** — in production you’ll use Neon (via `DATABASE_URL`); for local dev you can use the same Neon DB or any Postgres instance.

## Installation

Install all dependencies:

```bash
npm install
```

## Database Setup (Postgres)

Initialize the Postgres database (creates tables and seed data):

```bash
npm run db:init
```

This uses the `DATABASE_URL` Postgres connection string and runs the Postgres schema/seed. If you set `RESET_DB=true` in your env, it will drop and recreate the schema first.

## Environment Variables

Copy `.env.example` to `.env` and adjust if needed:

```env
DATABASE_URL=postgresql://neondb_owner:your_password_here@your_host_here/neondb?sslmode=require
PORT=3001
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
# Optional: set to true once to drop & reseed Postgres
RESET_DB=false
```

- `DATABASE_URL` — Postgres connection string (Neon in production).
- `PORT` — backend port (frontend calls `/api/...` on the same origin in production).

## Running the Application

### Option 1: Run Both Backend & Frontend Together

```bash
npm run dev
```

Backend runs on the port in `.env` (e.g. **3001**), frontend on **http://localhost:5173**.

### Option 2: Run Them Separately

Terminal 1 — Backend:

```bash
npm run dev:backend
```

Terminal 2 — Frontend:

```bash
npm run dev:frontend
```

## Login Credentials

After seeding, you can log in with (password for all: **password123**):

**Students:** `alice_j`, `bob_m`, `chloe_p`, `david_n`, `emma_w`, `felix_c`, `grace_t`, `henry_d`

**Teachers:** `sarah_b`, `james_ob`, `priya_s`

## Project Structure

```
├── backend/
│   ├── db/
│   │   ├── connection.ts     # Postgres connection and query helper (pg Pool)
│   │   ├── schema.pg.sql     # Database schema (Postgres)
│   │   ├── seed.pg.sql       # Test data for Postgres
│   │   ├── schema.sql        # Legacy SQLite schema (no longer used in production)
│   │   ├── seed.sql          # Legacy SQLite seed (no longer used in production)
│   │   └── init-db.ts        # Script to create/reset Postgres schema (npm run db:init)
│   ├── routes/
│   ├── types.ts
│   ├── server.ts
│   └── tsconfig.json
├── frontend/
│   ├── components/
│   ├── services/
│   └── ...
├── package.json
├── .env
└── .env.example
```

## API Endpoints

### Authentication

- **POST** `/api/auth/login` — Authenticate a user

Request body:

```json
{
  "username": "alice_j",
  "password": "password123",
  "userType": "student"
}
```

Response:

```json
{
  "success": true,
  "role": "student",
  "userId": 1,
  "userName": "alice_j",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice.johnson@school.edu"
}
```

## Troubleshooting

### Backend can't find the database

- Run `npm run db:init` from the project root.
- Ensure `SQLITE_DB_PATH` in `.env` points to a path the app can write to (e.g. `./backend/db/lyrning.sqlite`).

### Port already in use

- Change `PORT` in `.env` (backend) and `VITE_API_URL` if needed; frontend port is in `frontend/vite.config.ts`.

### CORS errors

- Backend CORS is set for the frontend origin (e.g. `http://localhost:5173`). For other origins, update CORS in `backend/server.ts`.
