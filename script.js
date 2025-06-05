// script.js — Final drop-in with all fixes

let data = [];
const container = document.getElementById("results");
const input = document.getElementById("search-box");

async function loadData() {
  try {
    const res = await fetch("rfp_data_with_real_embeddings.json");
    data = await res.json();
    console.log(`✅ Loaded ${data.length} records.`);
  } catch (err) {
    console.error("❌ Failed to load data:", err);
  }
}

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  return dot / (magA * magB);
}

function keywordScore(query, text) {
  return text.toLowerCase().includes(query.toLowerCase()) ? 0.3 : 0;
}

function highlightMatch(text, query) {
  const regex = new RegExp(query, "gi");
  return text.replace(regex, match => `<mark>${match}</mark>`);
}

async function embedQuery(query) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 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"
    },
    body: JSON.stringify({ input: query, model: "text-embedding-3-small" })
  });

  const json = await res.json();
  return json.data?.[0]?.embedding || null;
}

async function search(query) {
  if (query.length < 4) {
    container.innerHTML = "";
    return;
  }

  let queryEmbedding = null;
  try {
    queryEmbedding = await embedQuery(query);
  } catch (err) {
    console.warn("⚠️ Embedding failed, falling back to keyword only");
  }

  const scores = {};
  for (const entry of data) {
    const similarity = queryEmbedding ? cosineSimilarity(queryEmbedding, entry.embedding) : 0;
    const keyword = keywordScore(query, entry.question);
    const score = similarity + keyword;
    if (score < 0.25) continue;
    const key = entry.question.trim();
    if (!scores[key]) scores[key] = [];
    scores[key].push({ ...entry, score });
  }

  const ranked = Object.entries(scores)
    .map(([question, results]) => {
      results.sort((a, b) => b.score - a.score);
      return { question, answers: results, score: results[0].score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  container.innerHTML = "";
  ranked.forEach(group => {
    const card = document.createElement("div");
    card.className = "card";
    const preview = group.answers.slice(0, 1).map(ans => `<strong>Answer:</strong> ${highlightMatch(ans.answer, query)}`).join("<br>");
    const details = group.answers.map(ans => `<li>${highlightMatch(ans.answer, query)} <em>(Score: ${ans.score.toFixed(3)})</em></li>`).join("");
    card.innerHTML = `
      <details>
        <summary><strong>Q:</strong> ${highlightMatch(group.question, query)}</summary>
        <div><ul>${details}</ul></div>
      </details>
    `;
    container.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  input.addEventListener("input", e => {
    const query = e.target.value.trim();
    search(query);
  });
});
