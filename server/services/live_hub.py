"""In-memory signaling hub for live exam monitoring.

The video and audio never touch the server: students and the recruiter set up WebRTC
peer connections directly, and this hub only relays the handshake messages (offer,
answer, ICE) between them. State lives in this process, so it assumes one server
process (use a shared pub/sub such as Redis if the API is ever scaled out).
"""

import uuid
from dataclasses import dataclass, field

from fastapi import WebSocket


@dataclass
class Peer:
    ws: WebSocket
    role: str  # "student" | "recruiter"
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    student_id: str | None = None
    name: str | None = None
    violations: int = 0

    def describe(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "student_id": self.student_id,
            "name": self.name,
            "violations": self.violations,
        }


class LiveHub:
    def __init__(self) -> None:
        self._rooms: dict[str, dict[str, Peer]] = {}

    def _room(self, test_id: str) -> dict[str, Peer]:
        return self._rooms.setdefault(test_id, {})

    @staticmethod
    def _opposite(role: str) -> str:
        return "recruiter" if role == "student" else "student"

    async def join(self, test_id: str, peer: Peer) -> None:
        room = self._room(test_id)
        # A student may only have one live connection; a reconnect replaces the old one
        if peer.role == "student":
            for other in [p for p in room.values() if p.role == "student" and p.student_id == peer.student_id]:
                await self.leave(test_id, other)
                try:
                    await other.ws.close(code=4000)
                except Exception:
                    pass
        room[peer.id] = peer
        # Students and recruiters see each other; students never see other students
        others = [p for p in room.values() if p.role == self._opposite(peer.role)]
        await peer.ws.send_json({"type": "hello", "id": peer.id, "peers": [p.describe() for p in others]})
        for other in others:
            await self._send(other, {"type": "peer", "peer": peer.describe()})

    async def leave(self, test_id: str, peer: Peer) -> None:
        room = self._rooms.get(test_id)
        if not room or room.pop(peer.id, None) is None:
            return
        for other in [p for p in room.values() if p.role == self._opposite(peer.role)]:
            await self._send(other, {"type": "peer_left", "id": peer.id, "student_id": peer.student_id})
        if not room:
            self._rooms.pop(test_id, None)

    async def relay(self, test_id: str, sender: Peer, message: dict) -> None:
        """Forwards a handshake message to one peer of the opposite role."""
        target = self._room(test_id).get(message.get("to", ""))
        if target is None or target.role == sender.role:
            return
        await self._send(target, {**message, "from": sender.id})

    def set_violations(self, test_id: str, student_id: str, count: int) -> None:
        """Keeps the cached count current, so recruiters who join late see the right number."""
        for peer in self._room(test_id).values():
            if peer.role == "student" and peer.student_id == student_id:
                peer.violations = count

    async def notify_recruiters(self, test_id: str, message: dict) -> None:
        for peer in [p for p in self._room(test_id).values() if p.role == "recruiter"]:
            await self._send(peer, message)

    async def _send(self, peer: Peer, message: dict) -> None:
        try:
            await peer.ws.send_json(message)
        except Exception:
            # The socket is dead; its own receive loop will clean up
            pass


hub = LiveHub()
