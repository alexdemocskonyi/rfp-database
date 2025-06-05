// script.js

let data = [];

async function loadData() {
  try {
    const response = await fetch("rfp_data_with_local_embeddings.json");
    if (!response.ok) throw new Error("Failed to fetch embeddings JSON");
    data = await response.json();
    console.log(`✅ Loaded ${data.length} records.`);
  } catch (error) {
    console.error("❌ Error loading data:", error);
  }
}

function cosineSimilarity(vecA, vecB) {
  const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  return dot / (normA * normB);
}

function keywordScore(query, text) {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  return t.includes(q) ? 1 : 0;
}

async function embedQuery(query) {
  const response = await fetch("https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(query)
  });
  const result = await response.json();
  return result[0]; // Use first output vector
}

async function search(query) {
  const container = document.getElementById("results");
  container.innerHTML = "";

  if (!query) return;

  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(query);
  } catch (err) {
    console.error("Embedding failed, falling back to keyword only");
  }

  const results = data.map(entry => {
    const similarity = queryEmbedding ? cosineSimilarity(queryEmbedding, entry.embedding) : 0;
    const keyword = keywordScore(query, entry.question);
    return {
      ...entry,
      score: similarity + keyword
    };
  });

  results.sort((a, b) => b.score - a.score);

  results.slice(0, 10).forEach(result => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <strong>Q:</strong> ${result.question}<br>
      <strong>Answer:</strong> ${result.answer}<br>
      <em>Score: ${result.score.toFixed(3)}</em>
    `;
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  const input = document.getElementById("searchInput");
  input.addEventListener("input", e => search(e.target.value));
});
