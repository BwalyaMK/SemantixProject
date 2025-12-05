// services/doaj.js
const fetch = global.fetch || require("node-fetch");

// DOAJ article search: https://doaj.org/api/v2/search/articles?q=...
async function searchDOAJ(query, { filters = {}, page = 1, pageSize = 20 } = {}) {
  const perPage = Math.min(pageSize, 100);
  const q = encodeURIComponent(query);
  const offset = (page - 1) * perPage;
  const url = `https://doaj.org/api/v2/search/articles?q=${q}&page=${page}&pageSize=${perPage}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`DOAJ error: ${resp.statusText}`);
  const json = await resp.json();

  // DOAJ returns 'results' array with 'bibjson' properties
  const results = (json.results || []).map(item => {
    const bib = item.bibjson || {};
    const title = bib.title || (item.title || "");
    const authors = (bib.author || []).map(a => a.name).filter(Boolean);
    const abstract = (bib.abstract || "") || "";
    const url = (bib.link && bib.link[0] && bib.link[0].url) || item.id || null;
    return {
      id: item.id || null,
      title,
      abstract,
      preview: abstract || title,
      url,
      authors,
      publishDate: bib.year ? `${bib.year}` : null,
      type: (bib.type || "article"),
      relevanceScore: Math.round(60 + Math.random() * 40)
    };
  });

  return results;
}

module.exports = { searchDOAJ };
