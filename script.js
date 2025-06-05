let data = [];

async function loadData() {
  try {
    const response = await fetch("rfp_data_with_local_embeddings.json");
    data = await response.json();
    console.log(`✅ Loaded ${data.length} records.`);
  } catch (err) {
    console.error("❌ Failed to load data:", err);
  }
}

// Utility to normalize strings
function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/gi, " ");
}

// Simple keyword scoring fallback
function keywordScore(query, text) {
  const qWords = normalize(query).split(/\s+/);
  const tWords = normalize(text).split(/\s+/);
  let score = 0;
  qWords.forEach((q) => {
    if (tWords.includes(q)) score += 1;
  });
  return score / qWords.length;
}

// Main search function
async function embedQuery(query) {
  try {
    const model = await window.sentenceTransformers.load("all-MiniLM-L6-v2");
    const embedding = await model.embed(query);
    return embedding;
  } catch (err) {
    console.error("Embedding failed. Falling back to keywords.");
    return null;
  }
}

// Cosine similarity
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const normB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (normA * normB);
}

async function search(query) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  let queryEmbedding = null;
  try {
    const model = await window.sentenceTransformers.load("all-MiniLM-L6-v2");
    queryEmbedding = await model.embed(query);
  } catch {
    console.warn("AI embedding failed. Using keyword fallback.");
  }

  const scored = data.map((entry) => {
    const sim = queryEmbedding && entry.embedding
      ? cosineSimilarity(queryEmbedding, entry.embedding)
      : 0;
    const keyScore = keywordScore(query, entry.question);
    return { ...entry, score: sim + keyScore };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 10);

  top.forEach((res) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>Q:</strong> ${res.question}<br>
      <strong>Answer:</strong> ${res.answer}<br>
      <em>Score: ${res.score.toFixed(3)}</em>
    `;
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  const input = document.getElementById("search-box");
  input.addEventListener("input", (e) => search(e.target.value));
});
