# LyrningLMS

## App Summary

LyrningLMS addresses the growing problem of AI dependency in teenagers by creating a learning environment where AI is strategically integrated to promote genuine understanding rather than enable shortcuts. The platform empowers teachers to create assignments, quizzes, labs, and projects while embedding Google's Gemini API with strict guardrails that prevent students from simply copying AI output. Instead, the AI serves as a controlled learning tool that teachers can configure with specific restrictions and guidance parameters, ensuring it supports learning rather than replacing it. Teachers gain visibility into student metrics including understanding level, engagement, and AI dependency—measuring exactly how much each student relies on the chatbot feature. This data-driven approach allows educators to identify students who are becoming over-reliant on AI and adjust their support accordingly. By combining assignment management with intelligent AI monitoring, LyrningLMS helps students develop independent problem-solving skills while safely leveraging AI as a learning aid, not a crutch.

## Tech Stack

**Frontend:**
- React with TypeScript
- Vite (build tool and dev server)
- Modern component-based architecture

**Backend:**
- Node.js runtime
- Express.js (REST API framework)
- PostgreSQL (relational database)

**External Services & APIs:**
- Google Gemini API (AI-powered learning assistance)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
│                    (Teacher/Student)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    React Frontend                                │
│            (TypeScript + Vite Components)                        │
│  - Assignment Management   - Student Grades                      │
│  - Quiz Interface          - Learning Metrics                    │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API Calls
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               Express.js Backend Server                          │
│                    (Node.js)                                     │
│  - Assignment API    - Student API                              │
│  - Quiz API          - Gemini Integration                       │
└────┬───────────────────────────────────────────────────────┬────┘
     │ SQL Queries                                           │ API Calls
     ▼                                                       ▼
┌──────────────────┐                          ┌──────────────────────┐
│   PostgreSQL     │                          │  Google Gemini API   │
│    Database      │                          │   (AI Assistance)    │
└──────────────────┘                          └──────────────────────┘
```

## Prerequisites

To run LyrningLMS locally, ensure you have the following software installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org)
  - Verify installation: `node --version`
- **npm** (comes with Node.js)
  - Verify installation: `npm --version`
- **PostgreSQL** (v12 or higher) - [Download here](https://www.postgresql.org/download/)
  - Verify installation: `psql --version`
  - Ensure `psql` is available in your system PATH
- **Google Gemini API Key** - [Get one here](https://ai.google.dev)

## Installation and Setup

1. **Clone the repository and navigate to the project directory:**
   ```bash
   cd LyrningLMS
   ```

2. **Install frontend dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   - Create a `.env.local` file in the root directory
   - Add your Gemini API key:
     ```
     VITE_GEMINI_API_KEY=your_gemini_api_key_here
     ```

4. **Set up the database (when backend is ready):**
   ```bash
   createdb lyrninglms
   psql -d lyrninglms -f schema.sql
   psql -d lyrninglms -f seed.sql
   ```

5. **Configure backend environment variables (when backend is ready):**
   - Create a `.env` file in the backend directory with:
     ```
     DATABASE_URL=postgresql://username:password@localhost:5432/lyrninglms
     GEMINI_API_KEY=your_gemini_api_key_here
     PORT=5000
     ```

## Running the Application

### Frontend Only (Current State)

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open your browser and navigate to:**
   ```
   http://localhost:5173
   ```

### Full Application (When Backend is Complete)

1. **Start the backend server:**
   ```bash
   # From the backend directory
   npm start
   ```
   The backend will be available at `http://localhost:5000`

2. **In a new terminal, start the frontend:**
   ```bash
   npm run dev
   ```

3. **Open your browser to:**
   ```
   http://localhost:5173
   ```

## Verifying the Vertical Slice

Once the full application is complete with backend and database, follow these steps to verify core functionality:

1. **Create an Assignment (Teacher):**
   - Log in as a teacher
   - Navigate to the Assignment Editor
   - Create a new assignment with AI restrictions and guidance parameters
   - Set constraints on how the Gemini AI will respond
   - Save the assignment

2. **Submit Work and Interact with AI (Student):**
   - Log in as a student
   - Navigate to the assignment
   - Write a response or answer to the assignment prompt
   - Request AI assistance and verify the AI responds within the teacher's configured restrictions
   - Submit your work

3. **Verify Database Persistence:**
   - Query the database directly to confirm the assignment and submission were saved:
     ```bash
     psql -d lyrninglms -c "SELECT * FROM assignments;"
     psql -d lyrninglms -c "SELECT * FROM submissions;"
     ```

4. **Verify Data Persistence After Refresh:**
   - Refresh the browser
   - Navigate back to the assignment
   - Confirm your submission and AI interaction history are still present
   - Verify the teacher can see the student's submission in the grading interface
