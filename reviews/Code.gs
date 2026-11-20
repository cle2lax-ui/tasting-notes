/**
 * Tasting Notes — Professional Reviews finder.
 * Runs free in your own Google account. For a revealed wine it asks Google's Gemini AI (free plan, with Google Search)
 * for professional critics' reviews, keeps only reviews whose web page Gemini actually found in its search, and returns
 * critic, score, a one-line summary in Gemini's own words, and the link.
 *
 * Set-up: Project Settings › Script properties › add GEMINI_KEY (from aistudio.google.com/apikey).
 * Optional properties: MODEL (default gemini-2.5-flash), MAX_PER_DAY (default 150).
 * Then Deploy › New deployment › Web app · Execute as: Me · Who has access: Anyone. Paste the Web app URL into the app's Settings.
 */
var CRITICS = 'Decanter, James Suckling, Wine Enthusiast, Wine Spectator, Wine Advocate (Robert Parker), Vinous, Jancis Robinson, ' +
  'Jeb Dunnuck, Tim Atkin, Wine & Spirits, Falstaff, Gambero Rosso, Halliday, and critic scores listed on Wine-Searcher';

function doGet() {
  var key = PropertiesService.getScriptProperties().getProperty('GEMINI_KEY');
  return reply({ ok: true, ready: !!key, app: 'Tasting Notes reviews' });
}

function doPost(e) {
  try {
    var q = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var wine = String(q.wine || '').trim().slice(0, 200), vintage = String(q.vintage || '').replace(/[^0-9NnVv]/g, '').slice(0, 4);
    if (!wine) return reply({ ok: false, error: 'No wine name was sent.' });
    var props = PropertiesService.getScriptProperties(), key = props.getProperty('GEMINI_KEY');
    if (!key) return reply({ ok: false, error: 'The script has no GEMINI_KEY yet. Add it under Project Settings › Script properties.' });
    var query = [wine, vintage].filter(String).join(' ');
    var cache = CacheService.getScriptCache(), ck = 'r1:' + Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, query.toLowerCase()));
    var hit = cache.get(ck); if (hit) return reply(JSON.parse(hit));
    // a daily ceiling keeps the free allowance safe even if the link is shared
    var day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd'), max = Number(props.getProperty('MAX_PER_DAY') || 150);
    var used = Number(props.getProperty('used:' + day) || 0);
    if (used >= max) return reply({ ok: false, error: 'Today’s review searches are used up. Try again tomorrow.' });
    props.setProperty('used:' + day, String(used + 1));
    var out = findReviews(key, props.getProperty('MODEL') || 'gemini-2.5-flash', wine, vintage, q);
    out.query = query; out.searchedAt = new Date().toISOString();
    cache.put(ck, JSON.stringify(out), 21600);
    return reply(out);
  } catch (err) {
    return reply({ ok: false, error: String(err && err.message || err) });
  }
}

function findReviews(key, model, wine, vintage, q) {
  var context = [q.grape, q.region, q.country].filter(Boolean).join(', ');
  var prompt = 'Find professional critic reviews of this specific wine: "' + wine + '"' + (vintage ? ' (vintage ' + vintage + ')' : '') +
    (context ? ' — ' + context : '') + '.\n' +
    'Search the web for reviews by ' + CRITICS + '.\n' +
    'Rules:\n- Only reviews of this producer and this cuvée. Skip other wines from the producer.\n' +
    '- Prefer the stated vintage; you may include other vintages but say which vintage each review is for.\n' +
    '- Write each summary yourself in at most 30 words. Do not quote the critic.\n' +
    '- Never invent a score or a review. If you cannot find any, return [].\n' +
    'Reply with only a JSON array, no other text: ' +
    '[{"critic":"name of critic or publication","score":"e.g. 94/100 or 17.5/20, or empty","vintage":"e.g. 2021, or empty","summary":"...","site":"domain of the page, e.g. decanter.com"}]';
  var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': key },
    payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } })
  });
  var code = res.getResponseCode(), body = JSON.parse(res.getContentText() || '{}');
  if (code === 429) return { ok: false, error: 'Google’s free allowance is busy right now. Try again later.' };
  if (code !== 200) return { ok: false, error: (body.error && body.error.message) || ('Gemini error ' + code) };
  var cand = (body.candidates || [])[0] || {};
  var text = ((cand.content && cand.content.parts) || []).map(function (p) { return p.text || ''; }).join('');
  var list = parseJsonArray(text);
  // the pages Gemini actually found; their links are Google redirects, so each is resolved to the real address
  var chunks = ((cand.groundingMetadata && cand.groundingMetadata.groundingChunks) || []).map(function (c) { return c.web; }).filter(Boolean).slice(0, 12);
  var pages = chunks.map(function (w) { var real = resolve(w.uri); return { url: real || w.uri, h: real ? host(real) : host(w.title) }; }).filter(function (p) { return p.url && p.h; });
  var reviews = [];
  list.forEach(function (r) {
    if (!r || !r.critic || !r.summary) return;
    var site = host(String(r.site || '')), page = null;
    pages.forEach(function (p) { var h = p.h; if (!page && site && (h === site || h.slice(-site.length - 1) === '.' + site || site.slice(-h.length - 1) === '.' + h)) page = p; });
    if (!page) return;                                                   // no page found in the search: not shown
    reviews.push({ critic: clean(r.critic, 60), score: clean(r.score, 12), vintage: clean(r.vintage, 4), summary: clean(r.summary, 240), url: page.url });
  });
  return { ok: true, reviews: reviews.slice(0, 6) };
}

function parseJsonArray(t) {
  var m = String(t || '').replace(/```(?:json)?/g, '').match(/\[[\s\S]*\]/);
  if (!m) return [];
  try { var a = JSON.parse(m[0]); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function resolve(u) {
  if (!u) return '';
  if (!/vertexaisearch|grounding-api-redirect/.test(u)) return u;
  try { var r = UrlFetchApp.fetch(u, { followRedirects: false, muteHttpExceptions: true }); var h = r.getHeaders(); return h.Location || h.location || ''; } catch (e) { return ''; }
}
function host(u) { u = String(u || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''); return u.split(/[\/?#]/)[0]; }
function clean(s, n) { return String(s == null ? '' : s).replace(/\s+/g, ' ').replace(/[|]/g, '/').trim().slice(0, n); }
function reply(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
