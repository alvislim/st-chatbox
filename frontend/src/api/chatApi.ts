const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export interface ChatResponse {
  reply: string;
  ragSources: string[];
}

export async function createSession(): Promise<string> {
  const res = await fetch(`${API_URL}/api/session`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to create session");
  const data = await res.json();
  return data.sessionId;
}

export async function sendChatMessage(sessionId: string, message: string): Promise<ChatResponse> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, message }),
  });
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}
