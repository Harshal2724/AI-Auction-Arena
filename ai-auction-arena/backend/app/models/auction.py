import enum
from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class AuctionType(str, enum.Enum):
    MINI = "mini"
    MEGA = "mega"


class AuctionStatus(str, enum.Enum):
    SETUP = "setup"
    READY = "ready"
    LIVE = "live"
    PAUSED = "paused"
    COMPLETED = "completed"


class FranchiseControl(str, enum.Enum):
    HUMAN = "human"
    BOT = "bot"


class AuctionRoom(Base):
    __tablename__ = "auction_rooms"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    auction_type: Mapped[AuctionType] = mapped_column(Enum(AuctionType), default=AuctionType.MINI)
    status: Mapped[AuctionStatus] = mapped_column(Enum(AuctionStatus), default=AuctionStatus.SETUP)
    total_purse: Mapped[float] = mapped_column(Numeric(10, 2), default=120.00)
    max_squad_size: Mapped[int] = mapped_column(Integer, default=25)
    min_squad_size: Mapped[int] = mapped_column(Integer, default=18)
    max_overseas_players: Mapped[int] = mapped_column(Integer, default=8)
    max_human_managers_per_franchise: Mapped[int] = mapped_column(Integer, default=5)
    bid_timer_seconds: Mapped[int] = mapped_column(Integer, default=20)
    automatic_auctioneer: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_pause_resume: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    franchises: Mapped[list["RoomFranchise"]] = relationship(back_populates="room", cascade="all, delete-orphan")


class Franchise(Base):
    __tablename__ = "franchises"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    short_name: Mapped[str] = mapped_column(String(12), unique=True, nullable=False)
    is_official_ipl_team: Mapped[bool] = mapped_column(Boolean, default=False)


class RoomFranchise(Base):
    __tablename__ = "room_franchises"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    room_id: Mapped[int] = mapped_column(ForeignKey("auction_rooms.id", ondelete="CASCADE"), nullable=False)
    franchise_id: Mapped[int] = mapped_column(ForeignKey("franchises.id"), nullable=False)
    control_type: Mapped[FranchiseControl] = mapped_column(Enum(FranchiseControl), default=FranchiseControl.BOT)
    bot_difficulty: Mapped[str] = mapped_column(String(20), default="realistic")
    bot_personality: Mapped[str] = mapped_column(String(30), default="balanced")
    starting_purse: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    remaining_purse: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    room: Mapped[AuctionRoom] = relationship(back_populates="franchises")
    franchise: Mapped[Franchise] = relationship()

class AuctionGameSnapshot(Base):
    """Serialized game state for pause/resume and cross-device recovery."""
    __tablename__ = "auction_game_snapshots"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    room_id: Mapped[int | None] = mapped_column(ForeignKey("auction_rooms.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="setup", nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
