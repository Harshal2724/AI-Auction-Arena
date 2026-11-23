from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.base import Base
from app.db.session import engine
from app.models import AuctionRoom, Franchise, RoomFranchise, AuctionGameSnapshot  # noqa: F401
from app.api.routes import router

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router, prefix=settings.api_v1_prefix)


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    with engine.begin() as connection:
        from sqlalchemy import text
        count = connection.execute(text("SELECT COUNT(*) FROM franchises")).scalar_one()
        if count == 0:
            connection.execute(text("""
                INSERT INTO franchises (name, short_name, is_official_ipl_team) VALUES
                ('Mumbai Indians', 'MI', TRUE),
                ('Chennai Super Kings', 'CSK', TRUE),
                ('Royal Challengers Bengaluru', 'RCB', TRUE),
                ('Kolkata Knight Riders', 'KKR', TRUE),
                ('Sunrisers Hyderabad', 'SRH', TRUE),
                ('Rajasthan Royals', 'RR', TRUE),
                ('Punjab Kings', 'PBKS', TRUE),
                ('Delhi Capitals', 'DC', TRUE),
                ('Gujarat Titans', 'GT', TRUE),
                ('Lucknow Super Giants', 'LSG', TRUE)
            """))


# In production, serve the compiled React app from the same origin as the API.
# During local development Vite serves the frontend separately.
static_dir = Path(__file__).resolve().parents[1] / "static"
if static_dir.exists():
    app.mount("/", StaticFiles(directory=static_dir, html=True), name="frontend")
