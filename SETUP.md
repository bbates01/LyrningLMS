# Lyrning LMS - Setup & Running Guide

## Prerequisites

1. **Node.js** (v18+)
2. No separate database server — the app uses **SQLite** (a single file in `backend/db/`).

## Installation

Install all dependencies:

```bash
npm install
```

## Database Setup

Initialize the SQLite database (creates tables and seed data):

```bash
npm run db:init
```

This creates (or resets) `backend/db/lyrning.sqlite`. Run it again anytime to reset the DB to a fresh seeded state.

## Environment Variables

Copy `.env.example` to `.env` and adjust if needed:

```
SQLITE_DB_PATH=./backend/db/lyrning.sqlite
PORT=3001
VITE_API_URL=http://localhost:3001
NODE_ENV=development
```

- `SQLITE_DB_PATH` — path to the SQLite file (default: `./backend/db/lyrning.sqlite`).
- `PORT` — backend port (frontend uses `VITE_API_URL` for API calls).

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
│   │   ├── connection.ts     # SQLite connection and query helper
│   │   ├── schema.sql        # Database schema (SQLite)
│   │   ├── seed.sql          # Test data
│   │   ├── init-db.ts        # Script to create/reset DB (npm run db:init)
│   │   └── lyrning.sqlite    # SQLite database file (created by db:init)
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
