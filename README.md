# Home-Work-app

## Run

Backend

1. Create `.env` with keys (see `.env.example`).
2. Install deps: `pip install -r backend/requirements.txt`.
3. Set `DATABASE_URL=postgresql+psycopg2://USER:PASS@HOST:PORT/DBNAME` in `.env`.
4. Start: `uvicorn backend.main:app --reload --port 8000`.

Frontend

1. `cd frontend && npm i`.
2. `npm run dev` (defaults to http://localhost:8080).

Set `VITE_API_BASE_URL` if backend runs on a different URL.

## Database schema (for pgAdmin)

Run these SQL statements to create tables:

```sql
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  worksheet_level TEXT NOT NULL,
  type TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  problem_statement TEXT NOT NULL,
  ui_config JSONB,
  validation_function TEXT,
  correct_answers JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attempts (
  id TEXT PRIMARY KEY,
  activity_id TEXT NOT NULL,
  submission JSONB NOT NULL,
  is_correct TEXT NOT NULL DEFAULT 'false',
  score_percentage TEXT NOT NULL DEFAULT '0',
  feedback TEXT,
  confidence_score TEXT NOT NULL DEFAULT '0',
  time_spent_seconds TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attempts_activity_id ON attempts(activity_id);
```