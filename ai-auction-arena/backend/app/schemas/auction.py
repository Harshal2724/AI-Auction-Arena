from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.models.auction import AuctionType, AuctionStatus, FranchiseControl


class FranchiseOut(BaseModel):
    id: int
    name: str
    short_name: str
    is_official_ipl_team: bool
    model_config = ConfigDict(from_attributes=True)


class RoomCreate(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    auction_type: AuctionType = AuctionType.MINI
    total_purse: float = Field(default=120.0, gt=0, le=10000)
    max_squad_size: int = Field(default=25, ge=5, le=50)
    min_squad_size: int = Field(default=18, ge=1, le=50)
    max_overseas_players: int = Field(default=8, ge=0, le=25)
    max_human_managers_per_franchise: int = Field(default=5, ge=1, le=5)
    bid_timer_seconds: int = Field(default=20, ge=5, le=120)
    automatic_auctioneer: bool = True
    allow_pause_resume: bool = True
    franchise_short_names: list[str] = Field(min_length=2, max_length=10)
    human_controlled_short_names: list[str] = Field(default_factory=list)


class RoomFranchiseOut(BaseModel):
    id: int
    franchise: FranchiseOut
    control_type: FranchiseControl
    bot_difficulty: str
    bot_personality: str
    starting_purse: float
    remaining_purse: float

    model_config = ConfigDict(from_attributes=True)


class RoomOut(BaseModel):
    id: int
    name: str
    auction_type: AuctionType
    status: AuctionStatus
    total_purse: float
    max_squad_size: int
    min_squad_size: int
    max_overseas_players: int
    max_human_managers_per_franchise: int
    bid_timer_seconds: int
    automatic_auctioneer: bool
    allow_pause_resume: bool
    created_at: datetime
    franchises: list[RoomFranchiseOut]

    model_config = ConfigDict(from_attributes=True)
