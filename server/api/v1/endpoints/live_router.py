import asyncio
import logging

import jwt
from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from core.security import decode_access_token
from enums.user_enums import UserType
from models.recruiter_model import Recruiter
from models.screening_test_model import ScreeningTest
from models.student_model import Student
from models.test_attempt_model import TestAttempt
from models.test_submission_model import TestSubmission
from services.live_hub import Peer, hub
from utils.helpers import utcnow

logger = logging.getLogger("live_exam")

router = APIRouter(prefix="/screening-tests", tags=["Live Monitoring"])

# WebSocket close codes (4000-4999 are free for applications)
UNAUTHORIZED = 4401
FORBIDDEN = 4403

SIGNALING_TYPES = {"offer", "answer", "ice"}


async def _authenticate(token: str) -> Student | Recruiter | None:
    try:
        user_id = PydanticObjectId(decode_access_token(token)["sub"])
    except (jwt.InvalidTokenError, KeyError, InvalidId):
        return None
    return await Student.get(user_id) or await Recruiter.get(user_id)


@router.websocket("/{test_id}/live")
async def live_exam(websocket: WebSocket, test_id: PydanticObjectId):
    """Signaling channel for live monitoring.

    The first message must be {"type": "auth", "token": <access token>}; sending the token in
    a message keeps it out of the URL and the server logs.
    """
    await websocket.accept()

    try:
        first = await asyncio.wait_for(websocket.receive_json(), timeout=10)
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError):
        await websocket.close(code=UNAUTHORIZED)
        return
    if first.get("type") != "auth" or not isinstance(first.get("token"), str):
        await websocket.close(code=UNAUTHORIZED)
        return

    user = await _authenticate(first["token"])
    test = await ScreeningTest.get(test_id)
    if user is None:
        await websocket.close(code=UNAUTHORIZED)
        return
    if test is None:
        await websocket.close(code=FORBIDDEN)
        return

    if user.user_type == UserType.RECRUITER and test.recruiter_id == user.id:
        peer = Peer(ws=websocket, role="recruiter", name=user.name)
    elif user.user_type == UserType.STUDENT and user.cohort_id == test.cohort_id:
        # Only a student who is actually sitting the exam may broadcast
        attempt = await TestAttempt.find_one(
            TestAttempt.test_id == test.id, TestAttempt.student_id == user.id
        )
        submitted = await TestSubmission.find_one(
            TestSubmission.test_id == test.id, TestSubmission.student_id == user.id
        )
        live = test.starts_at <= utcnow() < test.ends_at
        if attempt is None or attempt.terminated or submitted is not None or not live:
            await websocket.close(code=FORBIDDEN)
            return
        peer = Peer(
            ws=websocket,
            role="student",
            student_id=str(user.id),
            name=user.name,
            violations=len(attempt.violations),
        )
    else:
        await websocket.close(code=FORBIDDEN)
        return

    key = str(test.id)
    await hub.join(key, peer)
    try:
        while True:
            message = await websocket.receive_json()
            if isinstance(message, dict) and message.get("type") in SIGNALING_TYPES:
                await hub.relay(key, peer, message)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Live exam socket failed")
    finally:
        await hub.leave(key, peer)
