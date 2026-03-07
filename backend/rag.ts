import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const DATASET_PATH = fs.existsSync(path.join(__dirname, "dataset.csv"))
  ? path.join(__dirname, "dataset.csv")
  : path.join(__dirname, "..", "dataset.csv");

export interface OwaspEntry {
  question: string;
  answer: string;
}

export interface ScoredEntry extends OwaspEntry {
  score: number;
}

export function loadOwaspData(): Promise<OwaspEntry[]> {
  return new Promise((resolve) => {
    try {
      const fileContent = fs.readFileSync(DATASET_PATH, "utf-8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as Record<string, string>[];

      const data: OwaspEntry[] = records
        .map((row) => ({
          question: (row.Question || "").trim(),
          answer: (row.Answer || "").trim(),
        }))
        .filter((row) => row.question && row.answer);

      resolve(data);
    } catch (err) {
      console.error("Error loading OWASP dataset:", (err as Error).message);
      resolve([]);
    }
  });
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "has",
  "her", "was", "one", "our", "out", "its", "his", "how", "who", "what",
  "when", "where", "why", "which", "this", "that", "with", "from", "they",
  "been", "have", "does", "will", "would", "could", "should", "about",
  "into", "more", "some", "than", "them", "then", "these", "those",
  "such", "only", "also", "just", "each", "any", "other",
]);

export function searchOwasp(data: OwaspEntry[], query: string, topK: number = 3): ScoredEntry[] {
  const queryTokens = tokenize(query).filter((t) => !STOP_WORDS.has(t));
  if (queryTokens.length === 0) return [];

  const scored: ScoredEntry[] = data.map((entry) => {
    const questionTokens = tokenize(entry.question);
    const answerTokens = tokenize(entry.answer);
    const allTokens = [...questionTokens, ...answerTokens];

    let score = 0;
    for (const qt of queryTokens) {
      // Only allow partial matches for tokens with 4+ chars to avoid false positives
      const minPartialLen = 4;
      for (const qToken of questionTokens) {
        if (qToken === qt) score += 3;
        else if (qt.length >= minPartialLen && qToken.length >= minPartialLen && (qToken.includes(qt) || qt.includes(qToken))) score += 1.5;
      }
      for (const aToken of answerTokens) {
        if (aToken === qt) score += 1;
        else if (qt.length >= minPartialLen && aToken.length >= minPartialLen && (aToken.includes(qt) || qt.includes(aToken))) score += 0.5;
      }
    }

    const uniqueMatches = new Set(
      queryTokens.filter((qt) => allTokens.some((t) => t.includes(qt) || qt.includes(t)))
    );
    if (uniqueMatches.size > 1) {
      score *= 1 + uniqueMatches.size * 0.2;
    }

    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
