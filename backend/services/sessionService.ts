import crypto from "crypto";

export interface Session {
  history: { role: "user" | "assistant"; content: string }[];
  lastActive: number;
}

const sessions = new Map<string, Session>();
const SESSION_TTL = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function createSession(): string {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, { history: [], lastActive: Date.now() });
  return sessionId;
}

export function getSession(sessionId: string): Session {
  let session = sessions.get(sessionId);
  if (!session) {
    session = { history: [], lastActive: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastActive = Date.now();
  return session;
}
