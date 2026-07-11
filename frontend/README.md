# HealthOS — Frontend

React + Vite + Tailwind v4. Talks to your existing FastAPI backend — no mock data, every page calls a real endpoint.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` if your backend isn't on the default:
```
VITE_API_URL=http://localhost:8000/api
```

## Run

```bash
npm run dev
```

Opens on `http://localhost:5173` by default. Your backend needs to be running separately (`uvicorn app.main:app --reload` in the `backend/` folder) with CORS allowing this origin — check `main.py`'s `allow_origins` list includes `http://localhost:5173`.

## Pages

| Route | Notes |
|---|---|
| `/login`, `/signup` | Auth. Signup redirects straight to `/profile` with the completion banner. |
| `/dashboard` | Health score, insight feed, recent reports, medications — all live data. |
| `/profile` | Full health profile form. Partial updates — only changed fields are sent. |
| `/upload` | Drag-and-drop, client-side file type validation, waits for real analysis. |
| `/reports` | Full history list, backed by `GET /reports`. |
| `/reports/:id` | Summary, flagged values, "Ask HealthOS about this" → opens chat with report context. |
| `/chat?report=<id>` | The `report` query param threads report context into the chat request automatically. |

## Design notes

- Deliberately not the generic dark-navy SaaS look — deep slate-teal, monospaced numerals for real data (health score, lab values) so they read like actual readouts, and one signature element: the animated pulse-line on the dashboard hero. Everything else stays quiet around it.
- `src/lib/icons.js` maps the dashboard's `insight.icon` field to a component with a safe fallback — new icon values from the backend won't break rendering, matching the "treat as an open set" note from the frontend handoff doc.
- 401 responses from any API call automatically clear the session (see `src/api/client.js`'s `registerUnauthorizedHandler`) — no per-page handling needed.

## Known gaps (intentionally not built)

- Emergency check-in / escalation modals — backend doesn't have this endpoint yet, deliberately left out rather than built against a guess.
- Chat doesn't yet render Markdown — matches the backend team's decision to have the AI reply in plain text instead.

## Deploying

Static build: `npm run build` outputs to `dist/`. Deployable to Vercel, Netlify, or any static host — just set `VITE_API_URL` to your deployed backend's URL as a build-time environment variable on whichever platform you use.
