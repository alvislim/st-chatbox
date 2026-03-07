import { Request, Response } from "express";
import { createSession } from "../services/sessionService";

export function handleCreateSession(_req: Request, res: Response): void {
  const sessionId = createSession();
  res.json({ sessionId });
}
