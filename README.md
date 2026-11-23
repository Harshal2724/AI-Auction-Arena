# Backend

FastAPI foundation for AI Auction Arena.

## Local setup

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

The default database URL can be set to SQLite for a quick local run. Docker Compose uses PostgreSQL.
