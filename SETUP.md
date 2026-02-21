# Lyrning LMS - Setup & Running Guide

## Prerequisites

1. **Node.js** (v18+)
2. **PostgreSQL** database running locally
3. The database credentials in `.env` should match your PostgreSQL setup

## Database Setup

1. Create the database:
   ```bash
   createdb lyrning
   ```

2. Run the schema to create tables:
   ```bash
   psql -U postgres -d lyrning -f backend/db/schema.sql
   ```

3. Seed the database with test data:
   ```bash
   psql -U postgres -d lyrning -f backend/db/seed.sql
   ```

## Installation

Install all dependencies:
```bash
npm install
```

## Environment Variables

The `.env` file is already configured for local development:
```
DATABASE_URL=postgresql://postgres:admin@localhost:5432/lyrning
PORT=4000
NODE_ENV=development
```

Adjust `DATABASE_URL` if your PostgreSQL credentials are different.

## Running the Application

### Option 1: Run Both Backend & Frontend Together
```bash
npm run dev
```
This runs the backend server on `http://localhost:4000` and frontend on `http://localhost:5173`

### Option 2: Run Them Separately
Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

## Login Credentials

After seeding, you can log in with:

**Students:**
- Username: `jsmith`, `sjohnson`, `mwilliams`, or `ebrown`
- Password: `password123`

**Teachers:**
- Username: `rdavis`, `jmiller`, `dwilson`, or `landerson`
- Password: `password123`

## Project Structure

```
├── backend/
│   ├── db/
│   │   ├── connection.ts     # Database connection pool
│   │   ├── schema.sql        # Database schema
│   │   └── seed.sql          # Test data
│   ├── routes/
│   │   └── auth.ts           # Authentication endpoints
│   ├── types.ts              # TypeScript interfaces
│   ├── server.ts             # Express server
│   └── tsconfig.json         # Backend TypeScript config
├── frontend/
│   ├── components/           # React components
│   ├── services/             # Services (Gemini API, etc.)
│   ├── index.tsx             # Frontend entry point
│   └── types.ts              # Frontend types
├── package.json
├── .env                      # Environment variables (local)
└── .env.example              # Environment template
```

## API Endpoints

### Authentication
- **POST** `/api/auth/login` - Authenticate a user

Request body:
```json
{
  "username": "jsmith",
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
  "userName": "jsmith",
  "firstName": "John",
  "lastName": "Smith",
  "email": "john.smith@example.com"
}
```

## Troubleshooting

### Backend connection error
- Make sure PostgreSQL is running
- Check that the database exists: `psql -l | grep lyrning`
- Verify database credentials in `.env`

### Port already in use
- Backend defaults to port 4000, frontend to 5173
- To change, update `.env` (backend) or `frontend/vite.config.ts` (frontend)

### CORS errors
- The backend CORS is configured to allow requests from `http://localhost:5173`
- For other origins, update the CORS middleware in `backend/server.ts`
