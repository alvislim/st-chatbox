import { Request, Response } from "express";
import { getSession } from "../services/sessionService";
import { generateReply } from "../services/chatService";

export async function handleChat(req: Request, res: Response): Promise<void> {
  const { sessionId, message } = req.body;

  if (!sessionId || !message || typeof message !== "string") {
    res.status(400).json({ error: "sessionId and message are required" });
    return;
  }

  const sanitizedMessage = message
    .trim()
    .replace(/<[^>]*>/g, "")
    .slice(0, 2000);
  if (!sanitizedMessage) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const session = getSession(sessionId);

  try {
    const result = await generateReply(session, sanitizedMessage);
    res.json(result);
  } catch (err) {
    console.error("Chat API error:", (err as Error).message);
    res.status(500).json({ error: "Failed to generate response" });
  }
}
