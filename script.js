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

async function embedQuery(query) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer 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"
    },
    body: JSON.stringify({
      input: query,
      model: "text-embedding-3-small"
    })
  });

  const json = await res.json();
  return json.data?.[0]?.embedding || null;
}

function truncateAnswer(answer) {
  const lines = answer.split("\n");
  return lines.length > 3 ? lines.slice(0, 3).join("\n") + "..." : answer;
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
    console.warn("Embedding failed, falling back to keyword only");
  }

  const grouped = {};
  for (const entry of data) {
    if (!grouped[entry.question]) grouped[entry.question] = [];
    grouped[entry.question].push(entry);
  }

  const results = Object.entries(grouped).map(([question, entries]) => {
    const similarity = queryEmbedding ? cosineSimilarity(queryEmbedding, entries[0].embedding) : 0;
    return {
      question,
      answers: entries.map(e => e.answer),
      score: similarity
    };
  }).filter(r => r.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  container.innerHTML = "";
  results.forEach(result => {
    const card = document.createElement("div");
    card.className = "card";
    const answersHtml = result.answers.map(answer => {
      const short = truncateAnswer(answer).replace(/\n/g, '<br>');
      return `<div class="answer" style="margin-top: 8px;"><div class="short">${short}</div><div class="full" style="display:none; white-space:pre-wrap;">${answer}</div><a href="#" class="toggle">Show more</a></div>`;
    }).join("<hr>");

    card.innerHTML = `
      <strong>Q:</strong> ${result.question}<br>
      ${answersHtml}
      <br><small>Score: ${result.score.toFixed(3)}</small>
    `;
    container.appendChild(card);
  });

  document.querySelectorAll(".toggle").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const parent = link.parentElement;
      parent.querySelector(".short").style.display = "none";
      parent.querySelector(".full").style.display = "block";
      link.remove();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  input.addEventListener("input", e => {
    const query = e.target.value.trim();
    search(query);
  });
});
