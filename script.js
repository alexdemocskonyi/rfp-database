let data = [];

async function loadData() {
  const res = await fetch("rfp_data_with_local_embeddings.json");
  data = await res.json();
  console.log("✅ Data loaded:", data.length, "items");
}

// Basic cosine similarity
function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + b[i] * b[i], 0));
  return dot / (magA * magB);
}

async function runSearch(query) {
  const model = await window.sbert.load();
  const embedding = await model.embed(query);

  const results = data.map(item => ({
    question: item.question,
    answer: item.answer,
    score: cosineSimilarity(item.embedding, embedding)
  }));

  results.sort((a, b) => b.score - a.score);

  const container = document.getElementById("results");
  container.innerHTML = results
    .filter(r => r.score > 0.4)
    .map(r => `<div class="result">
      <h3>${r.question}</h3>
      <p>${r.answer}</p>
      <small>Score: ${r.score.toFixed(3)}</small>
    </div>`)
    .join("");
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadData();

  document.getElementById("search-box").addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const query = e.target.value.trim();
      if (query.length > 0) {
        runSearch(query);
      }
    }
  });
});
