import { GoogleGenerativeAI } from "@google/generative-ai";
import { loadOwaspData, searchOwasp, OwaspEntry, ScoredEntry } from "../rag";
import { Session } from "./sessionService";

const apiKey = process.env.GEMINI_API_KEY!;
console.log(`Gemini API key: ${apiKey ? apiKey.slice(0, 10) + "..." + apiKey.slice(-4) : "NOT SET"}`);
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

let owaspData: OwaspEntry[] = [];
loadOwaspData().then((data) => {
  owaspData = data;
  console.log(`Loaded ${owaspData.length} OWASP Q&A entries`);
});

const SYSTEM_PROMPT = `You are a helpful chatbot assistant embedded in a webpage. You are knowledgeable about cybersecurity, especially OWASP API security topics.

When the user asks about security topics (OWASP, API security, XSS, BOLA, authentication, etc.), use the provided OWASP reference data to give accurate, detailed answers. Cite the reference data when relevant.

For general questions unrelated to security, provide helpful and concise responses.

Keep responses well-formatted. Use bullet points or numbered lists when appropriate.`;

interface ChatResult {
  reply: string;
  ragSources: string[];
}

export async function generateReply(session: Session, sanitizedMessage: string): Promise<ChatResult> {
  const ragResults: ScoredEntry[] = searchOwasp(owaspData, sanitizedMessage);
  console.log(`RAG: query="${sanitizedMessage}" → ${ragResults.length} results`, ragResults.map((r) => `[${r.score.toFixed(1)}] ${r.question.slice(0, 60)}`));
  let ragContext = "";
  if (ragResults.length > 0) {
    // Limit each answer to 600 chars to keep the prompt within token limits.
    // With 3 RAG results, this caps answer context at ~1800 chars total,
    // leaving room for the system prompt, conversation history, and user query.
    ragContext =
      "\n\nRelevant OWASP Security Reference Data:\n" +
      ragResults
        .map(
          (r, i) =>
            `[${i + 1}] Q: ${r.question}\nA: ${r.answer.slice(0, 600)}${r.answer.length > 600 ? "..." : ""}`
        )
        .join("\n\n");
  }

  const recentHistory = session.history.slice(-10);
  const historyText = recentHistory
    .map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.content}`)
    .join("\n");

  const prompt = `${SYSTEM_PROMPT}

Previous conversation:
${historyText}
${ragContext}

User: ${sanitizedMessage}`;

  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      result = await model.generateContent(prompt);
      break;
    } catch (apiErr: any) {
      if (apiErr.status === 429 && attempt < 2) {
        const waitSec = Math.pow(2, attempt) * 5;
        console.log(`Rate limited, retrying in ${waitSec}s...`);
        await new Promise((r) => setTimeout(r, waitSec * 1000));
      } else {
        throw apiErr;
      }
    }
  }
  const reply = result!.response.text();

  session.history.push({ role: "user", content: sanitizedMessage });
  session.history.push({ role: "assistant", content: reply });

  return {
    reply,
    ragSources: ragResults.length > 0 ? ragResults.map((r) => r.question) : [],
  };
}
