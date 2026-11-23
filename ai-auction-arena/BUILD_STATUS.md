# Build status – November 2026

## Implemented in this MVP
- Responsive React/Vite web interface with auction setup, player pool, live room, franchise table, bid log and saved rooms.
- 10 IPL franchise presets; selectable human-controlled teams and AI-controlled teams.
- Mini/mega format settings, budgets, squad limits, overseas limit and countdown setting.
- Rules-based bot bidding with role-need analysis, configurable difficulty/personality modifiers and budget/squad/overseas checks.
- Manual human bidding, AI bid step, close lot, unsold handling, automatic countdown lot closure, pause/resume.
- Browser localStorage autosave and backend JSON snapshots.
- CSV browser fallback and backend CSV/XLSX/PDF import endpoint.
- Sample CSV template and demo player pool.

## Verified
- Python backend compiles.
- FastAPI smoke tests passed using SQLite: health, franchise list, room creation, game save/list/delete and CSV import.
- XLSX import smoke test passed; lakh prices convert to crore.
- Text-based PDF table fallback smoke test passed; lakh prices convert to crore.
- TypeScript compiler parsed the JSX files without syntax errors (`tsc --allowJs --checkJs false --jsx react-jsx --noEmit --noResolve --skipLibCheck`).

## Not verified / not yet implemented
- Vite production bundle and browser interaction tests could not be run in this environment because npm package installation timed out and the npm cache did not contain dependencies.
- Docker image build/deployment was not run here.
- Multi-user login, invitations, WebSocket multiplayer and up to five co-managers per franchise are not yet implemented.
- Live cricket API provider integration is not configured; demo mode requires no API key.
- PDF extraction is best-effort for text/table PDFs. Scanned PDFs require OCR and should be reviewed after import.
- AI opponents currently use a deterministic rules-based strategy, not Gemini/LLM reasoning.


## Public deployment preparation
- Added a multi-stage production Dockerfile that builds React and serves the frontend through FastAPI.
- Added a Render Blueprint for the web service and PostgreSQL database.
- Updated production API routing to same-origin `/api` and normalized managed PostgreSQL URLs for psycopg v3.
- Public deployment still requires the user's Render/GitHub connections and approval of hosting/database plan costs.
