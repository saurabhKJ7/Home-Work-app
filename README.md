# Home-Work-app

## Run

Backend

1. Create `.env` with keys (see `.env.example`).
2. Install deps: `pip install -r backend/requirements.txt`.
3. Start: `uvicorn backend.main:app --reload --port 8000`.

Frontend

1. `cd frontend && npm i`.
2. `npm run dev` (defaults to http://localhost:8080).

Set `VITE_API_BASE_URL` if backend runs on a different URL.