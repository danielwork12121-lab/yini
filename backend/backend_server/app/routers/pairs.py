import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import current_user
from app.db import get_session
from app.models import Pair, User
from app.schemas import JoinPairIn, PairOut, UserOut

router = APIRouter(prefix="/pairs", tags=["pairs"])


def pair_for(session: Session, user_id: str) -> Pair | None:
    return session.exec(select(Pair).where((Pair.user_a_id == user_id) | (Pair.user_b_id == user_id))).first()


def _out(session: Session, pair: Pair, me: str) -> PairOut:
    pid = pair.partner_of(me)
    partner = session.get(User, pid) if pid else None
    return PairOut(id=pair.id, invite_code=pair.invite_code, partner=UserOut.model_validate(partner, from_attributes=True) if partner else None,
                   complete=pair.user_b_id is not None)


@router.post("", response_model=PairOut, status_code=201, summary="Create a pair and get an invite code")
def create_pair(user: User = Depends(current_user), session: Session = Depends(get_session)):
    if pair_for(session, user.id):
        raise HTTPException(409, "You are already in a pair")
    code = secrets.token_hex(3).upper()
    pair = Pair(invite_code=code, user_a_id=user.id)
    session.add(pair); session.commit(); session.refresh(pair)
    return _out(session, pair, user.id)


@router.post("/join", response_model=PairOut, summary="Join a pair with an invite code")
def join_pair(body: JoinPairIn, user: User = Depends(current_user), session: Session = Depends(get_session)):
    if pair_for(session, user.id):
        raise HTTPException(409, "You are already in a pair")
    pair = session.exec(select(Pair).where(Pair.invite_code == body.invite_code.strip().upper())).first()
    if not pair:
        raise HTTPException(404, "No pair with that invite code")
    if pair.user_b_id:
        raise HTTPException(409, "That pair is already complete")
    if pair.user_a_id == user.id:
        raise HTTPException(400, "You cannot join your own pair")
    pair.user_b_id = user.id
    session.add(pair); session.commit(); session.refresh(pair)
    return _out(session, pair, user.id)


@router.get("/me", response_model=PairOut)
def my_pair(user: User = Depends(current_user), session: Session = Depends(get_session)):
    pair = pair_for(session, user.id)
    if not pair:
        raise HTTPException(404, "Not in a pair yet")
    return _out(session, pair, user.id)
