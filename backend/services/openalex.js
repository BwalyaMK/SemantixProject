// services/openalex.js
const fetch = global.fetch || require("node-fetch");

async function searchOpenAlex(query, { filters = {}, page = 1, pageSize = 20 } = {}) {
  const encoded = encodeURIComponent(query);
  // Basic OpenAlex works with works endpoint
  // We ask for title, authors, publication_date, abstract
  const perPage = Math.min(pageSize, 50);
  const url = `https://api.openalex.org/works?search=${encoded}&per-page=${perPage}&page=${page}`;

  const resp = await fetch(url, { headers: { "User-Agent": "Semantix/1.0 (mailto:your-email@example.com)" } });
  if (!resp.ok) throw new Error(`OpenAlex error: ${resp.statusText}`);
  const json = await resp.json();

  // Normalize
  const results = (json.results || []).map(item => {
    const authors = (item.authorships || []).map(a => (a.author && a.author.display_name) || a.raw) .filter(Boolean);
    return {
      id: item.id || item.openalex_id || null,
      title: item.title || "",
      abstract: item.abstract || "",
      preview: item.abstract || (item.title || ""),
      url: item.ids && (item.ids.openalex || item.ids.doi) ? (item.id || item.ids.doi ? `https://doi.org/${item.ids.doi}` : item.id) : (item.id || null),
      authors,
      publishDate: item.publication_date || item.display_date || null,
      type: (item.type || "article"),
      relevanceScore: Math.round((item.display_name ? 50 : 50) + (Math.random() * 50)), // fallback scoring
    };
  });

  return results;
}

module.exports = { searchOpenAlex };
