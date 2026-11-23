from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.auction import AuctionGameSnapshot
from app.db.session import get_db
from app.models.auction import Franchise
from app.schemas.auction import FranchiseOut, RoomCreate, RoomOut
from app.services.room_service import create_room, get_room

router = APIRouter()


@router.get("/health")
def health():
    return {"status": "ok", "service": "ai-auction-arena-api", "phase": 1}


@router.get("/franchises", response_model=list[FranchiseOut])
def list_franchises(db: Session = Depends(get_db)):
    return db.query(Franchise).order_by(Franchise.name).all()


@router.post("/rooms", response_model=RoomOut, status_code=201)
def create_auction_room(payload: RoomCreate, db: Session = Depends(get_db)):
    return create_room(db, payload)


@router.get("/rooms/{room_id}", response_model=RoomOut)
def read_auction_room(room_id: int, db: Session = Depends(get_db)):
    return get_room(db, room_id)


@router.get("/games")
def list_saved_games(db: Session = Depends(get_db)):
    rows = db.query(AuctionGameSnapshot).order_by(AuctionGameSnapshot.updated_at.desc()).all()
    return [row.payload for row in rows]


@router.put("/games/{game_id}")
def save_game(game_id: str, payload: dict, db: Session = Depends(get_db)):
    if payload.get("id") != game_id:
        raise HTTPException(status_code=422, detail="Game ID in URL and payload must match.")
    if not payload.get("name") or len(str(payload.get("name"))) > 120:
        raise HTTPException(status_code=422, detail="A valid auction name is required.")
    row = db.get(AuctionGameSnapshot, game_id)
    if row is None:
        row = AuctionGameSnapshot(id=game_id, room_id=payload.get("server_id"), name=payload["name"], status=payload.get("status", "setup"), payload=payload)
        db.add(row)
    else:
        row.room_id = payload.get("server_id")
        row.name = payload["name"]
        row.status = payload.get("status", "setup")
        row.payload = payload
    db.commit()
    return {"saved": True, "id": game_id, "status": row.status}


@router.delete("/games/{game_id}")
def delete_game(game_id: str, db: Session = Depends(get_db)):
    row = db.get(AuctionGameSnapshot, game_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Saved auction not found.")
    db.delete(row)
    db.commit()
    return {"deleted": True, "id": game_id}


@router.post("/imports/players")
async def import_player_file(file: UploadFile = File(...)):
    """Extract a reviewable player list from PDF, CSV or XLSX files."""
    import csv
    import io
    import re
    from pathlib import Path

    filename = (file.filename or "").lower()
    raw = await file.read()
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Upload must be 15 MB or smaller.")

    def normalize(headers, values):
        row = {re.sub(r"[^a-z0-9]+", "_", str(h or "").strip().lower()).strip("_"): str(v or "").strip() for h, v in zip(headers, values)}
        name = row.get("player_name") or row.get("name") or row.get("player") or row.get("cricketer")
        if not name:
            return None
        country = row.get("country") or row.get("nationality") or row.get("nation") or "India"
        role = row.get("role") or row.get("player_role") or row.get("type") or "Unspecified"
        price_raw = row.get("base_price") or row.get("base_price_cr") or row.get("base_price_inr") or row.get("baseprice") or row.get("price") or row.get("amount") or "0"
        price_match = re.search(r"\d+(?:\.\d+)?", price_raw.replace(",", ""))
        price = float(price_match.group()) if price_match else 0.0
        if re.search(r"lakh|lac", price_raw, re.I):
            price /= 100.0
        elif row.get("base_price_inr") and price > 1000:
            price /= 10000000.0
        return {"name": name, "country": country, "role": role, "style": row.get("style") or row.get("bowling_style") or "", "previous_team": row.get("previous_team") or "", "base_price": price, "status": "Available"}

    rows = []
    warnings = []
    suffix = Path(filename).suffix
    try:
        if suffix == ".csv":
            decoded = raw.decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
            for row in reader:
                parsed = normalize(row.keys(), row.values())
                if parsed: rows.append(parsed)
        elif suffix in (".xlsx", ".xlsm"):
            from openpyxl import load_workbook
            workbook = load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
            sheet = workbook.active
            values = list(sheet.iter_rows(values_only=True))
            if values:
                headers = values[0]
                for values_row in values[1:]:
                    parsed = normalize(headers, values_row)
                    if parsed: rows.append(parsed)
        elif suffix == ".pdf":
            import pdfplumber
            with pdfplumber.open(io.BytesIO(raw)) as pdf:
                for page in pdf.pages:
                    for table in (page.extract_tables() or []):
                        if not table or len(table) < 2:
                            continue
                        headers = table[0]
                        for values_row in table[1:]:
                            parsed = normalize(headers, values_row)
                            if parsed:
                                rows.append(parsed)
            if not rows:
                import fitz
                doc = fitz.open(stream=raw, filetype="pdf")
                extracted_lines = []
                for page in doc:
                    line_groups = {}
                    for word in page.get_text("words"):
                        y_key = round(word[1] / 3) * 3
                        line_groups.setdefault(y_key, []).append(word)
                    for y_key in sorted(line_groups):
                        words = sorted(line_groups[y_key], key=lambda item: item[0])
                        extracted_lines.append(" ".join(word[4] for word in words))
                # Best-effort fallback for text PDFs with columns separated by repeated spaces.
                countries = ["South Africa", "New Zealand", "West Indies", "United Arab Emirates", "United States", "Afghanistan", "Bangladesh", "Sri Lanka", "Australia", "England", "Zimbabwe", "Ireland", "Nepal", "India"]
                for line in extracted_lines:
                    clean_line = line.strip()
                    if not clean_line or re.search(r"player|name|base price|reserve price", clean_line, re.I):
                        continue
                    price_match = re.search(r"([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?\s*$", clean_line, re.I)
                    if not price_match:
                        continue
                    price_value = float(price_match.group(1).replace(",", ""))
                    if price_match.group(2) and re.match(r"lakh|lac", price_match.group(2), re.I):
                        price_value /= 100.0
                    prefix = clean_line[:price_match.start()].strip(" |\t-")
                    country = "India"
                    role = "Unspecified"
                    name = prefix
                    for candidate_country in countries:
                        match = re.search(r"\b" + re.escape(candidate_country) + r"\b", prefix, re.I)
                        if match:
                            name = prefix[:match.start()].strip(" |\t-")
                            role_text = prefix[match.end():].strip(" |\t-")
                            country = candidate_country
                            if role_text:
                                role = role_text
                            break
                    if name:
                        rows.append({"name": name, "country": country, "role": role, "style": "", "previous_team": "", "base_price": price_value, "status": "Available"})
            if not rows:
                warnings.append("We extracted PDF text but could not confidently identify player rows. Try a table-based PDF or upload CSV/XLSX.")
        else:
            raise HTTPException(status_code=415, detail="Supported formats: PDF, CSV and XLSX.")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not read this file: {exc}")

    seen = set()
    unique = []
    for row in rows:
        key = row["name"].strip().casefold()
        if key in seen:
            continue
        seen.add(key)
        row["id"] = f"import-{len(unique)+1}-{abs(hash(key)) % 1000000}"
        unique.append(row)
    if not unique and not warnings:
        warnings.append("No player rows were detected. Check the column headings and file layout.")
    return {"players": unique, "count": len(unique), "warnings": warnings, "source_file": file.filename}
