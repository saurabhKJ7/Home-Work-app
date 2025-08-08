### Mandatory integrations (MVP)

- ✅ Backend: enable CORS for dev (http://localhost:8080)
  - Add `CORSMiddleware` in `backend/main.py` with appropriate origins, methods, headers
- ✅ Backend: define JSON request/response models
  - In `backend/models/schema.py`: `GenerateCodeRequest { user_query: str }`
  - `FeedbackRequest { user_query: str; generated_function: str; submission: any }`
  - Optionally: typed submissions per activity type (Grid/Math/Logic)
- ✅ Backend: update endpoints to use models and return consistent shapes
  - `POST /generate-code` → body: `GenerateCodeRequest` → returns `{ code: string }`
  - `POST /feedback-answer` → body: `FeedbackRequest` → returns `{ is_correct: boolean, feedback: string, confidence_score: number }`
- ✅ Frontend (Teacher): wire “Generate Activity” to backend
  - Replace mock `setTimeout` in `frontend/src/pages/TeacherDashboard.tsx` with `POST /generate-code`
  - Store returned `code` with the preview activity (e.g., `content.validationFunction`)
- ✅ Frontend (Student): wire “Submit Activity” to backend
  - In `frontend/src/pages/ActivityDetail.tsx`, on submit call `POST /feedback-answer` with `{ user_query, generated_function, submission }`
  - Display backend `feedback` and `confidence_score` alongside current local score

### Backend hardening

- ✅ Rename `get_evulate_function` → `get_evaluate_function` in `backend/src/llm_chain.py` and update imports
- ✅ LLMChain output handling
  - Ensure `invoke()` text is extracted (string) and returned as `{ code }`
  - Make `feedback_function` robust to LangChain return types; safely parse JSON
- [ ] Retrieval/Pinecone stability
  - Standardize SDK usage to current `pinecone` client; read `PINECONE_INDEX` from env
  - Map Pinecone matches to RAG examples format expected by the prompt
  - Guard retrieval with try/except and graceful empty result fallback

### Database integration

- ✅ Add Postgres dependency and SQLAlchemy models (`Activity`, `Attempt`)
- ✅ Create DB session and Base setup
- ✅ Add CRUD endpoints for activities and attempts
- ✅ Fill `backend/src/prompt_templates.py` or centralize prompts in one place
- ✅ Configure CORS origins, methods, headers explicitly (GET, POST, OPTIONS)

### Frontend integration utilities

- ✅ Create simple API client (or React Query mutations) with base URL `VITE_API_BASE_URL` (default `http://localhost:8000`)
- [ ] Optional: Vite dev proxy to backend to avoid CORS in dev
- ✅ Add a health check call (GET `/health`) and toast if backend unavailable

### Payload alignment (UI ↔ API)

- [ ] Align `FeedbackRequest.submission` with UI shapes:
  - Grid-based: `number[][]`
  - Mathematical: `{ [id: string]: number }`
  - Logical: `{ [id: string]: string | number }`
- [ ] (If keeping test cases path) implement server-side transformation between submissions and test cases/expected outcomes

### Dependencies, env, docs

- ✅ Clean `backend/requirements.txt` (dedupe, pin versions; unify `langchain_openai` vs `langchain.embeddings`)
- ✅ Add `.env.example` with required keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` (optional), `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT` (if needed), `PINECONE_INDEX`, `VITE_API_BASE_URL`
- ✅ Update `README.md` with run instructions (backend + frontend) and env setup

### Testing & safety (next)

- [ ] Add FastAPI tests for `/generate-code` and `/feedback-answer` using TestClient with mocked LLM/Pinecone
- [ ] Plan safe execution for generated JS (PyMiniRacer/Deno sandbox) for future server-side validation
- [ ] Add basic frontend error handling (loading, error toasts) for both calls

### Optional enhancements

- [ ] Persist activities and attempts in a DB (CRUD endpoints)
- [ ] Use React Query for mutations/queries and cache invalidation
- [ ] Implement LangSmith tracing or remove unused references
- [ ] Consolidate prompt templates and RAG example formatting library

