// ✅ script.js — Enhanced with typo tolerance, highlighting, and refined filtering

let data = [];
const container = document.getElementById("results");
const input = document.getElementById("search-box");

// Load data
async function loadData() {
  try {
    const res = await fetch("rfp_data_with_real_embeddings.json");
    data = await res.json();
    console.log(`✅ Loaded ${data.length} records.`);
  } catch (err) {
    console.error("❌ Failed to load data:", err);
  }
}

// Cosine similarity
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}

// Keyword score with fuzzy match
function keywordScore(query, text) {
  const lcQuery = query.toLowerCase();
  const lcText = text.toLowerCase();
  return lcText.includes(lcQuery) ? 0.3 : fuzzyMatch(lcQuery, lcText);
}

// Basic fuzzy match using edit distance
function fuzzyMatch(a, b) {
  const dist = levenshtein(a, b);
  const score = 1 - dist / Math.max(a.length, b.length);
  return score > 0.7 ? 0.2 : 0;
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) dp[i][j] = dp[i - 1][j - 1];
      else dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

// Embed query
async function embedQuery(query) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer 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",
    },
    body: JSON.stringify({ input: query, model: "text-embedding-3-small" }),
  });
  const json = await res.json();
  return json.data?.[0]?.embedding || null;
}

// Highlight match terms
function highlight(text, query) {
  const re = new RegExp(`(${query})`, "gi");
  return text.replace(re, '<mark>$1</mark>');
}

// Search logic
async function search(query) {
  if (query.length < 4) {
    container.innerHTML = "";
    return;
  }
  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(query);
  } catch (e) {
    console.warn("⚠️ Embedding fallback");
  }

  const results = data
    .map((entry) => {
      const similarity = queryEmbedding ? cosineSimilarity(queryEmbedding, entry.embedding) : 0;
      const keyword = keywordScore(query, entry.question);
      return {
        ...entry,
        score: similarity + keyword,
      };
    })
    .filter((r) => r.score >= 0.25)
    .sort((a, b) => b.score - a.score);

  const merged = {};
  results.forEach((r) => {
    if (!merged[r.question]) merged[r.question] = { ...r, allAnswers: [] };
    merged[r.question].allAnswers.push(...(r.answers || [r.answer]));
  });

  container.innerHTML = "";
  Object.values(merged).slice(0, 10).forEach((res) => {
    const card = document.createElement("div");
    card.className = "card";
    const preview = res.allAnswers.join("\n").split("\n").slice(0, 3).join("\n");
    card.innerHTML = `
      <strong>Q:</strong> ${highlight(res.question, query)}<br>
      <strong>Answer(s):</strong><pre style="white-space:pre-wrap" class="answer-preview">${preview}</pre>
      <a href="#" class="toggle">Show More</a><br>
      <small>Score: ${res.score.toFixed(3)}</small>
    `;
    card.querySelector(".toggle").addEventListener("click", (e) => {
      e.preventDefault();
      const pre = card.querySelector(".answer-preview");
      pre.textContent = res.allAnswers.join("\n");
      e.target.remove();
    });
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  input.addEventListener("input", (e) => search(e.target.value.trim()));
});
