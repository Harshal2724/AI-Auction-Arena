from fastapi import HTTPException
from sqlalchemy.orm import Session, joinedload
from app.models.auction import AuctionRoom, Franchise, RoomFranchise, FranchiseControl
from app.schemas.auction import RoomCreate


def create_room(db: Session, payload: RoomCreate) -> AuctionRoom:
    if payload.min_squad_size > payload.max_squad_size:
        raise HTTPException(status_code=422, detail="Minimum squad size cannot exceed maximum squad size.")
    if len(set(payload.franchise_short_names)) != len(payload.franchise_short_names):
        raise HTTPException(status_code=422, detail="A franchise can only be added once to a room.")
    if not set(payload.human_controlled_short_names).issubset(set(payload.franchise_short_names)):
        raise HTTPException(status_code=422, detail="Human-controlled franchises must be included in the room.")

    franchises = db.query(Franchise).filter(Franchise.short_name.in_(payload.franchise_short_names)).all()
    found = {f.short_name for f in franchises}
    missing = set(payload.franchise_short_names) - found
    if missing:
        raise HTTPException(status_code=404, detail=f"Unknown franchise(s): {', '.join(sorted(missing))}")

    room = AuctionRoom(
        name=payload.name,
        auction_type=payload.auction_type,
        total_purse=payload.total_purse,
        max_squad_size=payload.max_squad_size,
        min_squad_size=payload.min_squad_size,
        max_overseas_players=payload.max_overseas_players,
        max_human_managers_per_franchise=payload.max_human_managers_per_franchise,
        bid_timer_seconds=payload.bid_timer_seconds,
        automatic_auctioneer=payload.automatic_auctioneer,
        allow_pause_resume=payload.allow_pause_resume,
    )
    db.add(room)
    db.flush()
    by_short_name = {f.short_name: f for f in franchises}
    for short_name in payload.franchise_short_names:
        control = FranchiseControl.HUMAN if short_name in payload.human_controlled_short_names else FranchiseControl.BOT
        db.add(RoomFranchise(
            room_id=room.id,
            franchise_id=by_short_name[short_name].id,
            control_type=control,
            starting_purse=payload.total_purse,
            remaining_purse=payload.total_purse,
            bot_difficulty="realistic",
            bot_personality="balanced",
        ))
    db.commit()
    return get_room(db, room.id)


def get_room(db: Session, room_id: int) -> AuctionRoom:
    room = (
        db.query(AuctionRoom)
        .options(joinedload(AuctionRoom.franchises).joinedload(RoomFranchise.franchise))
        .filter(AuctionRoom.id == room_id)
        .first()
    )
    if not room:
        raise HTTPException(status_code=404, detail="Auction room not found.")
    return room
