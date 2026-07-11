# HealthOS

HealthOS is a personal health consultant web app. Users upload medical reports (PDFs or images), the app extracts and flags lab/vital values, tracks a running health score, and offers an AI chat assistant that can answer questions using the user's own health history.

## Features

- **Auth** — signup/login with hashed passwords and JWT-based sessions.
- **Report upload & analysis** — PDF and image reports are parsed (with OCR fallback for scanned documents), key values (cholesterol, glucose, blood pressure, etc.) are extracted and flagged as normal / high / low / urgent.
- **Dashboard** — an overall health score plus a short list of plain-language insights generated from the user's latest data.
- **Chat assistant** — a health-context-aware chatbot that can discuss a specific report or general health questions, using the user's profile, recent lab values, and name.
- **Profile** — stores age, sex, height, weight, conditions, and medications.

AI features (report analysis, dashboard insights, chat replies) call the Fireworks AI API when `FIREWORKS_API_KEY` is set. Without a key, the app falls back to deterministic, rule-based logic so it still works end to end.

## Tech stack

**Backend**
- FastAPI + SQLAlchemy
- PostgreSQL (uses native `UUID` columns, so Postgres is required — SQLite is not supported as-is)
- JWT auth
- Fireworks AI (LLM calls), pypdf / pdf2image / pytesseract (report text extraction & OCR)

**Frontend**
- React 19 + Vite
- React Router
- Tailwind CSS
- lucide-react icons

## Project structure

```
healthos/
├── app/
│   ├── main.py              # FastAPI app, CORS, router registration
│   ├── config.py            # Settings loaded from .env
│   ├── database.py          # SQLAlchemy engine/session
│   ├── models.py            # ORM models
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth.py               # Password hashing, JWT, get_current_user
│   ├── ai_tools.py          # Report analysis, health score, chat logic
│   ├── cache.py              # Simple in-process response/AI caching
│   └── routers/
│       ├── auth.py
│       ├── users.py
│       ├── reports.py
│       ├── chat.py
│       └── dashboard.py
├── uploads/                  # Uploaded report files (created at runtime)
├── tests/
├── .env                       # Backend environment variables (not committed)
└── healthos-frontend/
    ├── src/
    │   ├── pages/            # Dashboard, Reports, ReportResults, Chat, Profile, Login, Signup
    │   ├── components/       # NavBar, PageShell, ProtectedRoute, etc.
    │   ├── context/          # AuthContext
    │   └── api/client.js     # Backend API client
    └── .env                   # Frontend environment variables (not committed)
```

## Local setup

### Backend

```bash
cd healthos
uv sync                       # or: pip install -e . / pip install -r requirements.txt
```

Create `healthos/.env`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/healthos
SECRET_KEY=some-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
FIREWORKS_API_KEY=your-api-key
FIREWORKS_MODEL=accounts/fireworks/models/llama-v3p1-8b-instruct
```

Run the API:

```bash
uvicorn app.main:app --reload
```

The API is served at `http://localhost:8000`, with routes under `/api`.

### Frontend

```bash
cd healthos-frontend
npm install
```

Create `healthos-frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api
```

Run the dev server:

```bash
npm run dev
```

The app is served at `http://localhost:5173`.

## Environment variables reference

| File | Variable | Purpose |
|---|---|---|
| `healthos/.env` | `DATABASE_URL` | Postgres connection string |
| `healthos/.env` | `SECRET_KEY` | JWT signing secret |
| `healthos/.env` | `ALGORITHM` | JWT algorithm (`HS256`) |
| `healthos/.env` | `ACCESS_TOKEN_EXPIRE_MINUTES` | JWT expiry |
| `healthos/.env` | `FIREWORKS_API_KEY` | Optional — enables AI-generated analysis/chat |
| `healthos/.env` | `FIREWORKS_MODEL` | Fireworks model id |
| `healthos-frontend/.env` | `VITE_API_URL` | Base URL the frontend calls for the API |

## Notes

- Uploaded report files are saved to `uploads/` on the backend's local disk. If you redeploy or move the backend without carrying this folder, "view original file" will 404 for older reports (the extracted summary/values still work, since those are in the database).
- CORS origins are currently hardcoded in `app/main.py` to local dev URLs — update this before deploying (see Deployment below).
