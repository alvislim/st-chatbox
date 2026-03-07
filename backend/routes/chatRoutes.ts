import express from "express";
import { handleCreateSession } from "../controllers/sessionController";
import { handleChat } from "../controllers/chatController";

const router = express.Router();

router.post("/session", handleCreateSession);
router.post("/chat", handleChat);

export default router;
