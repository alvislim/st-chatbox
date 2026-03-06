const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse/sync");

const DATASET_PATH = path.join(__dirname, "..", "dataset.csv");

function loadOwaspData() {
  return new Promise((resolve, reject) => {
    try {
      const fileContent = fs.readFileSync(DATASET_PATH, "utf-8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      });

      const data = records.map((row) => ({
        question: (row.Question || "").trim(),
        answer: (row.Answer || "").trim(),
      })).filter((row) => row.question && row.answer);

      resolve(data);
    } catch (err) {
      console.error("Error loading OWASP dataset:", err.message);
      resolve([]);
    }
  });
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Stop words to ignore during matching
const STOP_WORDS = new Set([
  "the", "and", "for", "are", "but", "not", "you", "all", "can", "has",
  "her", "was", "one", "our", "out", "its", "his", "how", "who", "what",
  "when", "where", "why", "which", "this", "that", "with", "from", "they",
  "been", "have", "does", "will", "would", "could", "should", "about",
  "into", "more", "some", "than", "them", "then", "these", "those",
  "such", "only", "also", "just", "each", "any", "other",
]);

function searchOwasp(data, query, topK = 3) {
  const queryTokens = tokenize(query).filter((t) => !STOP_WORDS.has(t));
  if (queryTokens.length === 0) return [];

  const scored = data.map((entry) => {
    const questionTokens = tokenize(entry.question);
    const answerTokens = tokenize(entry.answer);
    const allTokens = [...questionTokens, ...answerTokens];

    let score = 0;
    for (const qt of queryTokens) {
      // Exact match in question gets higher weight
      for (const qToken of questionTokens) {
        if (qToken === qt) score += 3;
        else if (qToken.includes(qt) || qt.includes(qToken)) score += 1.5;
      }
      // Match in answer
      for (const aToken of answerTokens) {
        if (aToken === qt) score += 1;
        else if (aToken.includes(qt) || qt.includes(aToken)) score += 0.5;
      }
    }

    // Boost for matching multiple query terms
    const uniqueMatches = new Set(
      queryTokens.filter((qt) => allTokens.some((t) => t.includes(qt) || qt.includes(t)))
    );
    if (uniqueMatches.size > 1) {
      score *= 1 + uniqueMatches.size * 0.2;
    }

    return { ...entry, score };
  });

  return scored
    .filter((e) => e.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

module.exports = { loadOwaspData, searchOwasp };
