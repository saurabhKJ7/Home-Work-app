## Home-Work-app

An educational platform where teachers create/share activities (math, logic, grid) and students complete them. Backend: FastAPI + SQLAlchemy + Postgres; RAG over Pinecone helps generate problems and test cases. Frontend: React (Vite + TypeScript + shadcn/ui).

Live Url: https://home-work-nlo3.onrender.com/

### Quick start

1) Backend

```bash
python -m venv .venv && . .venv/Scripts/activate  # Windows PowerShell; use source .venv/bin/activate on Unix
pip install -r backend/requirements.txt
```

Create `.env` in the repo root (see env vars below), then run:

```bash
uvicorn backend.main:app --reload --port 8000
```

2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server runs on `http://localhost:8080`. The Vite dev proxy forwards calls from `/api/*` to `http://localhost:8000` (see `frontend/vite.config.ts`). The frontend’s API base is `VITE_API_BASE_URL` or falls back to `/api` (see `frontend/src/lib/api.ts`).

### Environment variables

Put these in a repo-root `.env` for the backend (set what you need; reasonable defaults exist for dev):

```env
# Backend
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/homework
SECRET_KEY=dev-secret
ACCESS_TOKEN_EXPIRE=60
FRONTEND_URL=http://localhost:8080

# LLM / Embeddings (as needed)
OPENAI_API_KEY=...
PINECONE_API_KEY=...
# Optional
LANGCHAIN_API_KEY=...
E2B_API_KEY=...
```

For the frontend, optionally create `frontend/.env`:

```env
VITE_API_BASE_URL=/api  # leave as /api to use Vite proxy in dev; set to full URL in prod
```

### Database

- SQLAlchemy auto-creates tables on backend startup.


### Pinecone and data ingestion (optional)

- Populate the Pinecone index (`home-work`) for better RAG:
  - From Excel: `backend/update_pinecone.py` uses `text-to-function(evaluation).xlsx`.
  - From JSON: `backend/ingest_json_to_pinecone.py` uses `backend/data/text_to_function.json`.

Example (Excel → Pinecone):

```bash
cd backend
python update_pinecone.py
```

### Running tests

Use the helper runner:

```bash
cd backend
python run_tests.py
```

This boots the API on port `8000` and runs tests in `backend/tests/` (endpoints, RAG, validation).

### API overview (condensed)

- `GET /health` – health check
- Auth: `POST /auth/register`, `POST /auth/login` (OAuth2 password flow), `GET /auth/me`
- Content generation: `POST /generate-code`, `POST /meta-validate`, `POST /validate-function`, `POST /feedback-answer`
- Activities: `POST /activities` (teacher), `GET /activities`, `GET /activities/{id}`, `DELETE /activities/{id}` (teacher)
- Attempts: `POST /activities/{id}/attempts` (student)

JWT-based auth and role checks are enforced; set `FRONTEND_URL` for CORS.