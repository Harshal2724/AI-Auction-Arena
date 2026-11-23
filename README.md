# AI Auction Arena

A browser-based cricket auction simulator prototype with configurable franchises, independent rule-based AI bidders, a player pool importer, live auction controls, and save/resume support.

## Current build: playable MVP (v0.2.0)

### Included
- 2–10 franchises per auction; select 1–10 human-controlled franchises and fill the rest with AI bots.
- Mini and mega auction room presets.
- Configurable purse, minimum/maximum squad size, overseas limit, bid timer and AI difficulty.
- Rule-based AI franchise strategy: role-gap analysis, personality modifiers, budget reserve, squad capacity and overseas eligibility.
- Live bid history, team purse/squad table, close-lot and unsold handling.
- Automatic lot close timer (when enabled).
- CSV import in browser fallback; PDF, CSV and XLSX extraction through the backend.
- Browser autosave plus backend database snapshots when the API is running.
- Demo player pool so no cricket API key is required to try the simulator.

### Important limitations
- The included demo player names are fictional sample entries, not a verified IPL auction list.
- The current AI is a deterministic rules-based simulator, not an LLM-powered cricket scout. Its valuations and strategy are a first-pass game model.
- PDF parsing is best-effort. Scanned/image-only PDFs need OCR, which is not included. Always review extracted players and base prices before starting.
- Multiplayer rooms, accounts, real-time multi-device synchronization, co-manager invitations and external cricket-data provider integration are not implemented in this MVP yet.
- Backend snapshots are stored in PostgreSQL in Docker, or SQLite when running the backend directly. Browser localStorage is used as an offline fallback.

## Run locally with Docker

Requirements: Docker Desktop with Compose.

```bash
unzip ai-auction-arena.zip
cd ai-auction-arena
docker compose up --build
```

Open:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- API docs: http://localhost:8000/docs

The first start installs frontend/backend dependencies and initializes the database with the 10 IPL franchise names. The app can be played in demo mode without an external cricket-data API key.

## Run without Docker

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

By default the backend uses a local SQLite database (`auction_arena.db`). Set `DATABASE_URL` to a PostgreSQL URL to use PostgreSQL.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The frontend expects the API at http://localhost:8000/api by default.

## Player import format

CSV/XLSX column names can include:

- `name` or `player_name`
- `country` or `nationality`
- `role` or `player_role`
- `base_price` or `price`
- `style` or `bowling_style`
- `previous_team`

Base prices should be entered in crore. Values such as `50 lakh` are converted to `0.50` crore by the backend importer. PDF table extraction uses column headers where available; review the import result.

## Backend endpoints

- `GET /api/health`
- `GET /api/franchises`
- `POST /api/rooms`
- `GET /api/rooms/{room_id}`
- `GET /api/games`
- `PUT /api/games/{game_id}`
- `DELETE /api/games/{game_id}`
- `POST /api/imports/players` (multipart file upload)

## Project layout

```text
ai-auction-arena/
├── backend/       FastAPI, SQLAlchemy models, room and snapshot APIs, file import
├── frontend/      React/Vite application and auction interface
├── docker-compose.yml
└── README.md
```


## Deploy publicly on Render

This repository includes `render.yaml` and a production Dockerfile. The deployment serves the React app and FastAPI API from one origin.

1. Push this folder to a GitHub repository.
2. Connect GitHub and Render, then create a new **Blueprint** in Render using that repository.
3. Review the services and database before applying. The included free database is for evaluation only and may have provider-imposed expiry/availability limits; select a durable paid database before relying on it for long-term auction saves.
4. After deployment, open the generated `onrender.com` URL. The health endpoint is `/api/health`.

No cricket API key is required for demo mode. The current bot strategy is rules-based; live multiplayer and Gemini-powered advanced strategy are not part of this MVP.
