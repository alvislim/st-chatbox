const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { loadOwaspData, searchOwasp } = require("./rag");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// In-memory session store
const sessions = new Map();
const SESSION_TTL = 30 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions) {
    if (now - session.lastActive > SESSION_TTL) {
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Load OWASP data on startup
let owaspData = [];
loadOwaspData().then((data) => {
  owaspData = data;
  console.log(`Loaded ${owaspData.length} OWASP Q&A entries`);
});

// Create session
app.post("/api/session", (req, res) => {
  const sessionId = uuidv4();
  sessions.set(sessionId, { history: [], lastActive: Date.now() });
  res.json({ sessionId });
});

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message || typeof message !== "string") {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  const sanitizedMessage = message.trim().slice(0, 2000);
  if (!sanitizedMessage) {
    return res.status(400).json({ error: "Message cannot be empty" });
  }

  let session = sessions.get(sessionId);
  if (!session) {
    session = { history: [], lastActive: Date.now() };
    sessions.set(sessionId, session);
  }
  session.lastActive = Date.now();

  try {
    // RAG: search OWASP data
    const ragResults = searchOwasp(owaspData, sanitizedMessage);
    let ragContext = "";
    if (ragResults.length > 0) {
      ragContext =
        "\n\nRelevant OWASP Security Reference Data:\n" +
        ragResults
          .map(
            (r, i) =>
              `[${i + 1}] Q: ${r.question}\nA: ${r.answer.slice(0, 600)}${r.answer.length > 600 ? "..." : ""}`
          )
          .join("\n\n");
    }

    // Build conversation context from recent history
    const recentHistory = session.history.slice(-10);
    const historyText = recentHistory
      .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
      .join("\n");

    const prompt = `You are a helpful chatbot assistant embedded in a webpage. You are knowledgeable about cybersecurity, especially OWASP API security topics.

When the user asks about security topics (OWASP, API security, XSS, BOLA, authentication, etc.), use the provided OWASP reference data below to give accurate, detailed answers. Cite the reference data when relevant.

For general questions unrelated to security, provide helpful and concise responses.

Keep responses well-formatted. Use bullet points or numbered lists when appropriate.

Previous conversation:
${historyText}
${ragContext}

User: ${sanitizedMessage}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    // Update session history
    session.history.push({ role: "user", content: sanitizedMessage });
    session.history.push({ role: "assistant", content: reply });

    res.json({
      reply,
      ragSources: ragResults.length > 0 ? ragResults.map((r) => r.question) : [],
    });
  } catch (err) {
    console.error("Gemini API error:", err.message);
    res.status(500).json({ error: "Failed to generate response" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});