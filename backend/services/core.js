// services/core.js
const fetch = global.fetch || require("node-fetch");

const CORE_API_KEY = process.env.CORE_API_KEY || "acuw4LOFXD9zkSm1QMK3hZIyeCfodYn5";

async function searchCORE(query, { filters = {}, page = 1, pageSize = 20 } = {}) {
  if (!CORE_API_KEY) {
    // If key not present, return empty gracefully
    console.warn("CORE API key not provided; skipping CORE search.");
    return [];
  }

  const perPage = Math.min(pageSize, 50);
  const url = `https://api.core.ac.uk/v3/search/works?query=${encodeURIComponent(query)}&page=${page}&pageSize=${perPage}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: `Bearer ${CORE_API_KEY}`,
      "Content-Type": "application/json"
    }
  });

  if (!resp.ok) {
    throw new Error(`CORE error: ${resp.status} ${resp.statusText}`);
  }

  const json = await resp.json();

  const results = (json.results || []).map(item => {
    const title = item.title || "";
    const authors = (item.authors || []).map(a => a.name).filter(Boolean);
    return {
      id: item.id || null,
      title,
      abstract: item.abstract || "",
      preview: item.excerpt || item.abstract || title,
      url: item.sourceUrl || item.downloadUrl || item.url || null,
      authors,
      publishDate: item.published ? item.published : null,
      type: item.type || "article",
      relevanceScore: item.score ? Math.round(item.score * 10) : Math.round(60 + Math.random() * 40)
    };
  });

  return results;
}

module.exports = { searchCORE };
