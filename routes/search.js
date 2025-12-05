// routes/search.js
const express = require("express");
const router = express.Router();
const { searchOpenAlex } = require("../backend/services/openAlex");
const { searchDOAJ } = require("../backend/services/doaj");
const { searchCORE } = require("../backend/services/core");

// Utility: sanitize query (very basic)
function sanitizeQuery(q) {
  if (!q || typeof q !== "string") return "";
  return q.trim();
}

function normalizeParams(body) {
  const query = sanitizeQuery(body.query);
  const scope = body.scope || "all";
  const filters = body.filters || {};
  const page = Number(body.page) || 1;
  const pageSize = Math.min(Number(body.pageSize) || 20, 50);
  return { query, scope, filters, page, pageSize };
}

// POST /search
// body: { query, scope, filters, page, pageSize }
router.post("/", async (req, res) => {
  try {
    const { query, scope, filters, page, pageSize } = normalizeParams(req.body);

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // Run providers in parallel (only those in scope)
    const promises = [];

    // Scope options: all | openalex | doaj | core
    if (scope === "all" || scope === "openalex") {
      promises.push(
        searchOpenAlex(query, { filters, page, pageSize }).then(r => ({ source: "OpenAlex", ok: true, results: r })).catch(err => ({ source: "OpenAlex", ok: false, error: err.message }))
      );
    }

    if (scope === "all" || scope === "doaj") {
      promises.push(
        searchDOAJ(query, { filters, page, pageSize }).then(r => ({ source: "DOAJ", ok: true, results: r })).catch(err => ({ source: "DOAJ", ok: false, error: err.message }))
      );
    }

    if (scope === "all" || scope === "core") {
      promises.push(
        searchCORE(query, { filters, page, pageSize }).then(r => ({ source: "CORE", ok: true, results: r })).catch(err => ({ source: "CORE", ok: false, error: err.message }))
      );
    }

    const settled = await Promise.all(promises);

    // Collect results and tag them with source
    let merged = [];
    for (const s of settled) {
      if (!s.ok) {
        console.warn(`Provider ${s.source} failed:`, s.error);
        continue;
      }
      // Each provider returns an array of normalized records
      const tagged = s.results.map(r => ({ ...r, source: s.source }));
      merged = merged.concat(tagged);
    }

    // Basic dedupe by title + first author (if present)
    const seen = new Set();
    const deduped = [];
    for (const item of merged) {
      const key = (item.title || "") + "||" + (item.authors && item.authors[0] ? item.authors[0] : "");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(item);
    }

    // Sort: by relevanceScore desc then date desc
    deduped.sort((a, b) => {
      const rA = a.relevanceScore || 0;
      const rB = b.relevanceScore || 0;
      if (rB !== rA) return rB - rA;
      const dA = a.publishDate ? new Date(a.publishDate).getTime() : 0;
      const dB = b.publishDate ? new Date(b.publishDate).getTime() : 0;
      return dB - dA;
    });

    // Basic pagination on merged results
    const start = (page - 1) * pageSize;
    const paged = deduped.slice(start, start + pageSize);

    return res.json({
      query,
      total: deduped.length,
      page,
      pageSize,
      results: paged
    });

  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Search failed", details: err.message });
  }
});

// Simple health endpoint for quick checks
router.get('/health', (req, res) => {
  res.json({ status: 'ok', providers: {
    openalex: typeof searchOpenAlex === 'function',
    doaj: typeof searchDOAJ === 'function',
    core: typeof searchCORE === 'function'
  }});
});

module.exports = router;
