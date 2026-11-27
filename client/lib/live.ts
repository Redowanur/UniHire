/**
 * Live exam monitoring over WebRTC.
 *
 * The student's browser sends camera + microphone straight to the recruiter's browser. The
 * API's WebSocket only relays the handshake (offer / answer / ICE); no media passes through it.
 */
import { API_BASE_URL } from "@/lib/api";

function iceServers(): RTCIceServer[] {
  const raw = process.env.NEXT_PUBLIC_ICE_SERVERS;
  if (raw) {
    try {
      return JSON.parse(raw) as RTCIceServer[];
    } catch {
      // fall through to the default
    }
  }
  return [{ urls: "stun:stun.l.google.com:19302" }];
}

function socketUrl(testId: string): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}/api/v1/screening-tests/${testId}/live`;
}

type Peer = { id: string; role: "student" | "recruiter"; student_id: string | null; name: string | null; violations: number };

type Signal = {
  type: string;
  from?: string;
  to?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  peers?: Peer[];
  peer?: Peer;
  id?: string;
  student_id?: string;
  [key: string]: unknown;
};

/** Shared plumbing: an authenticated, auto-reconnecting signaling socket with ordered handling. */
abstract class SignalingClient {
  protected ws: WebSocket | null = null;
  protected stopped = false;
  private chain: Promise<void> = Promise.resolve();
  private retry: number | undefined;

  constructor(
    private readonly testId: string,
    private readonly token: string,
  ) {}

  start() {
    this.stopped = false;
    this.open();
  }

  stop() {
    this.stopped = true;
    window.clearTimeout(this.retry);
    this.ws?.close();
    this.ws = null;
    this.reset();
  }

  private open() {
    const ws = new WebSocket(socketUrl(this.testId));
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: this.token }));
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data as string) as Signal;
      // Handle strictly in order so an ICE candidate never overtakes the offer before it
      this.chain = this.chain.then(() => this.handle(message)).catch(() => undefined);
    };
    ws.onclose = (event) => {
      if (this.stopped || event.code === 4401 || event.code === 4403) return;
      this.reset();
      this.retry = window.setTimeout(() => this.open(), 2000);
    };
  }

  protected send(message: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(message));
  }

  protected abstract handle(message: Signal): Promise<void>;
  /** Drop peer connections (socket lost or stopped). */
  protected abstract reset(): void;
}

/** Student side: offers camera + microphone to every recruiter who is watching. */
export class LiveBroadcaster extends SignalingClient {
  private pcs = new Map<string, RTCPeerConnection>();
  private viewers = new Set<string>();

  constructor(
    testId: string,
    token: string,
    private readonly getStream: () => MediaStream | null,
    private readonly onViewers?: (count: number) => void,
  ) {
    super(testId, token);
  }

  /** Call after the camera/microphone were replaced, so viewers receive the new tracks. */
  restream() {
    const ids = [...this.viewers];
    this.closePeers();
    ids.forEach((id) => void this.offerTo(id));
  }

  protected async handle(message: Signal) {
    switch (message.type) {
      case "hello":
        (message.peers ?? []).filter((p) => p.role === "recruiter").forEach((p) => void this.offerTo(p.id));
        break;
      case "peer":
        if (message.peer?.role === "recruiter") await this.offerTo(message.peer.id);
        break;
      case "peer_left":
        if (message.id) this.drop(message.id);
        break;
      case "answer": {
        const pc = message.from ? this.pcs.get(message.from) : undefined;
        if (pc && message.sdp) await pc.setRemoteDescription(message.sdp);
        break;
      }
      case "ice": {
        const pc = message.from ? this.pcs.get(message.from) : undefined;
        if (pc && message.candidate) await pc.addIceCandidate(message.candidate).catch(() => undefined);
        break;
      }
    }
  }

  private async offerTo(viewerId: string) {
    const stream = this.getStream();
    if (!stream) return;
    this.viewers.add(viewerId);
    this.onViewers?.(this.viewers.size);

    const pc = new RTCPeerConnection({ iceServers: iceServers() });
    this.pcs.set(viewerId, pc);
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    pc.onicecandidate = (event) => {
      if (event.candidate) this.send({ type: "ice", to: viewerId, candidate: event.candidate.toJSON() });
    };
    await pc.setLocalDescription(await pc.createOffer());
    this.send({ type: "offer", to: viewerId, sdp: pc.localDescription });
  }

  private drop(viewerId: string) {
    this.pcs.get(viewerId)?.close();
    this.pcs.delete(viewerId);
    this.viewers.delete(viewerId);
    this.onViewers?.(this.viewers.size);
  }

  private closePeers() {
    this.pcs.forEach((pc) => pc.close());
    this.pcs.clear();
  }

  protected reset() {
    this.closePeers();
    this.viewers.clear();
    this.onViewers?.(0);
  }
}

export type LiveStudent = {
  peerId: string;
  studentId: string;
  name: string;
  violations: number;
  stream: MediaStream | null;
};

/** Recruiter side: answers each student's offer and exposes their stream. */
export class LiveViewer extends SignalingClient {
  private pcs = new Map<string, RTCPeerConnection>();
  private students = new Map<string, LiveStudent>(); // keyed by peer id

  constructor(
    testId: string,
    token: string,
    private readonly onChange: (students: LiveStudent[]) => void,
    private readonly onEvent?: (event: Signal) => void,
  ) {
    super(testId, token);
  }

  private emit() {
    this.onChange([...this.students.values()]);
  }

  private add(peer: Peer) {
    if (peer.role !== "student" || !peer.student_id) return;
    this.students.set(peer.id, {
      peerId: peer.id,
      studentId: peer.student_id,
      name: peer.name ?? "Student",
      violations: peer.violations ?? 0,
      stream: null,
    });
  }

  protected async handle(message: Signal) {
    switch (message.type) {
      case "hello":
        (message.peers ?? []).forEach((p) => this.add(p));
        this.emit();
        break;
      case "peer":
        if (message.peer) this.add(message.peer);
        this.emit();
        break;
      case "peer_left":
        if (message.id) {
          this.pcs.get(message.id)?.close();
          this.pcs.delete(message.id);
          this.students.delete(message.id);
          this.emit();
        }
        break;
      case "offer": {
        if (!message.from || !message.sdp) return;
        const from = message.from;
        this.pcs.get(from)?.close();
        const pc = new RTCPeerConnection({ iceServers: iceServers() });
        this.pcs.set(from, pc);
        pc.onicecandidate = (event) => {
          if (event.candidate) this.send({ type: "ice", to: from, candidate: event.candidate.toJSON() });
        };
        pc.ontrack = (event) => {
          const student = this.students.get(from);
          if (student && student.stream !== event.streams[0]) {
            this.students.set(from, { ...student, stream: event.streams[0] });
            this.emit();
          }
        };
        await pc.setRemoteDescription(message.sdp);
        await pc.setLocalDescription(await pc.createAnswer());
        this.send({ type: "answer", to: from, sdp: pc.localDescription });
        break;
      }
      case "ice": {
        const pc = message.from ? this.pcs.get(message.from) : undefined;
        if (pc && message.candidate) await pc.addIceCandidate(message.candidate).catch(() => undefined);
        break;
      }
      case "violation":
      case "submitted": {
        for (const [peerId, student] of this.students) {
          if (student.studentId === message.student_id && typeof message.count === "number") {
            this.students.set(peerId, { ...student, violations: message.count });
          }
        }
        this.emit();
        this.onEvent?.(message);
        break;
      }
    }
  }

  protected reset() {
    this.pcs.forEach((pc) => pc.close());
    this.pcs.clear();
    this.students.clear();
    this.emit();
  }
}
