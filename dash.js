/* Tasting Notes — Dashboard tab, and the grape-name standardizing behind it (also used by the quiet
   "Did you mean…?" hint on the Tasting screen).

   Grape names: every name the taster writes is read the same way, whatever the spelling:
   - synonyms count as one grape (Shiraz = Syrah, Garnacha = Grenache, Spätburgunder = Pinot Noir…);
   - a name one or two letters off a known grape is read as that grape ("Sryah" = Syrah);
   - qualifiers are dropped ("Muscat - unfortified" = Muscat);
   - a blend counts by its family when it is a recognized one (GSM, Bordeaux, Rioja, Champagne, Super Tuscan,
     Bordeaux white, Cape white), otherwise by its first-named (main) grape.
   Nothing saved is rewritten: the Dashboard reads every wine this way each time it draws, so a better rule
   improves every past wine too. */

/* ---- grape names */
var G_EXTRA = ['Meunier', 'Muscadelle', 'Petite Sirah', 'Colombard', 'Macabeo', 'Xarel-lo', 'Parellada', 'Saperavi', 'Cinsault', 'Ugni Blanc',
  'Melon de Bourgogne', 'Spätburgunder', 'Garnacha Tinta', 'Tinta Roriz', 'Moscato', 'Steen', 'Mataro', 'Pinot Nero', 'Cot', 'Grauburgunder', 'Weissburgunder'];
var G_SYN2 = { 'cabernet': 'cabernet sauvignon', 'cab': 'cabernet sauvignon', 'cab sav': 'cabernet sauvignon', 'cab franc': 'cabernet franc', 'pinot meunier': 'meunier',
  'sauv blanc': 'sauvignon blanc', 'chard': 'chardonnay', 'gewurz': 'gewurztraminer', 'gruner': 'gruner veltliner', 'ull de llebre': 'tempranillo', 'mazuelo': 'carignan',
  'garnacha blanca': 'grenache blanc', 'petite syrah': 'petite sirah', 'durif': 'petite sirah', 'carmenere': 'carmenere', 'nerello': 'nerello mascalese', 'melon': 'melon blanc' };
var G_QUAL = /\b(unfortified|fortified|old vines?|vieilles vignes|off dry|dry|sweet|late harvest|reserve|reserva|blend|blends|rose|sparkling|still|dominant|led|based|cuvee|field)\b/g;
var G_IDX = null;
function gNorm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function gKeyOf(n) { var k = gNorm(n); k = G_SYN2[k] || k; return SYNMAP[k] || k; }          // one key per grape, synonyms folded
function gIndex() {
  if (G_IDX) return G_IDX;
  var names = {}, spell = {};                                            // key -> display name; spelling -> the name to suggest
  (window.WSET_LISTS ? WSET_LISTS.grape : []).concat(G_EXTRA).forEach(function (n) {
    var k = gKeyOf(n); if (!names[k]) names[k] = n; if (!spell[gNorm(n)]) spell[gNorm(n)] = n;
  });
  Object.keys(G_SYN2).forEach(function (s) { if (!spell[s] && s.length > 5) spell[s] = names[G_SYN2[s]] || s; });
  G_IDX = { names: names, spell: spell, spellings: Object.keys(spell) };
  return G_IDX;
}
function gDist(a, b, cap) {                                              // edit distance with swapped letters as one edit (Damerau, restricted)
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  var d = [], i, j;
  for (i = 0; i <= a.length; i++) { d[i] = [i]; }
  for (j = 0; j <= b.length; j++) d[0][j] = j;
  for (i = 1; i <= a.length; i++) {
    var best = cap + 1;
    for (j = 1; j <= b.length; j++) {
      var c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      if (d[i][j] < best) best = d[i][j];
    }
    if (best > cap) return cap + 1;
  }
  return d[a.length][b.length];
}
// one written name -> { key, name, raw, fixed (a typo was corrected), known }
function gFix(raw) {
  var I = gIndex(), n = gNorm(raw).replace(G_QUAL, ' ').replace(/\s+/g, ' ').trim();
  if (!n) return null;
  if (n === 'gsm' || n === 'sgm') return { key: 'fam:gsm', name: 'GSM', raw: raw, known: true, gsm: true };
  var k = gKeyOf(n);
  if (I.names[k]) return { key: k, name: I.names[k], raw: raw, known: true, spelled: I.spell[n] || I.names[k] };
  var cap = n.length >= 8 ? 2 : n.length >= 5 ? 1 : 0, best = null, bd = cap + 1, tie = false;
  if (cap) I.spellings.forEach(function (s) { var dd = gDist(n, s, cap); if (dd < bd) { bd = dd; best = s; tie = false; } else if (dd === bd && best && gKeyOf(s) !== gKeyOf(best)) tie = true; });
  if (best && bd <= cap && !tie) { var kk = gKeyOf(best); return { key: kk, name: I.names[kk] || I.spell[best], raw: raw, known: true, fixed: true, spelled: I.spell[best] }; }
  var t = String(raw).trim(); return { key: n, name: t.charAt(0).toUpperCase() + t.slice(1), raw: raw, known: false };
}
function gSplit(raw) { return String(raw || '').split(/\s*(?:,|\/|&|\+|;|\band\b|\s[-–]\s)\s*/i).map(function (p) { return p.trim(); }).filter(Boolean); }
function gTokens(raw) {
  var out = [], seen = {};
  gSplit(raw).forEach(function (p) {
    var f = gFix(p); if (!f) return;
    (f.gsm ? ['grenache', 'syrah', 'mourvedre'].map(function (k) { return { key: k, name: gIndex().names[k], raw: p, known: true }; }) : [f]).forEach(function (x) {
      if (!seen[x.key]) { seen[x.key] = 1; out.push(x); } });
  });
  return out;
}
var G_FAMS = [                                                            // recognized blends; profile = the grape whose structure stands in for the family
  { id: 'gsm', label: 'GSM blend', profile: 'grenache', test: function (h, n) { return (h.grenache && (h.syrah || h.mourvedre)) || (h.mourvedre && h.syrah); } },
  { id: 'bdx', label: 'Bordeaux blend', profile: 'cabernet sauvignon', test: function (h, n, all) { return n >= 2 && all(['cabernet sauvignon', 'merlot', 'cabernet franc', 'petit verdot', 'malbec', 'carmenere']); } },
  { id: 'bdxw', label: 'Bordeaux white blend', profile: 'sauvignon blanc', test: function (h, n, all) { return h['sauvignon blanc'] && h.semillon && all(['sauvignon blanc', 'semillon', 'muscadelle']); } },
  { id: 'rioja', label: 'Rioja blend', profile: 'tempranillo', test: function (h) { return h.tempranillo && (h.grenache || h.graciano || h.carignan); } },
  { id: 'champ', label: 'Champagne blend', profile: '', test: function (h, n, all) { return n >= 2 && all(['chardonnay', 'pinot noir', 'meunier']); } },
  { id: 'stus', label: 'Super Tuscan', profile: 'sangiovese', test: function (h) { return h.sangiovese && (h['cabernet sauvignon'] || h.merlot || h['cabernet franc']); } },
  { id: 'capew', label: 'Cape white blend', profile: 'chenin blanc', test: function (h, n) { return h['chenin blanc'] && n >= 2; } }
];
// the group a wine's grape answer counts in: { key, label, profile, keys }
function grapeGroup(raw) {
  var t = gTokens(raw); if (!t.length) return null;
  var keys = t.map(function (x) { return x.key; }), h = {}; keys.forEach(function (k) { h[k] = 1; });
  var all = function (set) { return keys.every(function (k) { return set.indexOf(k) >= 0; }); };
  if (keys.length > 1) for (var i = 0; i < G_FAMS.length; i++) if (G_FAMS[i].test(h, keys.length, all)) return { key: 'fam:' + G_FAMS[i].id, label: G_FAMS[i].label, profile: G_FAMS[i].profile, keys: keys };
  return { key: keys[0], label: t[0].name, profile: keys[0], keys: keys };
}
// the quiet hint: a corrected spelling, only when something was actually misspelled
function grapeHint(raw) {
  var parts = gSplit(raw); if (!parts.length) return '';
  var any = false, out = parts.map(function (p) { var f = gFix(p); if (f && f.fixed) { any = true; return f.spelled || f.name; } return p; });
  return any ? out.join(', ') : '';
}

/* ---- typical structure by grape (WSET D3 norms), on the SAT's five steps: 0 Low/Light, 1 Medium Minus, 2 Medium, 3 Medium Plus, 4 High/Full */
var G_PRO = {
  'pinot noir': { acidity: [3, 4], tannin: [1, 3], body: [1, 3], alcohol: [2, 3] }, 'nebbiolo': { acidity: [3, 4], tannin: [4, 4], body: [2, 4], alcohol: [3, 4] },
  'syrah': { acidity: [2, 3], tannin: [2, 4], body: [2, 4], alcohol: [2, 4] }, 'grenache': { acidity: [1, 2], tannin: [1, 3], body: [2, 4], alcohol: [3, 4] },
  'merlot': { acidity: [2, 3], tannin: [2, 3], body: [2, 4], alcohol: [2, 4] }, 'cabernet sauvignon': { acidity: [3, 4], tannin: [3, 4], body: [2, 4], alcohol: [2, 4] },
  'cabernet franc': { acidity: [3, 3], tannin: [2, 3], body: [2, 3], alcohol: [2, 3] }, 'malbec': { acidity: [2, 3], tannin: [2, 3], body: [3, 4], alcohol: [2, 4] },
  'tempranillo': { acidity: [2, 3], tannin: [2, 3], body: [2, 3], alcohol: [2, 3] }, 'sangiovese': { acidity: [3, 4], tannin: [3, 4], body: [2, 3], alcohol: [2, 3] },
  'barbera': { acidity: [4, 4], tannin: [1, 2], body: [2, 3], alcohol: [2, 3] }, 'gamay': { acidity: [3, 4], tannin: [0, 1], body: [0, 2], alcohol: [1, 2] },
  'zinfandel': { acidity: [2, 3], tannin: [2, 3], body: [3, 4], alcohol: [4, 4] }, 'mourvedre': { acidity: [2, 3], tannin: [3, 4], body: [3, 4], alcohol: [3, 4] },
  'xinomavro': { acidity: [4, 4], tannin: [4, 4], body: [2, 3], alcohol: [2, 3] }, 'pinotage': { acidity: [2, 3], tannin: [2, 3], body: [3, 4], alcohol: [3, 4] },
  'carmenere': { acidity: [2, 3], tannin: [2, 3], body: [2, 3], alcohol: [2, 3] }, 'touriga nacional': { acidity: [2, 3], tannin: [3, 4], body: [3, 4], alcohol: [3, 4] },
  'aglianico': { acidity: [4, 4], tannin: [4, 4], body: [3, 4], alcohol: [3, 4] }, 'cinsault': { acidity: [2, 3], tannin: [1, 2], body: [1, 2], alcohol: [2, 3] },
  'carignan': { acidity: [3, 4], tannin: [3, 4], body: [2, 3], alcohol: [2, 3] }, 'blaufrankisch': { acidity: [3, 4], tannin: [2, 3], body: [2, 3], alcohol: [2, 3] },
  'chardonnay': { acidity: [2, 4], body: [2, 4], alcohol: [2, 4] }, 'sauvignon blanc': { acidity: [3, 4], body: [1, 2], alcohol: [2, 3] },
  'riesling': { acidity: [4, 4], body: [0, 2], alcohol: [0, 2] }, 'chenin blanc': { acidity: [4, 4], body: [2, 3], alcohol: [2, 3] },
  'viognier': { acidity: [1, 2], body: [3, 4], alcohol: [3, 4] }, 'gewurztraminer': { acidity: [1, 2], body: [3, 4], alcohol: [3, 4] },
  'muscat': { acidity: [1, 3], body: [1, 3], alcohol: [1, 3] }, 'pinot gris': { acidity: [1, 3], body: [2, 4], alcohol: [2, 4] },
  'pinot blanc': { acidity: [2, 3], body: [2, 3], alcohol: [2, 3] }, 'semillon': { acidity: [2, 3], body: [2, 3], alcohol: [2, 3] },
  'gruner veltliner': { acidity: [3, 4], body: [1, 3], alcohol: [2, 3] }, 'albarino': { acidity: [3, 4], body: [1, 2], alcohol: [2, 2] },
  'assyrtiko': { acidity: [4, 4], body: [2, 3], alcohol: [3, 4] }, 'melon blanc': { acidity: [3, 4], body: [0, 1], alcohol: [1, 2] },
  'grenache blanc': { acidity: [1, 2], body: [3, 4], alcohol: [3, 4] }, 'marsanne': { acidity: [1, 2], body: [3, 4], alcohol: [3, 4] },
  'roussanne': { acidity: [2, 3], body: [3, 4], alcohol: [3, 4] }, 'torrontes': { acidity: [2, 3], body: [2, 3], alcohol: [3, 4] },
  'furmint': { acidity: [4, 4], body: [2, 4], alcohol: [2, 4] }, 'vermentino': { acidity: [2, 3], body: [1, 3], alcohol: [2, 3] }
};
var LV = { 'low': 0, 'light': 0, 'short': 0, 'medium minus': 1, 'medium': 2, 'medium plus': 3, 'high': 4, 'full': 4, 'long': 4, 'pronounced': 4 };
function lvOf(v) { var k = low(v); return k in LV ? LV[k] : null; }
var LV_NAME = { acidity: ['Low', 'Medium Minus', 'Medium', 'Medium Plus', 'High'], tannin: ['Low', 'Medium Minus', 'Medium', 'Medium Plus', 'High'],
  alcohol: ['Low', 'Medium Minus', 'Medium', 'Medium Plus', 'High'], body: ['Light', 'Medium Minus', 'Medium', 'Medium Plus', 'Full'] };
function rangeText(c, r) { var n = LV_NAME[c]; return r[0] === r[1] ? n[r[0]] : n[r[0]] + ' to ' + n[r[1]]; }

/* ---- what the dashboard reads from each wine */
var D3_COUNTRIES = ['France', 'Germany', 'Austria', 'Hungary', 'Greece', 'Italy', 'Spain', 'Portugal', 'USA', 'Canada', 'Chile', 'Argentina', 'South Africa', 'Australia', 'New Zealand', 'China'];
function wStyle(w) {
  if (w.type === 'Sparkling') return 'Sparkling';
  var txt = [w.producer, w.aRegion, w.aGrape, w.appNotes, w.palate].join(' ');
  if (/\b(port|porto|sherry|jerez|fino|manzanilla|amontillado|oloroso|palo cortado|madeira|marsala|banyuls|maury|vin doux naturel|tawny|lbv|colheita|rutherglen muscat|topaque)\b/i.test(txt)) return 'Fortified';
  if (/\b(champagne|cava|cr[eé]mant|prosecco|franciacorta|sekt|cap classique|trentodoc|sparkling|spumante|brut|p[eé]t[- ]?nat|m[eé]thode)\b/i.test(txt)) return 'Sparkling';
  if (/^(medium sweet|sweet|luscious)$/i.test(String(w.sweetness || ''))) return 'Sweet';
  return w.type === 'Red' ? 'Red' : w.type === 'Rosé' ? 'Rosé' : 'White';
}
function isBlind(w) { return !w.open && !!(String(w.gGrape || '') + String(w.gCountry || '') + String(w.gRegion || '') + String(w.gVintage || '')).trim(); }
function wPts(w) {                                                        // [grape, country, region, vintage] points, null where no answer
  var kinds = ['grape', '', 'region', 'vintage'], P = [['gGrape', 'aGrape'], ['gCountry', 'aCountry'], ['gRegion', 'aRegion'], ['gVintage', 'aVintage']];
  return P.map(function (p, i) { return String(w[p[1]] || '').trim() ? answerPoints(w[p[0]], w[p[1]], kinds[i]) : null; });
}
function criticScore(w) {
  var r = rvParse(w.reviews), pro = [], agg = [];
  r.items.forEach(function (x) { var m = String(x.score || '').match(/(\d{2,3}(?:\.\d)?)\s*\/\s*100/); if (!m) return; (RV_AGG[x.critic] ? agg : pro).push(+m[1]); });
  var s = pro.length ? pro : agg; return s.length ? Math.round(s.reduce(function (a, b) { return a + b; }, 0) / s.length * 10) / 10 : null;
}
function priceOf(w) { var p = parseFloat(String(w.price || '').replace(/[^0-9.]/g, '')); return isNaN(p) || !p ? null : p; }
var QLEVELS = ['Poor', 'Acceptable', 'Good', 'Very Good', 'Outstanding'];
function median(a) { if (!a.length) return null; var s = a.slice().sort(function (x, y) { return x - y; }), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }
function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
function money(n) { return '$' + (n % 1 ? n.toFixed(2) : n); }
function shortDate(ymd) { var d = new Date(ymd + 'T12:00:00'); return isNaN(d) ? ymd : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function half(n) { return fmtScore(n) || '0'; }

/* ---- the Dashboard */
var DASH = recall('btn-dash') || {}; DASH.scope = DASH.scope || 'all'; DASH.style = DASH.style || 'all';
function dashWines() {
  var cut = ''; if (DASH.scope === 'recent') { var d = new Date(); d.setDate(d.getDate() - 30); cut = d.toISOString().slice(0, 10); }
  return ALL.filter(function (w) {
    if (!w.ymd) return false;
    if (DASH.scope === 'blind' && !isBlind(w)) return false;
    if (cut && w.ymd < cut) return false;
    if (DASH.style !== 'all' && wStyle(w) !== DASH.style) return false;
    return true;
  }).sort(function (a, b) { return a.ymd.localeCompare(b.ymd) || a.wineNo - b.wineNo; });
}
function chipRow(name, opts, cur) {
  return '<div class="db-chips" role="group" aria-label="' + name + '">' + opts.map(function (o) {
    return '<button type="button" class="db-chip' + (o[0] === cur ? ' on' : '') + '" aria-pressed="' + (o[0] === cur) + '" data-db-' + name + '="' + o[0] + '">' + o[1] + '</button>'; }).join('') + '</div>';
}
function card(cls, eyebrow, title, body) { return '<section class="db-card ' + (cls || '') + '"><p class="db-eb">' + eyebrow + '</p>' + (title ? '<h3 class="db-h">' + title + '</h3>' : '') + body + '</section>'; }
function coach(t) { return t ? '<p class="db-coach">' + t + '</p>' : ''; }
function bar(label, frac, val, cls) { return '<div class="db-bar"><span class="db-bl">' + label + '</span><span class="db-track"><i class="' + (cls || '') + '" style="width:' + Math.max(0, Math.min(100, frac * 100)).toFixed(1) + '%"></i></span><span class="db-bv">' + val + '</span></div>'; }

var DW = 0;                                                               // the card width the charts are drawn for (1 chart unit = 1 screen pixel on phones)
function renderDash() {
  var el = $('dash'); if (!el) return;
  DW = el.clientWidth || 1000;
  var W = dashWines(), B = W.filter(isBlind);
  var h = '<div class="db-top"><div><p class="db-eb">' + (W.length ? shortDate(W[0].ymd) + ' – ' + shortDate(W[W.length - 1].ymd) + ', ' + W[W.length - 1].ymd.slice(0, 4) + ' · ' : '') + W.length + ' wine' + (W.length === 1 ? '' : 's') + '</p>' +
    '<h2 class="db-title">How your palate is tracking</h2>' + (W.length ? '<button type="button" class="btn db-pdf" data-db-pdf><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 2.5v7.5M5 7l3 3 3-3"/><path d="M3 11v2.5h10V11"/></svg>Share as PDF</button>' : '') + '</div><div class="db-filters">' +
    chipRow('scope', [['all', 'All wines'], ['blind', 'Blind only'], ['recent', 'Last 30 days']], DASH.scope) +
    chipRow('style', [['all', 'All styles'], ['Red', 'Red'], ['White', 'White'], ['Rosé', 'Rosé'], ['Sparkling', 'Sparkling'], ['Fortified', 'Fortified'], ['Sweet', 'Sweet']], DASH.style) + '</div></div>';
  if (!W.length) { el.innerHTML = h + '<div class="db-empty">' + (ALL.length ? 'No wines match these filters.' : 'Taste a few wines and your dashboard fills in here.') + '</div>'; return; }
  h += kpis(W, B);
  h += '<div class="db-row">' + accuracy(B) + sessions(B) + '</div>';
  h += '<div class="db-row db-35">' + habits(W) + words(W) + '</div>';
  h += coverage(W);
  h += mixups(B);                                                        // grape mix-ups and accuracy by grape
  h += '<div class="db-row db-35">' + calibration(W) + value(W) + '</div>';   // last: the two that compare with outside sources (critics, prices)
  h += priceByRating(W);
  el.innerHTML = h;
}

var FLAG_ISO = { 'France': 'FR', 'Italy': 'IT', 'Spain': 'ES', 'Portugal': 'PT', 'Germany': 'DE', 'Austria': 'AT', 'Hungary': 'HU', 'Greece': 'GR', 'USA': 'US',
  'Canada': 'CA', 'Chile': 'CL', 'Argentina': 'AR', 'Uruguay': 'UY', 'Brazil': 'BR', 'Australia': 'AU', 'New Zealand': 'NZ', 'South Africa': 'ZA', 'China': 'CN', 'Japan': 'JP',
  'Lebanon': 'LB', 'Israel': 'IL', 'Georgia': 'GE', 'England': 'GB', 'Switzerland': 'CH', 'Slovenia': 'SI', 'Croatia': 'HR', 'Mexico': 'MX', 'Moldova': 'MD', 'Romania': 'RO', 'Bulgaria': 'BG', 'Turkey': 'TR' };
/* ---- country flags, drawn (not emoji) so they look the same in the app and in the PDF.
   Each is a list of shapes on a 30 x 20 box: r = rectangle, p = polygon, c = circle, s = five-point star. Simplified at small sizes (no coats of arms). */
function fstar(cx, cy, r) { var pts = []; for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } return pts; }
function hstripes(cols) { var h = 20 / cols.length; return cols.map(function (c, i) { return ['r', 0, i * h, 30, h + 0.05, c]; }); }
function vstripes(cols) { var w = 30 / cols.length; return cols.map(function (c, i) { return ['r', i * w, 0, w + 0.05, 20, c]; }); }
function ujack(w, h) {                                                   // a small Union Jack for a canton
  var t = w * 0.12, ts = h * 0.12;
  return [['r', 0, 0, w, h, '#012169'], ['p', [[0, 0], [t, 0], [w, h - ts], [w, h], [w - t, h], [0, ts]], '#FFFFFF'], ['p', [[w, 0], [w, ts], [t, h], [0, h], [0, h - ts], [w - t, 0]], '#FFFFFF'],
    ['r', w * 0.4, 0, w * 0.2, h, '#FFFFFF'], ['r', 0, h * 0.35, w, h * 0.3, '#FFFFFF'], ['r', w * 0.45, 0, w * 0.1, h, '#C8102E'], ['r', 0, h * 0.42, w, h * 0.16, '#C8102E']];
}
var FLAGS = {
  'France': vstripes(['#0055A4', '#FFFFFF', '#EF4135']), 'Italy': vstripes(['#009246', '#FFFFFF', '#CE2B37']), 'Germany': hstripes(['#000000', '#DD0000', '#FFCE00']),
  'Austria': hstripes(['#ED2939', '#FFFFFF', '#ED2939']), 'Hungary': hstripes(['#CD2A3E', '#FFFFFF', '#436F4D']),
  'Spain': [['r', 0, 0, 30, 20, '#AA151B'], ['r', 0, 5, 30, 10, '#F1BF00']],
  'Portugal': [['r', 0, 0, 30, 20, '#FF0000'], ['r', 0, 0, 12, 20, '#006600'], ['c', 12, 10, 3.6, '#FFCC00'], ['c', 12, 10, 2.2, '#FF0000']],
  'Greece': (function () { var a = []; for (var i = 0; i < 9; i++) a.push(['r', 0, i * 20 / 9, 30, 20 / 9 + 0.05, i % 2 ? '#FFFFFF' : '#0D5EAF']); return a.concat([['r', 0, 0, 11.1, 11.1, '#0D5EAF'], ['r', 4.45, 0, 2.2, 11.1, '#FFFFFF'], ['r', 0, 4.45, 11.1, 2.2, '#FFFFFF']]); })(),
  'USA': (function () { var a = []; for (var i = 0; i < 13; i++) a.push(['r', 0, i * 20 / 13, 30, 20 / 13 + 0.05, i % 2 ? '#FFFFFF' : '#B22234']); a.push(['r', 0, 0, 12, 20 * 7 / 13, '#3C3B6E']);
    for (var r = 0; r < 4; r++) for (var c = 0; c < 5; c++) a.push(['c', 1.4 + c * 2.3 + (r % 2) * 1.1, 1.4 + r * 2.5, 0.45, '#FFFFFF']); return a; })(),
  'Canada': [['r', 0, 0, 30, 20, '#FFFFFF'], ['r', 0, 0, 7.5, 20, '#D80621'], ['r', 22.5, 0, 7.5, 20, '#D80621'],
    ['p', [[15, 3.2], [16.3, 5.8], [18, 5.2], [17.4, 9], [19.6, 7.4], [20.2, 8.8], [21.8, 8.4], [21, 11], [22, 11.6], [18.2, 14.2], [18.6, 15.4], [15.4, 15], [15.4, 18], [14.6, 18], [14.6, 15], [11.4, 15.4], [11.8, 14.2], [8, 11.6], [9, 11], [8.2, 8.4], [9.8, 8.8], [10.4, 7.4], [12.6, 9], [12, 5.2], [13.7, 5.8]], '#D80621']],
  'Chile': [['r', 0, 0, 30, 10, '#FFFFFF'], ['r', 0, 10, 30, 10, '#D52B1E'], ['r', 0, 0, 10, 10, '#0039A6'], ['s', 5, 5, 3, '#FFFFFF']],
  'Argentina': hstripes(['#74ACDF', '#FFFFFF', '#74ACDF']).concat([['c', 15, 10, 2.4, '#F6B40E']]),
  'South Africa': [['r', 0, 0, 30, 10, '#E03C31'], ['r', 0, 10, 30, 10, '#001489'], ['p', [[0, 0], [5, 0], [13.5, 7.6], [30, 7.6], [30, 12.4], [13.5, 12.4], [5, 20], [0, 20]], '#FFFFFF'],
    ['p', [[0, 1.6], [2.6, 0], [3.8, 0], [12.8, 8.8], [30, 8.8], [30, 11.2], [12.8, 11.2], [3.8, 20], [2.6, 20], [0, 18.4]], '#007749'], ['p', [[0, 3.4], [8.6, 10], [0, 16.6]], '#FFB612'], ['p', [[0, 5], [6.6, 10], [0, 15]], '#000000']],
  'Australia': [['r', 0, 0, 30, 20, '#012169']].concat(ujack(15, 10), [['s', 7.5, 15, 2.2, '#FFFFFF'], ['s', 22.5, 4, 1.2, '#FFFFFF'], ['s', 19, 9, 1.2, '#FFFFFF'], ['s', 26, 8, 1.2, '#FFFFFF'], ['s', 22.5, 16, 1.3, '#FFFFFF'], ['s', 24.4, 11.2, 0.7, '#FFFFFF']]),
  'New Zealand': [['r', 0, 0, 30, 20, '#012169']].concat(ujack(15, 10), [['s', 22.5, 4, 1.6, '#FFFFFF'], ['s', 22.5, 4, 1.05, '#C8102E'], ['s', 19, 9.5, 1.6, '#FFFFFF'], ['s', 19, 9.5, 1.05, '#C8102E'],
    ['s', 25.6, 8.5, 1.4, '#FFFFFF'], ['s', 25.6, 8.5, 0.9, '#C8102E'], ['s', 22.5, 16, 1.8, '#FFFFFF'], ['s', 22.5, 16, 1.2, '#C8102E']]),
  'China': [['r', 0, 0, 30, 20, '#EE1C25'], ['s', 5, 5, 3, '#FFFF00'], ['s', 10, 2, 1, '#FFFF00'], ['s', 12, 4, 1, '#FFFF00'], ['s', 12, 7, 1, '#FFFF00'], ['s', 10, 9, 1, '#FFFF00']],
  'England': [['r', 0, 0, 30, 20, '#FFFFFF'], ['r', 13, 0, 4, 20, '#CE1124'], ['r', 0, 8, 30, 4, '#CE1124']],
  'Switzerland': [['r', 0, 0, 30, 20, '#DA291C'], ['r', 13, 4, 4, 12, '#FFFFFF'], ['r', 9, 8, 12, 4, '#FFFFFF']],
  'Japan': [['r', 0, 0, 30, 20, '#FFFFFF'], ['c', 15, 10, 6, '#BC002D']],
  'Uruguay': (function () { var a = []; for (var i = 0; i < 9; i++) a.push(['r', 0, i * 20 / 9, 30, 20 / 9 + 0.05, i % 2 ? '#0038A8' : '#FFFFFF']); return a.concat([['r', 0, 0, 11, 11.1, '#FFFFFF'], ['c', 5.5, 5.5, 3, '#FCD116']]); })(),
  'Brazil': [['r', 0, 0, 30, 20, '#009C3B'], ['p', [[15, 2], [28, 10], [15, 18], [2, 10]], '#FFDF00'], ['c', 15, 10, 4.6, '#002776']],
  'Lebanon': [['r', 0, 0, 30, 20, '#ED1C24'], ['r', 0, 5, 30, 10, '#FFFFFF'], ['p', [[15, 6], [19, 13.5], [11, 13.5]], '#00A651']],
  'Israel': [['r', 0, 0, 30, 20, '#FFFFFF'], ['r', 0, 2, 30, 2.8, '#0038B8'], ['r', 0, 15.2, 30, 2.8, '#0038B8'], ['p', [[15, 6.4], [18.2, 12], [11.8, 12]], '#0038B8'], ['p', [[15, 7.8], [17, 11.2], [13, 11.2]], '#FFFFFF'],
    ['p', [[15, 13.6], [11.8, 8], [18.2, 8]], '#0038B8'], ['p', [[15, 12.2], [13, 8.8], [17, 8.8]], '#FFFFFF']],
  'Georgia': [['r', 0, 0, 30, 20, '#FFFFFF'], ['r', 13, 0, 4, 20, '#FF0000'], ['r', 0, 8, 30, 4, '#FF0000'], ['r', 5, 2.6, 2.4, 2.4, '#FF0000'], ['r', 22.6, 2.6, 2.4, 2.4, '#FF0000'], ['r', 5, 15, 2.4, 2.4, '#FF0000'], ['r', 22.6, 15, 2.4, 2.4, '#FF0000']],
  'Slovenia': hstripes(['#FFFFFF', '#005DA4', '#ED1C24']).concat([['p', [[6, 3.4], [11, 3.4], [11, 9.6], [8.5, 11.6], [6, 9.6]], '#005DA4'], ['p', [[6.8, 9.2], [8.5, 7], [10.2, 9.2], [8.5, 10.6]], '#FFFFFF']]),
  'Croatia': hstripes(['#FF0000', '#FFFFFF', '#171796']).concat((function () { var a = [['r', 12.5, 4.5, 5, 6.5, '#FFFFFF']]; for (var r = 0; r < 4; r++) for (var c = 0; c < 3; c++) if ((r + c) % 2 === 0) a.push(['r', 12.5 + c * 5 / 3, 4.5 + r * 6.5 / 4, 5 / 3 + 0.02, 6.5 / 4 + 0.02, '#FF0000']); return a; })()), 'Bulgaria': hstripes(['#FFFFFF', '#00966E', '#D62612']),
  'Mexico': vstripes(['#006847', '#FFFFFF', '#CE1126']), 'Romania': vstripes(['#002B7F', '#FCD116', '#CE1126']), 'Moldova': vstripes(['#0046AE', '#FFD200', '#CC092F']),
  'Turkey': [['r', 0, 0, 30, 20, '#E30A17'], ['c', 11, 10, 5, '#FFFFFF'], ['c', 12.3, 10, 4, '#E30A17'], ['s', 17.4, 10, 2.2, '#FFFFFF']]
};
// the flag as inline SVG (h = height in px); empty for a country without one
function flagSvg(c, h) {
  var F = FLAGS[c]; if (!F) return '';
  var b = F.map(function (s) { if (s[0] === 'r') return '<rect x="' + s[1] + '" y="' + s[2] + '" width="' + s[3] + '" height="' + s[4] + '" fill="' + s[5] + '"/>';
    if (s[0] === 'c') return '<circle cx="' + s[1] + '" cy="' + s[2] + '" r="' + s[3] + '" fill="' + s[4] + '"/>';
    var pts = s[0] === 's' ? fstar(s[1], s[2], s[3]) : s[1]; return '<polygon points="' + pts.map(function (q) { return q[0].toFixed(2) + ',' + q[1].toFixed(2); }).join(' ') + '" fill="' + (s[0] === 's' ? s[4] : s[2]) + '"/>'; }).join('');
  return '<svg class="db-flagsvg" viewBox="0 0 30 20" width="' + (h * 1.5).toFixed(1) + '" height="' + h + '" role="img" aria-label="Flag of ' + esc(c) + '"><clipPath id="fc-' + c.replace(/\W/g, '') + h + '"><rect width="30" height="20" rx="2"/></clipPath><g clip-path="url(#fc-' + c.replace(/\W/g, '') + h + ')">' + b + '</g><rect width="30" height="20" rx="2" fill="none" stroke="rgba(0,0,0,.18)" stroke-width=".6"/></svg>';
}
// the same flag drawn into a jsPDF document at x, y, h points tall
function flagPdf(D, c, x, y, h) {
  var F = FLAGS[c]; if (!F) return false; var k = h / 20;
  F.forEach(function (s) {
    if (s[0] === 'r') { D.setFillColor(s[5]); D.rect(x + s[1] * k, y + s[2] * k, s[3] * k, s[4] * k, 'F'); return; }
    if (s[0] === 'c') { D.setFillColor(s[4]); D.circle(x + s[1] * k, y + s[2] * k, s[3] * k, 'F'); return; }
    var pts = s[0] === 's' ? fstar(s[1], s[2], s[3]) : s[1], col = s[0] === 's' ? s[4] : s[2], segs = [];
    for (var i = 1; i < pts.length; i++) segs.push([(pts[i][0] - pts[i - 1][0]) * k, (pts[i][1] - pts[i - 1][1]) * k]);
    D.setFillColor(col); D.lines(segs, x + pts[0][0] * k, y + pts[0][1] * k, [1, 1], 'F', true);
  });
  D.setDrawColor('#CFC6BE'); D.setLineWidth(.35); D.rect(x, y, 30 * k, h, 'S');
  return true;
}
function flagOf(c) { var iso = FLAG_ISO[c]; return iso ? iso.replace(/./g, function (ch) { return String.fromCodePoint(127397 + ch.charCodeAt(0)); }) : ''; }
function countryName(raw) {                                              // one spelling per country (USA = United States = US)
  var k = answerKey(raw); if (!k) return '';
  var hit = Object.keys(FLAG_ISO).filter(function (c) { return answerKey(c) === k; })[0];
  return hit || String(raw).trim();
}
function countryTile(W) {
  var cnt = {}; W.forEach(function (w) { var c = countryName(w.aCountry); if (c) cnt[c] = (cnt[c] || 0) + 1; });
  var cs = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
  if (!cs.length) return '<div class="db-card db-kpi"><p class="db-eb">Most tasted country</p><div class="db-big">–</div><p class="db-sub">Fill in a wine’s country to see this</p></div>';
  var top = cs.filter(function (c) { return cnt[c] === cnt[cs[0]]; }), next = cs.filter(function (c) { return cnt[c] < cnt[cs[0]]; }), n2 = next.length ? cnt[next[0]] : 0, nx = next.filter(function (c) { return cnt[c] === n2; });
  var sub = cnt[top[0]] + ' of ' + W.length + ' wines' + (top.length > 1 ? ' each' : '') + (nx.length ? ' · next ' + andList(nx.slice(0, 2)) + (nx.length > 2 ? ' and others' : '') + ', ' + n2 : '');
  return '<div class="db-card db-kpi"><p class="db-eb">Most tasted country</p><div class="db-ctry">' + top.slice(0, 2).map(function (c) { var f = flagOf(c);
    return '<span>' + (FLAGS[c] ? flagSvg(c, 26) : f ? '<span class="db-flag" role="img" aria-label="Flag of ' + esc(c) + '">' + f + '</span>' : '') + '<b>' + esc(c) + '</b></span>'; }).join('') + '</div><p class="db-sub">' + esc(sub) + '</p></div>';
}
function kpis(W, B) {
  var pts = 0, of = 0, vin = 0, vn = 0, miss = 0;
  B.forEach(function (w) { wPts(w).forEach(function (p, i) { if (p === null) return; pts += p; of++; }); var gy = parseInt(w.gVintage, 10), ay = parseInt(w.aVintage, 10); if (!isNaN(gy) && !isNaN(ay)) { vn++; if (Math.abs(gy - ay) <= 1) vin++; miss += Math.abs(gy - ay); } });
  var pr = W.map(priceOf).filter(function (p) { return p !== null; }), md = median(pr);
  var tile = function (eb, big, sub, cls) { return '<div class="db-card db-kpi"><p class="db-eb">' + eb + '</p><div class="db-big' + (cls ? ' ' + cls : '') + '">' + big + '</div><p class="db-sub">' + sub + '</p></div>'; };
  return '<div class="db-kpis">' +
    tile('Wines tasted', W.length, B.length + ' blind · ' + (W.length - B.length) + ' tasted open') +
    tile('Blind score', of ? pct(pts, of) + '%' : '–', of ? half(pts) + ' of ' + of + ' points · ' + (pts / B.length).toFixed(1) + ' per wine' : 'No blind wines yet', 'sig') +
    countryTile(W) +
    tile('Median bottle', md !== null ? money(Math.round(md)) : '–', pr.length ? money(Math.min.apply(null, pr)) + ' to ' + money(Math.max.apply(null, pr)) + ' · ' + pr.length + ' priced' : 'No prices yet') + '</div>';
}

/* ---- why region points slip. Each answer scores on its own, but the region guess tends to follow the grape guess:
   tasters name the grape's textbook home. This finds that pattern and says where the wines really came from. */
var G_HOME = {
  'syrah': ['barossa', 'northern rhone', 'hermitage', 'crozes', 'cornas', 'cote rotie', 'saint joseph', 'mclaren vale'], 'grenache': ['chateauneuf', 'southern rhone', 'priorat', 'barossa', 'gigondas', 'cotes du rhone'],
  'fam:gsm': ['chateauneuf', 'southern rhone', 'cotes du rhone', 'gigondas', 'barossa', 'mclaren vale'], 'nebbiolo': ['barolo', 'barbaresco', 'langhe', 'piedmont', 'roero'],
  'tempranillo': ['rioja', 'ribera', 'toro'], 'fam:rioja': ['rioja'], 'chenin blanc': ['vouvray', 'savennieres', 'loire', 'stellenbosch', 'swartland', 'anjou'],
  'melon blanc': ['muscadet'], 'chardonnay': ['burgundy', 'chablis', 'cote de beaune', 'meursault', 'puligny', 'montrachet', 'napa', 'sonoma', 'macon', 'pouilly fuisse', 'margaret river'],
  'sauvignon blanc': ['sancerre', 'pouilly fume', 'marlborough', 'loire', 'napa', 'touraine'], 'pinot noir': ['burgundy', 'cote de nuits', 'cote de beaune', 'willamette', 'central otago', 'russian river', 'sonoma', 'martinborough'],
  'merlot': ['right bank', 'pomerol', 'saint emilion', 'st emilion'], 'cabernet sauvignon': ['napa', 'medoc', 'pauillac', 'margaux', 'left bank', 'coonawarra', 'maipo'], 'fam:bdx': ['bordeaux', 'medoc', 'left bank', 'right bank', 'pauillac', 'margaux'],
  'malbec': ['mendoza', 'cahors', 'uco'], 'xinomavro': ['naoussa', 'naossa'], 'muscat': ['rutherglen', 'alsace', 'beaumes de venise'], 'riesling': ['mosel', 'rheingau', 'clare', 'eden', 'alsace', 'wachau'],
  'gewurztraminer': ['alsace'], 'viognier': ['condrieu'], 'sangiovese': ['chianti', 'montalcino', 'brunello', 'montepulciano', 'tuscany'], 'zinfandel': ['sonoma', 'lodi', 'dry creek', 'paso robles'],
  'pinotage': ['stellenbosch'], 'assyrtiko': ['santorini'], 'gruner veltliner': ['wachau', 'kamptal', 'kremstal'], 'albarino': ['rias baixas'], 'torrontes': ['salta', 'cafayate'],
  'carmenere': ['colchagua', 'rapel'], 'barbera': ['barbera d asti', 'barbera d alba', 'piedmont'], 'gamay': ['beaujolais', 'fleurie', 'morgon'], 'pinot gris': ['alsace', 'willamette'],
  'fam:bdxw': ['bordeaux', 'graves', 'pessac', 'sauternes'], 'fam:champ': ['champagne'], 'fam:stus': ['bolgheri', 'tuscany', 'toscana']
};
// each grape's true home (where the grape comes from); G_HOME above also counts the famous New World benchmarks (Napa, Barossa…)
var G_ORIGIN = {
  'syrah': ['northern rhone', 'hermitage', 'crozes', 'cornas', 'cote rotie', 'saint joseph'], 'grenache': ['chateauneuf', 'southern rhone', 'gigondas', 'cotes du rhone'],
  'fam:gsm': ['chateauneuf', 'southern rhone', 'cotes du rhone', 'gigondas'], 'nebbiolo': ['barolo', 'barbaresco', 'langhe', 'piedmont', 'roero'], 'tempranillo': ['rioja', 'ribera', 'toro'],
  'fam:rioja': ['rioja'], 'chenin blanc': ['vouvray', 'savennieres', 'loire', 'anjou'], 'melon blanc': ['muscadet'],
  'chardonnay': ['burgundy', 'chablis', 'cote de beaune', 'meursault', 'puligny', 'montrachet', 'macon', 'pouilly fuisse'], 'sauvignon blanc': ['sancerre', 'pouilly fume', 'loire', 'touraine'],
  'pinot noir': ['burgundy', 'cote de nuits', 'cote de beaune'], 'merlot': ['right bank', 'pomerol', 'saint emilion', 'st emilion'], 'cabernet sauvignon': ['medoc', 'pauillac', 'margaux', 'left bank'],
  'fam:bdx': ['bordeaux', 'medoc', 'left bank', 'right bank', 'pauillac', 'margaux'], 'malbec': ['cahors'], 'xinomavro': ['naoussa', 'naossa'], 'riesling': ['mosel', 'rheingau'],
  'gewurztraminer': ['alsace'], 'viognier': ['condrieu'], 'sangiovese': ['chianti', 'montalcino', 'brunello', 'montepulciano', 'tuscany'], 'assyrtiko': ['santorini'],
  'gruner veltliner': ['wachau', 'kamptal', 'kremstal'], 'albarino': ['rias baixas'], 'gamay': ['beaujolais', 'fleurie', 'morgon'], 'barbera': ['barbera d asti', 'barbera d alba', 'piedmont'],
  'fam:bdxw': ['bordeaux', 'graves', 'pessac', 'sauternes'], 'fam:champ': ['champagne'], 'pinotage': ['stellenbosch'], 'torrontes': ['salta', 'cafayate']
};
function textbookHome(grapeRaw, regionRaw, originOnly) {                  // is this region guess a classic region (or, with originOnly, the true home) of the grape guessed with it?
  var g = grapeGroup(grapeRaw); if (!g || !String(regionRaw || '').trim()) return null;
  var M = originOnly ? G_ORIGIN : G_HOME, homes = M[g.key] || M[g.profile]; if (!homes) return null;
  var r = ' ' + gNorm(regionRaw) + ' '; return homes.some(function (h) { return r.indexOf(' ' + h + ' ') >= 0 || r.indexOf(' ' + h) >= 0; });
}
function regionInsight(B) {
  var rows = B.map(function (w) { var p = wPts(w); return { w: w, g: p[0], r: p[2] }; }).filter(function (o) { return o.g !== null && o.r !== null && String(o.w.gRegion || '').trim(); });
  if (rows.length < 6) return '';
  var gr = rows.filter(function (o) { return o.g >= 1; }), gx = rows.filter(function (o) { return o.g < 1; });
  var sum = function (a) { return a.reduce(function (t, o) { return t + o.r; }, 0); };
  var tb = rows.filter(function (o) { return textbookHome(o.w.gGrape, o.w.gRegion) === true; });
  // the example: a guess at the grape's true home (Burgundy for Chardonnay, Rioja for Tempranillo), the most recent one
  var ex = []; tb.slice().reverse().some(function (o) { if (textbookHome(o.w.gGrape, o.w.gRegion, true) !== true) return false; var g = grapeGroup(o.w.gGrape); ex.push(String(o.w.gRegion).split(/[,(]/)[0].trim() + ' for ' + g.label); return true; });
  // with the grape right, where did the region still miss, and where were those wines from?
  var gMiss = gr.filter(function (o) { return o.r === 0; }), gMissTb = gMiss.filter(function (o) { return textbookHome(o.w.gGrape, o.w.gRegion) === true; });
  var out = [];
  if (tb.length >= Math.max(4, rows.length * 0.5))
    out.push('Your region follows your grape: on ' + (tb.length === rows.length ? 'all ' + rows.length : tb.length + ' of ' + rows.length) + ' wines you named a classic region for the grape you guessed' + (ex.length ? ' (' + ex[0] + ')' : '') + '.');
  out.push('Grape right: ' + half(sum(gr)) + ' region point' + (sum(gr) === 1 ? '' : 's') + ' from ' + gr.length + ' wine' + (gr.length === 1 ? '' : 's') + '; grape wrong: ' + half(sum(gx)) + ' from ' + gx.length + '.');
  if (gMissTb.length) { var o0 = gMissTb[gMissTb.length - 1];
    out.push((gMissTb.length === 1 ? 'One right-grape wine' : (['', '', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'][gMissTb.length] || gMissTb.length) + ' right-grape wines') + ' were from a different region than the one you named, e.g. ' + String(o0.w.aRegion || '').split(/[,(]/)[0].trim() + ' (you said ' + String(o0.w.gRegion).split(/[,(]/)[0].trim() + ').'); }
  return out.join(' ');
}
function accuracy(B) {
  var names = ['Grape', 'Country', 'Region', 'Vintage'], s = [0, 0, 0, 0], n = [0, 0, 0, 0];
  B.forEach(function (w) { wPts(w).forEach(function (p, i) { if (p !== null) { s[i] += p; n[i]++; } }); });
  if (!B.length) return card('', 'Blind accuracy', 'Where your points come from', '<p class="db-sub">Taste a wine blind to see your accuracy.</p>');
  var order = [0, 1, 2, 3].sort(function (a, b) { return (n[b] ? s[b] / n[b] : 0) - (n[a] ? s[a] / n[a] : 0); });
  var body = '<div class="db-bars">' + order.map(function (i) { return bar(names[i], n[i] ? s[i] / n[i] : 0, half(s[i]) + ' / ' + n[i] + ' · ' + pct(s[i], n[i]) + '%', i === order[3] ? 'gold' : ''); }).join('') + '</div>';
  var lo = order[3], note = '';
  if (n[lo] >= 5 && names[lo] === 'Region') note = regionInsight(B) || 'Region is the soft spot: ' + half(s[2]) + ' of ' + n[2] + ' points.';
  else if (n[lo] >= 5) note = names[lo] + ' is the soft spot: ' + half(s[lo]) + ' of ' + n[lo] + ' points.';
  return card('', 'Blind accuracy', 'Where your points come from', body + coach(note));
}

function sessions(B) {
  var by = {}; B.forEach(function (w) { var p = wPts(w).reduce(function (a, b) { return a + (b || 0); }, 0); (by[w.ymd] = by[w.ymd] || { n: 0, p: 0 }); by[w.ymd].n++; by[w.ymd].p += p; });
  var ds = Object.keys(by).sort().slice(-12);
  if (ds.length < 2) return card('', 'Blind score per session', 'Points per wine, out of 4', '<p class="db-sub">The line appears after your second blind session.</p>');
  var VW = DW < 600 ? Math.max(280, DW - 40) : 520;
  var vals = ds.map(function (d) { return by[d].p / by[d].n; }), top = Math.max(2, Math.ceil(Math.max.apply(null, vals))), W0 = 30, W1 = VW - 10, H0 = 30, H1 = 170;
  var x = function (i) { return W0 + 24 + (W1 - W0 - 48) * (ds.length === 1 ? 0.5 : i / (ds.length - 1)); }, y = function (v) { return H1 - (H1 - H0) * v / top; };
  var all = B.reduce(function (a, w) { return a + wPts(w).reduce(function (q, b) { return q + (b || 0); }, 0); }, 0) / B.length;
  var g = '<svg class="db-svg" viewBox="0 0 ' + VW + ' 226" role="img" aria-label="Average blind score per wine by session: ' + ds.map(function (d, i) { return shortDate(d) + ' ' + vals[i].toFixed(2); }).join('; ') + '">';
  for (var t = 0; t <= top; t++) g += '<line class="grid" x1="' + W0 + '" x2="' + W1 + '" y1="' + y(t) + '" y2="' + y(t) + '"></line><text class="ax" x="' + (W0 - 10) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + t + '</text>';
  g += '<line class="avg" x1="' + W0 + '" x2="' + W1 + '" y1="' + y(all) + '" y2="' + y(all) + '"></line><text class="avgt" x="' + W1 + '" y="' + (y(all) - 7) + '" text-anchor="end">average ' + all.toFixed(2) + '</text>';
  g += '<polyline class="ln" points="' + vals.map(function (v, i) { return x(i).toFixed(1) + ',' + y(v).toFixed(1); }).join(' ') + '"></polyline>';
  var every = Math.max(1, Math.ceil(ds.length / Math.max(2, Math.floor((W1 - W0) / 62))));
  ds.forEach(function (d, i) { g += '<circle class="pt" cx="' + x(i).toFixed(1) + '" cy="' + y(vals[i]).toFixed(1) + '" r="5"></circle>';
    if (i % every === 0 || i === ds.length - 1) g += '<text class="ax2" x="' + x(i).toFixed(1) + '" y="192" text-anchor="middle">' + shortDate(d) + '</text><text class="ax" x="' + x(i).toFixed(1) + '" y="210" text-anchor="middle">' + by[d].n + (by[d].n === 1 ? ' wine' : ' wines') + '</text>'; });
  g += '</svg>';
  var note = ds.length < 10 ? 'With ' + ds.length + ' sessions this is a baseline; the line shows a trend once there are ten.' : (function () {
    var a = vals.slice(0, Math.floor(vals.length / 2)), b = vals.slice(Math.floor(vals.length / 2)), m = function (z) { return z.reduce(function (p, q) { return p + q; }, 0) / z.length; }, d = m(b) - m(a);
    return Math.abs(d) < 0.15 ? 'Holding steady across your last ' + ds.length + ' sessions.' : (d > 0 ? 'Climbing: ' : 'Slipping: ') + 'your recent sessions average ' + m(b).toFixed(2) + ' a wine against ' + m(a).toFixed(2) + ' before.'; })();
  return card('', 'Blind score per session', 'Points per wine, out of 4', g + '<p class="db-sub">' + note + '</p>');
}

/* ---- grape mix-ups, built to scale: ranked pairs, per-grape accuracy, the full grid, a coaching note and a trend for each */
function mixData(B) {
  var rows = [];
  B.forEach(function (w) {
    var a = grapeGroup(w.aGrape), g = grapeGroup(w.gGrape); if (!a || !g) return;
    rows.push({ w: w, a: a, g: g, p: a.key === g.key ? 1 : answerPoints(w.gGrape, w.aGrape, 'grape') });   // the same group is a correct call here
  });
  return rows;
}
function mixups(B) {
  var R = mixData(B);
  if (!R.length) return card('db-wide', 'Grape mix-ups', 'What the wine was, and what you called it', '<p class="db-sub">Your mix-ups appear here once you’ve guessed a grape blind and filled in the answer.</p>');
  var pairs = {}, lab = {};
  R.forEach(function (r) { lab[r.a.key] = r.a; lab[r.g.key] = r.g;
    if (r.a.key === r.g.key) return;
    var k = [r.a.key, r.g.key].sort().join('|'), P = pairs[k] = pairs[k] || { k: k, x: [r.a.key, r.g.key].sort(), n: 0, dir: {}, rows: [] };
    P.n++; P.dir[r.a.key] = (P.dir[r.a.key] || 0) + 1; P.rows.push(r); });
  var list = Object.keys(pairs).map(function (k) { return pairs[k]; }).sort(function (a, b) { return b.n - a.n || b.rows[b.rows.length - 1].w.ymd.localeCompare(a.rows[a.rows.length - 1].w.ymd); });
  // each mix-up reads as plain lines, the wine first and what you said second: "Pinot Noir → you said Nebbiolo ●● 2"
  var ARROW = '<svg class="db-arr" viewBox="0 0 20 12" aria-hidden="true"><path d="M1 6h16M12 1.5 17 6l-5 4.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
  function dirLine(was, said, n) {
    var d = ''; for (var i = 0; i < Math.min(n, 8); i++) d += '<i></i>';
    return '<span class="db-dir"><span class="db-was">' + esc(was) + '</span>' + ARROW + '<span class="db-said">you said ' + esc(said) + '</span>' +
      '<span class="db-dots" aria-label="' + n + (n === 1 ? ' time' : ' times') + '">' + d + (n > 8 ? '<small>+' + (n - 8) + '</small>' : '') + '<b>' + n + '×</b></span></span>';
  }
  function pairHTML(P, ix) {
    var A = P.x[0], Bk = P.x[1], ab = P.dir[A] || 0, ba = P.dir[Bk] || 0;
    if (ba > ab) { var t = A; A = Bk; Bk = t; t = ab; ab = ba; ba = t; }          // the more frequent direction first
    var enc = R.filter(function (r) { return r.a.key === A || r.a.key === Bk; }).slice(-4);
    var dots = enc.map(function (r) { return '<i class="' + (r.p >= 1 ? 'ok' : r.p > 0 ? 'hf' : 'no') + '" title="' + esc(shortDate(r.w.ymd) + ': ' + r.a.label) + '"></i>'; }).join('');
    var right = enc.filter(function (r) { return r.p >= 1; }).length;
    return '<details class="db-mx"' + (ix === 0 ? ' open' : '') + '><summary>' +
      '<span class="db-mxh"><span class="db-rank">' + (ix + 1) + '</span><span class="db-mxn"><b>' + esc(lab[A].label) + '</b> and <b>' + esc(lab[Bk].label) + '</b></span>' +
      '<span class="db-trend" aria-label="Your last ' + enc.length + ' ' + esc(lab[A].label) + ' or ' + esc(lab[Bk].label) + ' wines: ' + right + ' right">' + dots + '<small>' + right + ' of your last ' + enc.length + ' right</small></span></span>' +
      '<span class="db-dirs">' + dirLine(lab[A].label, lab[Bk].label, ab) + (ba ? dirLine(lab[Bk].label, lab[A].label, ba) : '<span class="db-one">Never the other way round</span>') + '</span>' +
      '</summary>' + coach(pairNote(P, A, Bk, lab)) +
      '<ul class="db-mxw">' + P.rows.slice().reverse().map(function (r) { return '<li><button type="button" class="lnk" data-db-open="' + esc(r.w.id) + '">' + esc(shortDate(r.w.ymd) + ' · ' + (r.w.producer || 'Wine ' + r.w.wineNo)) + '</button><span>' + esc(r.a.label) + ', you said ' + esc(r.w.gGrape) + '</span></li>'; }).join('') + '</ul></details>';
  }
  var SHOWN = 3, MORE = 12, body = '<p class="db-sub">The grape on the left is what the wine was; on the right, what you called it. Tap a mix-up to see the wines and a tip.</p><div class="db-mix">';
  list.slice(0, SHOWN).forEach(function (P, ix) { body += pairHTML(P, ix); });
  body += '</div>';
  var rest = list.slice(SHOWN, SHOWN + MORE);
  if (rest.length) body += '<details class="db-more"><summary><span class="db-more-o">Show ' + rest.length + ' more mix-up' + (rest.length === 1 ? '' : 's') + '</span><span class="db-more-c">Show fewer</span></summary><div class="db-mix">' +
    rest.map(function (P, i) { return pairHTML(P, SHOWN + i); }).join('') + '</div>' +
    (list.length > SHOWN + MORE ? '<p class="db-sub">' + (list.length - SHOWN - MORE) + ' rarer mix-ups are in the full grid below.</p>' : '') + '</details>';
  // per-grape accuracy, worst first, once a grape has 3 blind tastings
  var by = {}; R.forEach(function (r) { var o = by[r.a.key] = by[r.a.key] || { k: r.a.key, n: 0, p: 0 }; o.n++; o.p += Math.min(1, r.p); });
  var ranked = Object.keys(by).map(function (k) { return by[k]; }).filter(function (o) { return o.n >= 3; }).sort(function (a, b) { return a.p / a.n - b.p / b.n || b.n - a.n; });
  var few = Object.keys(by).map(function (k) { return by[k]; }).filter(function (o) { return o.n < 3; }).sort(function (a, b) { return b.n - a.n; });
  var acc = '<h4 class="db-h4">Accuracy by grape</h4>' + (ranked.length ? '<div class="db-bars">' + ranked.slice(0, 10).map(function (o) { return bar(esc(lab[o.k].label), o.p / o.n, half(o.p) + ' of ' + o.n + ' · ' + pct(o.p, o.n) + '%', o.p / o.n < 0.5 ? 'gold' : ''); }).join('') + '</div>' : '<p class="db-sub">Each grape joins this chart after three blind tastings.</p>') +
    (few.length ? '<p class="db-sub">Not ranked yet (fewer than three blind tastings): ' + few.slice(0, 14).map(function (o) { return esc(lab[o.k].label) + ' ' + o.n; }).join(' · ') + (few.length > 14 ? ' · and ' + (few.length - 14) + ' more' : '') + '.</p>' : '');
  return card('db-wide', 'Grape mix-ups', 'Your most common mix-ups', body + acc + grid(R, lab));
}
function pairNote(P, A, Bk, lab) {
  if (P.n < 2) return '';                                              // a one-off isn't a pattern yet
  var votes = {};
  P.rows.forEach(function (r) {
    var pa = G_PRO[r.a.profile], pg = G_PRO[r.g.profile]; if (!pa || !pg) return;
    ['tannin', 'acidity', 'body', 'alcohol'].forEach(function (c) {
      var v = lvOf(r.w[c]); if (v === null || !pa[c] || !pg[c]) return;
      var inA = v >= pa[c][0] && v <= pa[c][1], inG = v >= pg[c][0] && v <= pg[c][1];
      if (inA === inG) return;
      var key = (inA ? 'tie|' : 'pull|') + c + '|' + r.a.key + '|' + r.g.key, o = votes[key] = votes[key] || { kind: inA ? 'tie' : 'pull', c: c, a: r.a, g: r.g, n: 0, vals: {} };
      o.n++; o.vals[v] = (o.vals[v] || 0) + 1;
    });
  });
  var PRI = { tannin: 0, acidity: 1, body: 2, alcohol: 3 };              // the more telling component wins a tie
  var vs = Object.keys(votes).map(function (k) { return votes[k]; }).sort(function (a, b) { return b.n - a.n || (a.kind === b.kind ? 0 : a.kind === 'tie' ? -1 : 1) || PRI[a.c] - PRI[b.c]; });
  var best = vs[0];
  var an = function (x) { return (/^[aeiou]/i.test(x) ? 'an ' : 'a ') + esc(x); };
  if (!best) return 'Taste ' + an(lab[A].label) + ' and ' + an(lab[Bk].label) + ' side by side to fix what separates them for you.';
  var mode = +Object.keys(best.vals).sort(function (x, y) { return best.vals[y] - best.vals[x]; })[0], cn = best.c, nm = LV_NAME[cn][mode];
  var times = best.n === 1 ? 'Once' : best.n === 2 ? 'Both times' : best.n + ' times';
  if (best.kind === 'tie') return times + ' you called the ' + cn + ' ' + nm + ', which fits ' + esc(best.a.label) + ' but not ' + esc(best.g.label) + ' (usually ' + rangeText(cn, G_PRO[best.g.profile][cn]) + '). Trust that call: the ' + cn + ' is your tiebreaker.';
  return times + ' you called the ' + cn + ' ' + nm + ', which reads as ' + esc(best.g.label) + '. ' + esc(best.a.label) + ' is usually ' + rangeText(cn, G_PRO[best.a.profile][cn]) + ', so re-check the ' + cn + ' before you commit.';
}
function grid(R, lab) {
  var cnt = {}; R.forEach(function (r) { cnt[r.a.key] = (cnt[r.a.key] || 0) + 1; cnt[r.g.key] = (cnt[r.g.key] || 0) + 1; });
  var keys = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }), show = keys.slice(0, 12), other = keys.length > 12;
  var col = function (k) { return show.indexOf(k) >= 0 ? k : '_other'; }, cols = show.concat(other ? ['_other'] : []), M = {}, mx = 1;
  R.forEach(function (r) { var k = col(r.a.key) + '|' + col(r.g.key); M[k] = (M[k] || 0) + 1; if (M[k] > mx) mx = M[k]; });
  var name = function (k) { return k === '_other' ? 'Other' : lab[k].label; };
  var t = '<details class="db-grid"><summary>Show the full grid</summary><p class="db-sub">Rows are what the wine was; columns are what you said. The diagonal is a correct call.</p><div class="db-gwrap"><table><thead><tr><th scope="col"><span class="vh">Wine was</span></th>' +
    cols.map(function (c) { return '<th scope="col"><span>' + esc(name(c)) + '</span></th>'; }).join('') + '</tr></thead><tbody>';
  cols.forEach(function (a) {
    t += '<tr><th scope="row">' + esc(name(a)) + '</th>' + cols.map(function (g) { var v = M[a + '|' + g] || 0, diag = a === g && a !== '_other';
      return '<td class="' + (diag ? 'dg' : '') + '" style="' + (v ? '--a:' + (0.18 + 0.82 * v / mx).toFixed(2) : '') + '">' + (v || '') + '</td>'; }).join('') + '</tr>';
  });
  return t + '</tbody></table></div></details>';
}

function calibration(W) {
  var pts = W.map(function (w) { return { w: w, c: criticScore(w), q: QLEVELS.indexOf(w.quality) }; }).filter(function (o) { return o.c !== null && o.q >= 0; });
  if (pts.length < 3) return card('db-s3', 'Quality calibration', 'Your quality call against the critics’ score', '<p class="db-sub">This chart fills in once three wines have both your quality call and a critic’s score.</p>');
  var lv = QLEVELS.filter(function (q, i) { return pts.some(function (o) { return o.q === i; }); }).reverse();
  var lo = Math.max(80, Math.floor(Math.min.apply(null, pts.map(function (o) { return o.c; }))) - 1), hi = Math.min(100, Math.ceil(Math.max.apply(null, pts.map(function (o) { return o.c; }))) + 1);
  var VW = DW < 600 ? Math.max(280, DW - 40) : 640, X0 = DW < 600 ? 92 : 120, X1 = VW - 24, rowH = 56, top = 36, Hh = top + rowH * (lv.length - 1) + 60;
  var x = function (s) { return X0 + (X1 - X0) * (s - lo) / (hi - lo); }, y = function (q) { return top + rowH * lv.indexOf(QLEVELS[q]); };
  var g = '<svg class="db-svg" viewBox="0 0 ' + VW + ' ' + (Hh + 30) + '" role="img" aria-label="Critics’ average score for the wines at each of your quality levels: ' + lv.map(function (l) { var s = pts.filter(function (o) { return QLEVELS[o.q] === l; }).map(function (o) { return o.c; }); return l + ' ' + (s.reduce(function (a, b) { return a + b; }, 0) / s.length).toFixed(1); }).join(', ') + '">';
  var step = (hi - lo) / ((X1 - X0) / 44) > 2 ? 4 : 2;
  for (var s = Math.ceil(lo / step) * step; s <= hi; s += step) g += '<text class="ax" x="' + x(s).toFixed(1) + '" y="' + (Hh + 2) + '" text-anchor="middle">' + s + '</text>';
  g += '<line class="grid2" x1="' + X0 + '" x2="' + X1 + '" y1="' + (Hh - 14) + '" y2="' + (Hh - 14) + '"></line><text class="ax" x="' + ((X0 + X1) / 2) + '" y="' + (Hh + 24) + '" text-anchor="middle">critics’ average score</text>';
  var means = {}, seen = {};
  lv.forEach(function (l) { var yy = top + rowH * lv.indexOf(l); g += '<line class="grid" x1="' + X0 + '" x2="' + X1 + '" y1="' + yy + '" y2="' + yy + '"></line><text class="ax2" x="' + (X0 - 14) + '" y="' + (yy + 4) + '" text-anchor="end">' + l + '</text>'; });
  pts.forEach(function (o) { var cx = x(o.c), cy = y(o.q), k = Math.round(cx / 8) + '|' + o.q, n = seen[k] = (seen[k] || 0) + 1, off = [0, -7, 7, -13, 13][(n - 1) % 5];
    g += '<circle class="dot" cx="' + cx.toFixed(1) + '" cy="' + (cy + off) + '" r="7"><title>' + esc((o.w.producer || 'Wine') + ': ' + o.w.quality + ', critics ' + o.c) + '</title></circle>';
    (means[o.q] = means[o.q] || []).push(o.c); });
  Object.keys(means).forEach(function (q) { var m = means[q].reduce(function (a, b) { return a + b; }, 0) / means[q].length, yy = y(+q); g += '<line class="mean" x1="' + x(m).toFixed(1) + '" x2="' + x(m).toFixed(1) + '" y1="' + (yy - 12) + '" y2="' + (yy + 12) + '"></line>'; means[q].m = m; });
  // outliers: furthest from their level's average, labeled
  var out = pts.map(function (o) { return { o: o, d: o.c - means[o.q].m }; }).filter(function (z) { return Math.abs(z.d) >= 3; }).sort(function (a, b) { return Math.abs(b.d) - Math.abs(a.d); }).slice(0, 2);
  out.forEach(function (z) { var nm = String(z.o.w.aRegion || z.o.w.producer || '').split(',')[0].slice(0, 18); var tx = x(z.o.c), an = tx < X0 + 50 ? 'start' : tx > X1 - 50 ? 'end' : 'middle'; g += '<text class="ax2" x="' + (an === 'start' ? tx - 8 : an === 'end' ? tx + 8 : tx).toFixed(1) + '" y="' + (y(z.o.q) - 14) + '" text-anchor="' + an + '">' + esc(nm + ', ' + z.o.c) + '</text>'; });
  g += '</svg>';
  var ms = lv.slice().reverse().filter(function (l) { return means[QLEVELS.indexOf(l)]; }).map(function (l) { return l + ' ' + means[QLEVELS.indexOf(l)].m.toFixed(1); });
  var note = 'Gold ticks mark each level’s average: ' + ms.join(', ') + '.';
  var g1 = means[2], v1 = means[3]; if (g1 && v1 && g1.length >= 3 && v1.length >= 3 && Math.abs(v1.m - g1.m) < 1.5) note += ' Good and Very Good sit within ' + Math.abs(v1.m - g1.m).toFixed(1) + ' points of each other, so the critics barely separate them.';
  if (out[0]) note += ' The ' + esc(String(out[0].o.w.aRegion || out[0].o.w.producer).split(',')[0]) + ' you rated ' + out[0].o.w.quality + ' is the clearest outlier.';
  return card('db-s3', 'Quality calibration', 'Your quality call against the critics’ score', g + '<p class="db-sub">' + note + '</p>');
}

function value(W) {
  var c = W.filter(function (w) { return priceOf(w) !== null && QLEVELS.indexOf(w.quality) >= 3; })
    .sort(function (a, b) { return priceOf(a) / (QLEVELS.indexOf(a.quality) - 1) - priceOf(b) / (QLEVELS.indexOf(b.quality) - 1); }).slice(0, 4);   // dollars per step above Acceptable
  var byQ = {}; W.forEach(function (w) { var p = priceOf(w); if (p !== null && w.quality) (byQ[w.quality] = byQ[w.quality] || []).push(p); });
  var meds = ['Good', 'Very Good', 'Outstanding'].filter(function (q) { return byQ[q] && byQ[q].length >= 2; }).map(function (q) { return q + ' ' + money(median(byQ[q])); });
  var body = c.length ? '<ul class="db-val">' + c.map(function (w) { var cs = criticScore(w); return '<li><button type="button" data-db-open="' + esc(w.id) + '"><b>' + esc(String(w.producer || w.aGrape || 'Wine').split(/\s+[-–]\s+/)[0]) + '</b><span>' + esc([w.aRegion, w.aGrape].filter(Boolean)[0] || '') + '</span><small>' + esc(w.quality) + (cs !== null ? ' · critics ' + cs : '') + '</small><em>' + money(priceOf(w)) + '</em></button></li>'; }).join('') + '</ul>' : '<p class="db-sub">Wines you rate Very Good or better, with a price, show here.</p>';
  return card('db-s2', 'Value finds', 'Most quality per dollar', body);
}

/* ---- price by your rating: a grouped column chart. One group per rating (low to high), a Blind column and a Tasted open column,
   and a line across the group for all wines. The same numbers draw the app chart and the PDF chart. */
function priceData(W) {
  var priced = W.filter(function (w) { return priceOf(w) !== null && QLEVELS.indexOf(w.quality) >= 0; });
  var levels = QLEVELS.filter(function (q) { return priced.some(function (w) { return w.quality === q; }); });
  var one = function (ws) { var ps = ws.map(priceOf); return { m: median(ps), n: ps.length }; };
  var rows = levels.map(function (q) { var at = priced.filter(function (w) { return w.quality === q; });
    return { q: q, all: one(at), blind: one(at.filter(isBlind)), open: one(at.filter(function (w) { return !isBlind(w); })) }; });
  var mx = 1; rows.forEach(function (r) { [r.all, r.blind, r.open].forEach(function (x) { if (x.m !== null && x.m > mx) mx = x.m; }); });
  var step = mx > 200 ? 50 : mx > 80 ? 25 : mx > 40 ? 10 : 5, top = Math.ceil(mx * 1.12 / step) * step;
  var notes = rows.map(function (r) { return r.blind.n >= 3 && r.open.n >= 3 && Math.abs(r.blind.m - r.open.m) >= 5 ? 'Your ' + r.q + ' wines cost a median ' + money(r.blind.m) + ' tasted blind and ' + money(r.open.m) + ' tasted open.' : ''; }).filter(Boolean);
  var nb = priced.filter(isBlind).length;
  return { priced: priced, rows: rows, top: top, step: step, notes: notes, nBlind: nb, nOpen: priced.length - nb };
}
function priceByRating(W) {
  var P = priceData(W);
  if (P.priced.length < 3) return card('db-wide', 'Price by your rating', 'What the wines you rated cost', '<p class="db-sub">This fills in once three rated wines have a price.</p>');
  var VW = DW < 600 ? Math.max(280, DW - 36) : Math.min(860, DW - 60), VH = 250, L = 40, R = VW - 6, T = 22, Bm = 196;
  var Y = function (v) { return Bm - (Bm - T) * v / P.top; }, gw = (R - L) / P.rows.length, cw = Math.min(46, gw * 0.24), gap = Math.min(6, gw * 0.03), narrow = gw < 120;
  var g = '<svg class="db-svg db-cols" viewBox="0 0 ' + VW + ' ' + VH + '" role="img" aria-label="Median price by your quality rating. ' +
    esc(P.rows.map(function (r) { return r.q + ': all wines ' + (r.all.m === null ? 'none' : money(r.all.m)) + ', blind ' + (r.blind.m === null ? 'none' : money(r.blind.m)) + ', tasted open ' + (r.open.m === null ? 'none' : money(r.open.m)); }).join('; ')) + '">';
  for (var t = 0; t <= P.top; t += P.step) g += '<line class="grid" x1="' + L + '" x2="' + R + '" y1="' + Y(t).toFixed(1) + '" y2="' + Y(t).toFixed(1) + '"></line><text class="ax" x="' + (L - 6) + '" y="' + (Y(t) + 4).toFixed(1) + '" text-anchor="end">$' + t + '</text>';
  P.rows.forEach(function (r, i) {
    var cx = L + gw * (i + 0.5), xs = [cx - cw * 1.5 - gap, cx - cw / 2, cx + cw / 2 + gap];
    [[r.all, 'a', 'all wines'], [r.blind, 'b', 'blind'], [r.open, 'o', 'tasted open']].forEach(function (c, k) { var x = xs[k], v = c[0];
      if (v.m === null) { g += '<text class="ax" x="' + (x + cw / 2).toFixed(1) + '" y="' + (Bm - 6) + '" text-anchor="middle">–</text>'; return; }
      g += '<rect class="col ' + c[1] + (v.n === 1 ? ' one' : '') + '" x="' + x.toFixed(1) + '" y="' + Y(v.m).toFixed(1) + '" width="' + cw.toFixed(1) + '" height="' + (Bm - Y(v.m)).toFixed(1) + '" rx="3"><title>' + esc(r.q + ', ' + c[2] + ': ' + money(v.m) + ' (' + v.n + (v.n === 1 ? ' wine' : ' wines') + ')') + '</title></rect>' +
        '<text class="cv' + (narrow ? ' sm' : '') + '" x="' + (x + cw / 2).toFixed(1) + '" y="' + (Y(v.m) - 5).toFixed(1) + '" text-anchor="middle">' + (narrow ? '$' + Math.round(v.m) : money(v.m)) + '</text>'; });   // whole dollars when the columns are narrow
    g += '<text class="ax2" x="' + cx.toFixed(1) + '" y="' + (Bm + 17) + '" text-anchor="middle">' + r.q + '</text>' + (narrow ?
      '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (Bm + 31) + '" text-anchor="middle">' + r.blind.n + ' blind</text><text class="ax" x="' + cx.toFixed(1) + '" y="' + (Bm + 44) + '" text-anchor="middle">' + r.open.n + ' open</text>' :
      '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (Bm + 32) + '" text-anchor="middle">' + r.blind.n + ' blind · ' + r.open.n + ' open</text>');
  });
  g += '<line class="grid2" x1="' + L + '" x2="' + R + '" y1="' + Bm + '" y2="' + Bm + '"></line></svg>';
  var leg = '<div class="db-legend"><span><i class="db-sw allc"></i>All wines (' + P.priced.length + ')</span><span><i class="db-sw sig"></i>Blind (' + P.nBlind + ')</span><span><i class="db-sw gold"></i>Tasted open (' + P.nOpen + ')</span><span><i class="db-sw pale"></i>Only one wine</span></div>';
  var foot = (P.notes.length ? P.notes.join(' ') + ' ' : '') + 'Each column is the median price at that rating.' + (P.priced.length < 40 ? ' With only a few wines at some ratings, the medians will move a lot as you taste more.' : '');
  return card('db-wide', 'Price by your rating', 'What the wines you rated cost', leg + g + '<p class="db-sub">' + foot + '</p>');
}

function habits(W) {
  var comps = [['acidity', 'Acidity', W], ['tannin', 'Tannin', W.filter(function (w) { return w.tannin; })], ['alcohol', 'Alcohol', W], ['body', 'Body', W], ['finish', 'Finish', W]];
  var cls = ['l0', 'l1', 'l2', 'l3', 'l4'], names = ['Low / Light', 'Medium Minus', 'Medium', 'Medium Plus', 'High / Full / Long'], flag = null;
  var rows = comps.map(function (c) {
    var n = [0, 0, 0, 0, 0], tot = 0; c[2].forEach(function (w) { var v = lvOf(w[c[0]]); if (v !== null) { n[v]++; tot++; } });
    if (!tot) return '';
    var mi = n.indexOf(Math.max.apply(null, n)), share = n[mi] / tot;
    if (tot >= 10 && share >= 0.6 && (!flag || share > flag.share)) flag = { c: c[1], lv: names[mi].split(' / ')[0], n: n[mi], tot: tot, share: share };
    return '<div class="db-st"><span class="db-bl">' + c[1] + '</span><span class="db-stk" role="img" aria-label="' + c[1] + ': ' + n.map(function (v, i) { return v ? v + ' ' + names[i] : ''; }).filter(Boolean).join(', ') + '">' +
      n.map(function (v, i) { return v ? '<i class="' + cls[i] + '" style="flex:' + v + ' 1 0"></i>' : ''; }).join('') + '</span><span class="db-bv' + (share >= 0.6 && tot >= 10 ? ' warn' : '') + '">' + pct(n[mi], tot) + '% ' + names[mi].split(' / ')[0] + '</span></div>';
  }).join('');
  var leg = '<div class="db-legend">' + names.map(function (nm, i) { return '<span><i class="db-sw ' + cls[i] + '"></i>' + nm + '</span>'; }).join('') + '</div>';
  var note = flag ? flag.c + ' is ' + flag.lv + ' on ' + flag.n + ' of ' + flag.tot + ' wines. That much clustering suggests ' + flag.lv + ' has become a safe default. Decide whether the wine is clearly above or below it first, then settle the step.' : '';
  return card('db-s3', 'SAT habits', 'How you spread each scale', leg + '<div class="db-bars">' + rows + '</div>' + coach(note));
}

function words(W) {
  var cnt = {}, home = {}, reds = W.filter(function (w) { return w.type === 'Red'; }).length;
  W.forEach(function (w) { var seen = {}; String(w.aromas || '').split(/\s*,\s*/).forEach(function (t) { var k = t.trim().replace(/[.;:]+$/, '').toLowerCase(); if (!k || seen[k] || !WORDHOME[k] || WORDHOME[k].c === 'Fruit character') return; seen[k] = 1; cnt[k] = (cnt[k] || 0) + 1; home[k] = WORDHOME[k].f; }); });
  var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 8);
  if (!top.length) return card('db-s2', 'Go-to descriptors', 'Words you reach for', '<p class="db-sub">Your most-used aromas show here.</p>');
  var mx = cnt[top[0]], FAM = { fruit: 'fruit', floral: 'floral', green: 'green', spice: 'spice', oak: 'oak', yeast: 'yeast', age: 'earth', other: 'nut' };
  var body = '<div class="db-bars">' + top.map(function (k) { return '<div class="db-bar"><span class="db-bl">' + esc(wordLabel(k).toLowerCase()) + '</span><span class="db-track bare"><i class="fam-' + (FAM[home[k]] || 'nut') + '" style="width:' + (cnt[k] / mx * 100).toFixed(1) + '%"></i></span><span class="db-bv">' + cnt[k] + '</span></div>'; }).join('') + '</div>';
  var k0 = top[0], inR = W.filter(function (w) { return w.type === 'Red' && new RegExp('(^|,)\\s*' + k0.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*(,|$)', 'i').test(w.aromas || ''); }).length;
  var note = cnt[k0] >= Math.max(5, W.length * 0.35) ? '“' + esc(wordLabel(k0).toLowerCase()) + '” is in ' + cnt[k0] + ' of your ' + W.length + ' notes' + (reds >= 5 && inR >= reds * 0.6 ? ' (' + inR + ' of ' + reds + ' reds)' : '') + ': either a real style in what you drink, or a word worth questioning each time.' : '';
  return card('db-s2', 'Go-to descriptors', 'Words you reach for', body + '<p class="db-sub">Bars take the Lexicon family colors.' + (note ? ' ' + note : '') + '</p>');
}

function coverage(W) {
  var cn = {}; W.forEach(function (w) { var c = String(w.aCountry || '').trim(); if (!c) return; var k = answerKey(c), hit = D3_COUNTRIES.filter(function (d) { return answerKey(d) === k; })[0]; if (hit) cn[hit] = (cn[hit] || 0) + 1; });
  var mx = Math.max.apply(null, [1].concat(Object.keys(cn).map(function (k) { return cn[k]; }))), got = Object.keys(cn).length;
  var tiles = D3_COUNTRIES.slice().sort(function (a, b) { return (cn[b] || 0) - (cn[a] || 0); }).map(function (c) { var n = cn[c] || 0, lvl = n ? Math.min(4, Math.ceil(n / mx * 4)) : 0;
    return '<div class="db-ct c' + lvl + '"><span>' + flagSvg(c, 12) + c + '</span><b>' + n + '</b></div>'; }).join('');
  var st = {}; W.forEach(function (w) { var s = wStyle(w); st[s] = (st[s] || 0) + 1; });
  var order = [['Red', 'Still red', 'sr'], ['White', 'Still white', 'sw2'], ['Rosé', 'Rosé', 'sro'], ['Sparkling', 'Sparkling', 'ssp'], ['Fortified', 'Fortified', 'sfo'], ['Sweet', 'Sweet', 'ssw']];
  var seg = '<div class="db-styles">' + order.filter(function (o) { return st[o[0]]; }).map(function (o) { return '<i class="' + o[2] + '" style="flex:' + st[o[0]] + ' 1 0"><span>' + o[1] + ' ' + st[o[0]] + '</span></i>'; }).join('') + '</div>';
  var none = order.filter(function (o) { return !st[o[0]] && o[0] !== 'Rosé'; }).map(function (o) { return o[1]; });
  var gaps = []; if (!st.Sparkling) gaps.push('D4'); if (!st.Fortified) gaps.push('D5');
  var note = order.filter(function (o) { return st[o[0]]; }).map(function (o) { return o[1] + ' ' + st[o[0]]; }).join(' · ') + (none.length ? ' · ' + none.map(function (x) { return x + ' 0'; }).join(' · ') : '') + '.' + (gaps.length ? ' ' + gaps.join(' and ') + (gaps.length > 1 ? ' have' : ' has') + ' no tastings logged yet.' : '');
  return card('db-wide', 'Diploma coverage', 'D3 countries and styles you’ve tasted<span class="db-hn">' + got + ' of 16 countries</span>', '<div class="db-cts">' + tiles + '</div>' + seg + '<p class="db-sub">' + note + '</p>');
}

/* ---- Dashboard events */
window.addEventListener('resize', function () { clearTimeout(renderDash.t); renderDash.t = setTimeout(function () { if (view === 'dash' && $('dash') && Math.abs($('dash').clientWidth - DW) > 20) renderDash(); }, 250); });
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-db-scope], [data-db-style], [data-db-open]'); if (!b) return;
  if (b.hasAttribute('data-db-open')) { var w = ALL.filter(function (x) { return x.id === b.getAttribute('data-db-open'); })[0]; if (w) openCard(w); return; }
  if (b.hasAttribute('data-db-scope')) DASH.scope = b.getAttribute('data-db-scope'); else DASH.style = b.getAttribute('data-db-style');
  store('btn-dash', { scope: DASH.scope, style: DASH.style }); renderDash();
});

/* ---- the quiet hint on the Tasting screen: "Did you mean Syrah?" under the grape row, tap to accept or ×; it never blocks saving */
var GH_SKIP = {};
function paintGrapeHint(k) {
  var box = $('ghint'); if (!box) return;
  var inp = document.querySelector('input[data-k="' + k + '"]'), v = inp ? inp.value : '', fix = v && !GH_SKIP[k + '|' + v] ? grapeHint(v) : '';
  if (!fix || low(fix) === low(v)) { if (box.getAttribute('data-for') === k || !fix) { box.hidden = true; box.innerHTML = ''; box.removeAttribute('data-for'); } return; }
  if (!box.hidden && box.getAttribute('data-for') === k && box.getAttribute('data-fix') === fix) return;   // already showing (a blur must not redraw it under the tap)
  box.setAttribute('data-for', k); box.setAttribute('data-fix', fix); box.hidden = false;
  box.innerHTML = '<span>' + (k === 'gGrape' ? 'Your guess: did' : 'Did') + ' you mean <button type="button" class="ghfix" data-ghfix="' + esc(fix) + '">' + esc(fix) + '</button>?</span><button type="button" class="ghx" aria-label="Keep what I wrote">×</button>';
}
document.addEventListener('change', function (e) { var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (k === 'gGrape' || k === 'aGrape') paintGrapeHint(k); });
document.addEventListener('click', function (e) {
  var box = $('ghint'); if (!box || !box.contains(e.target)) return;
  var k = box.getAttribute('data-for'), inp = document.querySelector('input[data-k="' + k + '"]');
  if (e.target.closest('.ghfix') && inp) {
    inp.value = e.target.closest('.ghfix').getAttribute('data-ghfix'); rec[k] = inp.value;
    paintScore(); paintStages(); touch(true);
  } else if (e.target.closest('.ghx') && inp) GH_SKIP[k + '|' + inp.value] = 1;
  box.hidden = true; box.innerHTML = ''; box.removeAttribute('data-for');
});
/*build*/(window.__V = window.__V || {})['dash'] = 'v2.71';

/* ====================================================================== the Dashboard as a one-page infographic PDF (US Letter), drawn as vector shapes and text */
function dhex(hex, a) { var n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(function (v) { return Math.round(v * a + 255 * (1 - a)); }); return '#' + c.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join(''); }
var DP = { sig: '#6D1A36', bar: '#5A1229', gold: '#9A7438', goldInk: '#7E5C26', ink: '#1F1A1D', ink2: '#4A4146', muted: '#716669', seg: '#EFE8DE', line: '#E7E0D6', card: '#FFFFFF', paper: '#F8F5EF',
  tint: '#F5EAED', ok: '#2F5A22', no: '#8A2430', lv: ['#EFE8DE', '#E7C9D3', '#C28A9C', '#86274A', '#3A0A1A'],
  fam: { fruit: '#C23B57', floral: '#B85CA0', green: '#5F9445', spice: '#C47324', oak: '#8A5530', yeast: '#C9A24F', age: '#5E4334', other: '#A9823A' } };
function dashPdf() {
  var W = dashWines(), B = W.filter(isBlind);
  if (!W.length) return Promise.reject(new Error('No wines to put in the PDF.'));
  return Promise.all([loadLib('lib/jspdf.min.js'), pdfFonts()]).then(function (r) {
    var D = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
    r[1].forEach(function (f) { D.addFileToVFS(f.file, f.data); D.addFont(f.file, f.fam, f.st); });
    var PW = 612, PH = 792, M = 30, CW = PW - 2 * M;
    function T(t) { return pdfText(t).replace(/ /g, ' '); }
    function font(st, sz, col) { D.setFont(st === 'serif' ? 'Playfair' : 'Archivo', st === 'n' ? 'normal' : 'bold'); D.setFontSize(sz); D.setTextColor(col || DP.ink); }
    function txt(t, x, y, o) { D.text(T(t), x, y, o || {}); }
    function fit(t, w) { t = T(t); if (D.getTextWidth(t) <= w) return t; while (t.length > 1 && D.getTextWidth(t + '…') > w) t = t.slice(0, -1); return t + '…'; }
    function fill(c) { D.setFillColor(c); } function stroke(c, w) { D.setDrawColor(c); D.setLineWidth(w || .6); }
    function rect(x, y, w, h, c, r) { fill(c); if (r) D.roundedRect(x, y, w, h, r, r, 'F'); else D.rect(x, y, w, h, 'F'); }
    function panel(x, y, w, h, eb, title) {
      fill(DP.card); stroke(DP.line, .6); D.roundedRect(x, y, w, h, 7, 7, 'FD');
      font('b', 6.2, DP.muted); D.setCharSpace(.9); txt(eb.toUpperCase(), x + 11, y + 14); D.setCharSpace(0);
      if (title) { font('serif', 10.5, DP.ink); txt(title, x + 11, y + 28); }
      return { x: x + 11, y: y + (title ? 38 : 24), w: w - 22, b: y + h - 9 };
    }
    function bars(P, rows, labW, valW, rowH) {                          // rows: [label, fraction, value text, color]
      var tx = P.x + labW, tw = P.w - labW - valW, y = P.y;
      rows.forEach(function (rw) { font('n', 7.2, DP.ink2); txt(fit(rw[0], labW - 6), P.x, y + 6);
        rect(tx, y, tw, 7, DP.seg, 3.5); if (rw[1] > 0) rect(tx, y, Math.max(7, tw * Math.min(1, rw[1])), 7, rw[3] || DP.sig, 3.5);
        font('b', 7, DP.ink); txt(rw[2], P.x + P.w, y + 6, { align: 'right' }); y += rowH; });
      return y;
    }
    function note(P, t, y, sz) { font('n', sz || 6.8, DP.ink2); var ls = D.splitTextToSize(T(t), P.w); ls.forEach(function (l) { txt(l, P.x, y); y += (sz || 6.8) * 1.35; }); return y; }

    // ---- header band
    rect(0, 0, PW, 62, DP.bar);
    font('serif', 21, '#FFFFFF'); txt('How your palate is tracking', M, 33);
    var range = shortDate(W[0].ymd) + ' – ' + shortDate(W[W.length - 1].ymd) + ', ' + W[W.length - 1].ymd.slice(0, 4);
    var view = { all: 'All wines', blind: 'Blind only', recent: 'Last 30 days' }[DASH.scope] + (DASH.style !== 'all' ? ' · ' + DASH.style : '');
    font('n', 8, '#EAD7DD'); txt('Tasting Notes dashboard  ·  ' + range + '  ·  ' + W.length + ' wines  ·  ' + view, M, 49);
    font('n', 7.2, '#EAD7DD'); txt('Printed ' + new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }), PW - M, 49, { align: 'right' });
    rect(0, 62, PW, 2.2, DP.gold);
    rect(0, 64.2, PW, PH - 64.2, DP.paper);

    // ---- headline numbers
    var pts = 0, of = 0; B.forEach(function (w) { wPts(w).forEach(function (p) { if (p !== null) { pts += p; of++; } }); });
    var cnt = {}; W.forEach(function (w) { var c = countryName(w.aCountry); if (c) cnt[c] = (cnt[c] || 0) + 1; }); var cs = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; });
    var pr = W.map(priceOf).filter(function (p) { return p !== null; }), md = median(pr);
    var K = [['Wines tasted', String(W.length), B.length + ' blind · ' + (W.length - B.length) + ' tasted open', DP.ink],
      ['Blind score', of ? pct(pts, of) + '%' : '–', of ? half(pts) + ' of ' + of + ' points · ' + (pts / B.length).toFixed(1) + ' per wine' : 'No blind wines yet', DP.sig],
      ['Most tasted country', cs[0] || '–', cs[0] ? cnt[cs[0]] + ' of ' + W.length + ' wines' : '', DP.ink],
      ['Median bottle', md !== null ? money(Math.round(md)) : '–', pr.length ? money(Math.min.apply(null, pr)) + ' to ' + money(Math.max.apply(null, pr)) + ' · ' + pr.length + ' priced' : '', DP.ink]];
    var kw = (CW - 3 * 8) / 4, ky = 76;
    K.forEach(function (k, i) { var x = M + i * (kw + 8); fill(DP.card); stroke(DP.line, .6); D.roundedRect(x, ky, kw, 54, 7, 7, 'FD');
      font('b', 6.2, DP.muted); D.setCharSpace(.9); txt(k[0].toUpperCase(), x + 11, ky + 14); D.setCharSpace(0);
      var fx = x + 11; if (i === 2 && cs[0] && flagPdf(D, cs[0], fx, ky + 21, 15)) fx += 30;     // the most tasted country's flag
      font('b', k[1].length > 9 ? 15 : 21, k[3]); txt(fit(k[1], x + kw - 11 - fx), fx, ky + 36); font('n', 6.6, DP.ink2); txt(fit(k[2], kw - 22), x + 11, ky + 47); });

    // ---- blind accuracy | score per session
    var y2 = 140, h2 = 118, half2 = (CW - 8) / 2;
    var P = panel(M, y2, half2, h2, 'Blind accuracy', 'Where your points come from');
    var names = ['Grape', 'Country', 'Region', 'Vintage'], s = [0, 0, 0, 0], n = [0, 0, 0, 0];
    B.forEach(function (w) { wPts(w).forEach(function (p, i) { if (p !== null) { s[i] += p; n[i]++; } }); });
    if (B.length) {
      var order = [0, 1, 2, 3].sort(function (a, b) { return (n[b] ? s[b] / n[b] : 0) - (n[a] ? s[a] / n[a] : 0); });
      var ya = bars(P, order.map(function (i) { return [names[i], n[i] ? s[i] / n[i] : 0, half(s[i]) + ' / ' + n[i] + ' · ' + pct(s[i], n[i]) + '%', i === order[3] ? DP.gold : DP.sig]; }), 46, 62, 13);
      var lo = order[3]; if (n[lo] >= 5) note(P, names[lo] + ' is the soft spot: ' + half(s[lo]) + ' of ' + n[lo] + ' points.', ya + 6);
    } else note(P, 'No blind wines in this view.', P.y + 8);
    P = panel(M + half2 + 8, y2, half2, h2, 'Blind score per session', 'Points per wine, out of 4');
    var by = {}; B.forEach(function (w) { var p = wPts(w).reduce(function (a, b) { return a + (b || 0); }, 0); (by[w.ymd] = by[w.ymd] || { n: 0, p: 0 }); by[w.ymd].n++; by[w.ymd].p += p; });
    var ds = Object.keys(by).sort().slice(-12);
    if (ds.length >= 2) {
      var vals = ds.map(function (d) { return by[d].p / by[d].n; }), top = Math.max(2, Math.ceil(Math.max.apply(null, vals)));
      var gx0 = P.x + 12, gx1 = P.x + P.w - 4, gy0 = P.y + 2, gy1 = P.b - 18, X = function (i) { return gx0 + 8 + (gx1 - gx0 - 16) * i / (ds.length - 1); }, Y = function (v) { return gy1 - (gy1 - gy0) * v / top; };
      for (var t = 0; t <= top; t++) { stroke(DP.line, .5); D.line(gx0, Y(t), gx1, Y(t)); font('n', 6, DP.muted); txt(String(t), gx0 - 4, Y(t) + 2, { align: 'right' }); }
      var all = B.reduce(function (a, w) { return a + wPts(w).reduce(function (q, b) { return q + (b || 0); }, 0); }, 0) / B.length;
      stroke(DP.gold, .7); D.setLineDashPattern([2, 2], 0); D.line(gx0, Y(all), gx1, Y(all)); D.setLineDashPattern([], 0); font('n', 6, DP.goldInk); txt('average ' + all.toFixed(2), gx1, Y(all) - 3, { align: 'right' });
      stroke(DP.sig, 1.4); for (var i = 1; i < ds.length; i++) D.line(X(i - 1), Y(vals[i - 1]), X(i), Y(vals[i]));
      var every = Math.max(1, Math.ceil(ds.length / 6));
      ds.forEach(function (d, i) { fill(DP.sig); D.circle(X(i), Y(vals[i]), 2.4, 'F'); if (i % every === 0 || i === ds.length - 1) { font('n', 6, DP.ink2); txt(shortDate(d), X(i), gy1 + 9, { align: 'center' }); font('n', 5.4, DP.muted); txt(by[d].n + (by[d].n === 1 ? ' wine' : ' wines'), X(i), gy1 + 16, { align: 'center' }); } });
    } else note(P, 'The line appears after a second blind session.', P.y + 8);

    // ---- SAT habits | go-to descriptors | value finds
    var y3 = y2 + h2 + 8, h3 = 126, w3a = CW * 0.46, w3b = CW * 0.27, w3c = CW - w3a - w3b - 16;
    P = panel(M, y3, w3a, h3, 'SAT habits', 'How you spread each scale');
    var comps = [['acidity', 'Acidity', W], ['tannin', 'Tannin', W.filter(function (w) { return w.tannin; })], ['alcohol', 'Alcohol', W], ['body', 'Body', W], ['finish', 'Finish', W]], LN = ['Low', 'Medium Minus', 'Medium', 'Medium Plus', 'High'];
    var sy = P.y, flag = null;
    comps.forEach(function (c) { var nn = [0, 0, 0, 0, 0], tot = 0; c[2].forEach(function (w) { var v = lvOf(w[c[0]]); if (v !== null) { nn[v]++; tot++; } }); if (!tot) return;
      var mi = nn.indexOf(Math.max.apply(null, nn)), sh = nn[mi] / tot, bx = P.x + 40, bw = P.w - 40 - 66, cx = bx;
      font('n', 7.2, DP.ink2); txt(c[1], P.x, sy + 7);
      nn.forEach(function (v, i) { if (!v) return; var ww = bw * v / tot; rect(cx, sy, Math.max(.5, ww - 1), 9, DP.lv[i]); cx += ww; });
      font('b', 6.6, sh >= .6 && tot >= 10 ? DP.no : DP.ink); txt(pct(nn[mi], tot) + '% ' + LN[mi], P.x + P.w, sy + 7, { align: 'right' });
      if (tot >= 10 && sh >= .6 && (!flag || sh > flag.sh)) flag = { c: c[1], l: LN[mi], n: nn[mi], tot: tot, sh: sh };
      sy += 13; });
    var lx = P.x; ['Low', 'M−', 'Medium', 'M+', 'High'].forEach(function (l, i) { rect(lx, sy + 1, 6, 6, DP.lv[i], 1); font('n', 5.8, DP.ink2); txt(l, lx + 8, sy + 6); lx += D.getTextWidth(T(l)) + 16; });
    if (flag) note(P, flag.c + ' is ' + flag.l + ' on ' + flag.n + ' of ' + flag.tot + ' wines, which suggests a safe default.', sy + 17, 6.4);
    P = panel(M + w3a + 8, y3, w3b, h3, 'Go-to descriptors', 'Words you reach for');
    var wc = {}, home = {}; W.forEach(function (w) { var seen = {}; String(w.aromas || '').split(/\s*,\s*/).forEach(function (t) { var k = t.trim().replace(/[.;:]+$/, '').toLowerCase(); if (!k || seen[k] || !WORDHOME[k] || WORDHOME[k].c === 'Fruit character') return; seen[k] = 1; wc[k] = (wc[k] || 0) + 1; home[k] = WORDHOME[k].f; }); });
    var tw = Object.keys(wc).sort(function (a, b) { return wc[b] - wc[a]; }).slice(0, 7), wmx = tw.length ? wc[tw[0]] : 1;
    bars(P, tw.map(function (k) { return [wordLabel(k).toLowerCase(), wc[k] / wmx, String(wc[k]), DP.fam[home[k]] || DP.fam.other]; }), 52, 14, 10.6);
    P = panel(M + w3a + w3b + 16, y3, w3c, h3, 'Value finds', 'Most quality per dollar');
    var vf = W.filter(function (w) { return priceOf(w) !== null && QLEVELS.indexOf(w.quality) >= 3; }).sort(function (a, b) { return priceOf(a) / (QLEVELS.indexOf(a.quality) - 1) - priceOf(b) / (QLEVELS.indexOf(b.quality) - 1); }).slice(0, 4);
    var vy = P.y + 2; vf.forEach(function (w) { var cs2 = criticScore(w); font('b', 7.4, DP.ink); txt(fit(String(w.producer || w.aGrape || 'Wine').split(/\s+[-–]\s+/)[0], P.w - 30), P.x, vy + 6); txt(money(priceOf(w)), P.x + P.w, vy + 6, { align: 'right' });
      font('n', 6.2, DP.muted); txt(fit(w.quality + (cs2 !== null ? ' · critics ' + cs2 : '') + (w.aRegion ? ' · ' + w.aRegion : ''), P.w), P.x, vy + 14); vy += 19; });
    if (!vf.length) note(P, 'Wines you rate Very Good or better, with a price, show here.', P.y + 8);

    // ---- D3 coverage
    var y4 = y3 + h3 + 8, h4 = 90;
    var cov = {}; W.forEach(function (w) { var k = answerKey(String(w.aCountry || '')), hit = D3_COUNTRIES.filter(function (d) { return answerKey(d) === k; })[0]; if (hit) cov[hit] = (cov[hit] || 0) + 1; });
    var got = Object.keys(cov).length, cmx = Math.max.apply(null, [1].concat(Object.keys(cov).map(function (k) { return cov[k]; })));
    P = panel(M, y4, CW, h4, 'Diploma coverage', 'D3 countries and styles you’ve tasted');
    font('b', 7.4, DP.ink2); txt(got + ' of 16 countries', P.x + P.w, P.y - 10, { align: 'right' });
    var tw8 = (P.w - 7 * 4) / 8, CL = ['#FFFFFF', '#F5EAED', '#E7C9D3', '#86274A', '#6D1A36'];
    D3_COUNTRIES.slice().sort(function (a, b) { return (cov[b] || 0) - (cov[a] || 0); }).forEach(function (c, i) { var x = P.x + (i % 8) * (tw8 + 4), yy = P.y - 4 + Math.floor(i / 8) * 19, v = cov[c] || 0, lvl = v ? Math.min(4, Math.ceil(v / cmx * 4)) : 0;
      if (lvl) rect(x, yy, tw8, 16, CL[lvl], 3); else { stroke('#DDD3C5', .6); D.setLineDashPattern([1.5, 1.5], 0); D.roundedRect(x, yy, tw8, 16, 3, 3, 'S'); D.setLineDashPattern([], 0); }
      var tc = lvl >= 3 ? '#FFFFFF' : lvl ? DP.ink : DP.muted; var nx = x + 3.5; if (flagPdf(D, c, nx, yy + 5, 6)) nx += 11.5; font('n', 6.1, tc); txt(fit(c, x + tw8 - 10.5 - nx), nx, yy + 10.5); font('b', 7.4, tc); txt(String(v), x + tw8 - 4, yy + 10.8, { align: 'right' }); });
    var st = {}; W.forEach(function (w) { var k = wStyle(w); st[k] = (st[k] || 0) + 1; });
    var SO = [['Red', 'Still red', DP.sig, '#FFFFFF'], ['White', 'Still white', '#C9A24F', DP.ink], ['Rosé', 'Rosé', '#E7A0B0', DP.ink], ['Sparkling', 'Sparkling', '#C77DB2', DP.ink], ['Fortified', 'Fortified', '#8A5530', '#FFFFFF'], ['Sweet', 'Sweet', '#D9B36A', DP.ink]];
    var sx = P.x, syy = P.y + 36; SO.forEach(function (o) { var v = st[o[0]]; if (!v) return; var ww = P.w * v / W.length; rect(sx, syy, Math.max(1, ww - 1.5), 11, o[2]); font('n', 6.2, o[3]); if (ww > 30) txt(fit(o[1] + ' ' + v, ww - 8), sx + 4, syy + 7.8); sx += ww; });

    // ---- grape mix-ups | accuracy by grape
    var y5 = y4 + h4 + 8, h5 = 142, w5a = CW * 0.58, w5b = CW - w5a - 8;
    P = panel(M, y5, w5a, h5, 'Grape mix-ups', 'Your most common mix-ups');
    var R = mixData(B), pairs = {}, lab = {};
    R.forEach(function (rr) { lab[rr.a.key] = rr.a; lab[rr.g.key] = rr.g; if (rr.a.key === rr.g.key) return; var k = [rr.a.key, rr.g.key].sort().join('|'), Q = pairs[k] = pairs[k] || { x: [rr.a.key, rr.g.key].sort(), n: 0, dir: {}, rows: [] }; Q.n++; Q.dir[rr.a.key] = (Q.dir[rr.a.key] || 0) + 1; Q.rows.push(rr); });
    var pl = Object.keys(pairs).map(function (k) { return pairs[k]; }).sort(function (a, b) { return b.n - a.n || b.rows[b.rows.length - 1].w.ymd.localeCompare(a.rows[a.rows.length - 1].w.ymd); }).slice(0, 3);
    var my = P.y; if (!pl.length) note(P, 'Mix-ups appear once you’ve guessed a grape blind and filled in the answer.', my + 6);
    function dir(was, said, nn, yy) { font('b', 7, DP.ink); var ww = D.getTextWidth(T(was)) + 10; rect(P.x + 14, yy - 6.5, ww, 9.5, DP.seg, 4.5); txt(was, P.x + 19, yy); var ax = P.x + 14 + ww + 4; stroke(DP.muted, .7); D.line(ax, yy - 2, ax + 10, yy - 2); D.line(ax + 7, yy - 4.5, ax + 10, yy - 2); D.line(ax + 7, yy + .5, ax + 10, yy - 2);
      font('n', 7, DP.ink2); txt('you said ' + said, ax + 14, yy); var dx = ax + 18 + D.getTextWidth(T('you said ' + said)); for (var i = 0; i < Math.min(nn, 8); i++) { fill(DP.sig); D.circle(dx + i * 6, yy - 2.2, 2, 'F'); } font('b', 7, DP.ink); txt(nn + '×', dx + Math.min(nn, 8) * 6 + 2, yy); }
    pl.forEach(function (Q, ix) { var A = Q.x[0], Bk = Q.x[1], ab = Q.dir[A] || 0, ba = Q.dir[Bk] || 0; if (ba > ab) { var t2 = A; A = Bk; Bk = t2; t2 = ab; ab = ba; ba = t2; }
      fill(DP.tint); D.circle(P.x + 5, my + 3, 5, 'F'); font('b', 6.4, DP.sig); txt(String(ix + 1), P.x + 5, my + 5.2, { align: 'center' });
      font('b', 8, DP.ink); txt(lab[A].label + ' and ' + lab[Bk].label, P.x + 14, my + 6);
      var enc = R.filter(function (rr) { return rr.a.key === A || rr.a.key === Bk; }).slice(-4), right = enc.filter(function (rr) { return rr.p >= 1; }).length;
      font('n', 6.2, DP.muted); txt(right + ' of your last ' + enc.length + ' right', P.x + P.w, my + 6, { align: 'right' });
      my += 14; dir(lab[A].label, lab[Bk].label, ab, my); my += 10.5;
      if (ba) { dir(lab[Bk].label, lab[A].label, ba, my); my += 10.5; } else { font('n', 6, DP.muted); txt('Never the other way round', P.x + 14, my); my += 9; }
      my += 3; });
    P = panel(M + w5a + 8, y5, w5b, h5, 'Accuracy by grape', 'Worst first, after 3 blind tastings');
    var bg = {}; R.forEach(function (rr) { var o = bg[rr.a.key] = bg[rr.a.key] || { k: rr.a.key, n: 0, p: 0 }; o.n++; o.p += Math.min(1, rr.p); });
    var rk = Object.keys(bg).map(function (k) { return bg[k]; }).filter(function (o) { return o.n >= 3; }).sort(function (a, b) { return a.p / a.n - b.p / b.n || b.n - a.n; }).slice(0, 5);
    var ay = rk.length ? bars(P, rk.map(function (o) { return [lab[o.k].label, o.p / o.n, half(o.p) + ' of ' + o.n + ' · ' + pct(o.p, o.n) + '%', o.p / o.n < .5 ? DP.gold : DP.sig]; }), 58, 58, 12) : note(P, 'Each grape joins this chart after three blind tastings.', P.y + 6);
    var fewN = Object.keys(bg).filter(function (k) { return bg[k].n < 3; }).length; if (fewN) note(P, fewN + ' more grape' + (fewN === 1 ? '' : 's') + ' with fewer than three blind tastings.', ay + 6, 6.2);

    // ---- quality calibration | price by your rating
    var y6 = y5 + h5 + 8, h6 = PH - 26 - y6, w6a = CW * 0.42, w6b = CW - w6a - 8;
    P = panel(M, y6, w6a, h6, 'Quality calibration', 'Your quality call against the critics');
    var cp = W.map(function (w) { return { w: w, c: criticScore(w), q: QLEVELS.indexOf(w.quality) }; }).filter(function (o) { return o.c !== null && o.q >= 0; });
    if (cp.length >= 3) {
      var lv = QLEVELS.filter(function (q, i) { return cp.some(function (o) { return o.q === i; }); }).reverse();
      var clo = Math.max(80, Math.floor(Math.min.apply(null, cp.map(function (o) { return o.c; }))) - 1), chi = Math.min(100, Math.ceil(Math.max.apply(null, cp.map(function (o) { return o.c; }))) + 1);
      var cx0 = P.x + 50, cx1 = P.x + P.w - 4, rh = Math.min(22, (P.b - P.y - 30) / Math.max(1, lv.length)), cy0 = P.y + 6, CX = function (v) { return cx0 + (cx1 - cx0) * (v - clo) / (chi - clo); }, CY = function (q) { return cy0 + rh * lv.indexOf(QLEVELS[q]); };
      lv.forEach(function (l, i) { var yy = cy0 + rh * i; stroke(DP.line, .5); D.line(cx0, yy, cx1, yy); font('n', 6.6, DP.ink2); txt(l, cx0 - 6, yy + 2.3, { align: 'right' }); });
      var mn = {}, seen = {}; cp.forEach(function (o) { var k = Math.round(CX(o.c) / 4) + '|' + o.q, nn = seen[k] = (seen[k] || 0) + 1, off = [0, -3, 3, -6, 6][(nn - 1) % 5]; fill(dhex(DP.sig, .75)); D.circle(CX(o.c), CY(o.q) + off, 2.8, 'F'); (mn[o.q] = mn[o.q] || []).push(o.c); });
      Object.keys(mn).forEach(function (q) { var m = mn[q].reduce(function (a, b) { return a + b; }, 0) / mn[q].length; stroke(DP.gold, 1.6); D.line(CX(m), CY(+q) - 6, CX(m), CY(+q) + 6); });
      var ay2 = cy0 + rh * (lv.length - 1) + 12, stp = chi - clo > 12 ? 4 : 2; stroke(DP.line, .5); D.line(cx0, ay2 - 5, cx1, ay2 - 5);
      for (var sc = Math.ceil(clo / stp) * stp; sc <= chi; sc += stp) { font('n', 6, DP.muted); txt(String(sc), CX(sc), ay2 + 2, { align: 'center' }); }
      font('n', 6, DP.muted); txt('critics’ average score · gold tick = average for that level', (cx0 + cx1) / 2, ay2 + 10, { align: 'center' });
      var ms = lv.slice().reverse().filter(function (l) { return mn[QLEVELS.indexOf(l)]; }).map(function (l) { var a = mn[QLEVELS.indexOf(l)]; return l + ' ' + (a.reduce(function (x, y) { return x + y; }, 0) / a.length).toFixed(1); });
      note(P, 'Averages: ' + ms.join(', ') + '.', ay2 + 20, 6.4);
    } else note(P, 'Fills in once three wines have both your quality call and a critic’s score.', P.y + 8);
    P = panel(M + w6a + 8, y6, w6b, h6, 'Price by your rating', 'What the wines you rated cost');
    var PD = priceData(W);
    if (PD.priced.length >= 3) {
      var lx2 = P.x + P.w; [[DP.gold, 'Open (' + PD.nOpen + ')'], [DP.sig, 'Blind (' + PD.nBlind + ')'], ['#9C9096', 'All (' + PD.priced.length + ')']].forEach(function (l) {   // legend on the eyebrow line, right-aligned
        font('n', 6, DP.ink2); var tw2 = D.getTextWidth(T(l[1])); lx2 -= tw2; txt(l[1], lx2, P.y - 24); rect(lx2 - 8, P.y - 29, 6, 6, l[0], 1); lx2 -= 16; });
      var pstep = PD.step * ((PD.top / PD.step) > 4 ? 2 : 1);
      var cL = P.x + 20, cR = P.x + P.w, cT = P.y + 4, cB = P.b - 17, CY2 = function (v) { return cB - (cB - cT) * v / PD.top; }, gw2 = (cR - cL) / PD.rows.length, cw2 = Math.min(17, gw2 * 0.25), gp2 = 2;
      for (var t3 = 0; t3 <= PD.top; t3 += pstep) { stroke(DP.line, .5); D.line(cL, CY2(t3), cR, CY2(t3)); font('n', 5.6, DP.muted); txt('$' + t3, cL - 3, CY2(t3) + 2, { align: 'right' }); }
      PD.rows.forEach(function (r, i) { var cx = cL + gw2 * (i + .5), xs = [cx - cw2 * 1.5 - gp2, cx - cw2 / 2, cx + cw2 / 2 + gp2];
        [[r.all, '#9C9096'], [r.blind, DP.sig], [r.open, DP.gold]].forEach(function (c, k) { var x = xs[k], v = c[0];
          if (v.m === null) { font('n', 6, DP.muted); txt('–', x + cw2 / 2, cB - 3, { align: 'center' }); return; }
          rect(x, CY2(v.m), cw2, cB - CY2(v.m), v.n === 1 ? dhex(c[1], .4) : c[1], 1.5); font('b', 6, DP.ink); txt(money(v.m), x + cw2 / 2, CY2(v.m) - 2.5, { align: 'center' }); });
        font('n', 6.4, DP.ink2); txt(r.q, cx, cB + 8, { align: 'center' }); font('n', 5.2, DP.muted); txt(r.blind.n + ' blind · ' + r.open.n + ' open', cx, cB + 14.5, { align: 'center' }); });
      stroke(DP.faint || '#CFC6BE', .6); D.line(cL, cB, cR, cB);
    } else note(P, 'Fills in once three rated wines have a price.', P.y + 8);

    // ---- footer
    font('n', 6.2, DP.muted); txt('Tasting Notes ' + VERSION_LABEL + '  ·  critic scores and prices come from web searches and are approximate', M, PH - 12);
    return D.output('blob');
  });
}
document.addEventListener('click', function (e) {
  if (!e.target.closest('[data-db-pdf]')) return;
  toast('Making PDF…');
  dashPdf().then(function (blob) {
    var d = new Date(), stamp = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    readyToShare(blob, 'Tasting Notes dashboard ' + stamp + '.pdf', 'Tasting Notes dashboard', 'Your one-page dashboard PDF is ready. Tap Share to print it, save it to Files, or send it by Messages or Mail.');
  }).catch(function (err) { toast(err.message || 'Could not make the PDF'); });
});
/*build*/(window.__V = window.__V || {})['dash'] = 'v2.78';
