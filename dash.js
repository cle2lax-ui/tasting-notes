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
    '<h2 class="db-title">How your palate is tracking</h2></div><div class="db-filters">' +
    chipRow('scope', [['all', 'All wines'], ['blind', 'Blind only'], ['recent', 'Last 30 days']], DASH.scope) +
    chipRow('style', [['all', 'All styles'], ['Red', 'Red'], ['White', 'White'], ['Rosé', 'Rosé'], ['Sparkling', 'Sparkling'], ['Fortified', 'Fortified'], ['Sweet', 'Sweet']], DASH.style) + '</div></div>';
  if (!W.length) { el.innerHTML = h + '<div class="db-empty">' + (ALL.length ? 'No wines match these filters.' : 'Taste a few wines and your dashboard fills in here.') + '</div>'; return; }
  h += kpis(W, B);
  h += '<div class="db-row">' + accuracy(B) + sessions(B) + '</div>';
  h += mixups(B);
  h += '<div class="db-row db-35">' + habits(W) + words(W) + '</div>';
  h += coverage(W);
  h += '<div class="db-row db-35">' + calibration(W) + value(W) + '</div>';   // last: the two that compare with outside sources (critics, prices)
  h += priceByRating(W);
  el.innerHTML = h;
}

function kpis(W, B) {
  var pts = 0, of = 0, vin = 0, vn = 0, miss = 0;
  B.forEach(function (w) { wPts(w).forEach(function (p, i) { if (p === null) return; pts += p; of++; }); var gy = parseInt(w.gVintage, 10), ay = parseInt(w.aVintage, 10); if (!isNaN(gy) && !isNaN(ay)) { vn++; if (Math.abs(gy - ay) <= 1) vin++; miss += Math.abs(gy - ay); } });
  var pr = W.map(priceOf).filter(function (p) { return p !== null; }), md = median(pr);
  var tile = function (eb, big, sub, cls) { return '<div class="db-card db-kpi"><p class="db-eb">' + eb + '</p><div class="db-big' + (cls ? ' ' + cls : '') + '">' + big + '</div><p class="db-sub">' + sub + '</p></div>'; };
  return '<div class="db-kpis">' +
    tile('Wines tasted', W.length, B.length + ' blind · ' + (W.length - B.length) + ' tasted open') +
    tile('Blind score', of ? pct(pts, of) + '%' : '–', of ? half(pts) + ' of ' + of + ' points · ' + (pts / B.length).toFixed(1) + ' per wine' : 'No blind wines yet', 'sig') +
    tile('Vintage within a year', vn ? pct(vin, vn) + '%' : '–', vn ? vin + ' of ' + vn + ' · average miss ' + (miss / vn).toFixed(1) + ' years' : 'No vintages guessed yet') +
    tile('Median bottle', md !== null ? money(Math.round(md)) : '–', pr.length ? money(Math.min.apply(null, pr)) + ' to ' + money(Math.max.apply(null, pr)) + ' · ' + pr.length + ' priced' : 'No prices yet') + '</div>';
}

function accuracy(B) {
  var names = ['Grape', 'Country', 'Region', 'Vintage'], s = [0, 0, 0, 0], n = [0, 0, 0, 0];
  B.forEach(function (w) { wPts(w).forEach(function (p, i) { if (p !== null) { s[i] += p; n[i]++; } }); });
  if (!B.length) return card('', 'Blind accuracy', 'Where your points come from', '<p class="db-sub">Taste a wine blind to see your accuracy.</p>');
  var order = [0, 1, 2, 3].sort(function (a, b) { return (n[b] ? s[b] / n[b] : 0) - (n[a] ? s[a] / n[a] : 0); });
  var body = '<div class="db-bars">' + order.map(function (i) { return bar(names[i], n[i] ? s[i] / n[i] : 0, half(s[i]) + ' / ' + n[i] + ' · ' + pct(s[i], n[i]) + '%', i === order[3] ? 'gold' : ''); }).join('') + '</div>';
  var lo = order[3], note = '';
  if (n[lo] >= 5) note = names[lo] === 'Region' ? 'Region is the soft spot: ' + half(s[2]) + ' of ' + n[2] + '. It only scores once the grape and country are right, so the grape is the lever.' :
    names[lo] + ' is the soft spot: ' + half(s[lo]) + ' of ' + n[lo] + ' points.';
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

/* ---- price by your rating: every priced wine as a dot on one price scale, the median marked, for all wines, blind and open side by side */
function priceByRating(W) {
  var priced = W.filter(function (w) { return priceOf(w) !== null && QLEVELS.indexOf(w.quality) >= 0; });
  if (priced.length < 3) return card('db-wide', 'Price by your rating', 'What the wines you rated cost', '<p class="db-sub">This fills in once three rated wines have a price.</p>');
  var levels = QLEVELS.filter(function (q) { return priced.some(function (w) { return w.quality === q; }); }).reverse();
  var mx = Math.max.apply(null, priced.map(priceOf)), step = mx > 150 ? 50 : mx > 60 ? 25 : 10, top = Math.ceil(mx / step) * step;
  var at = function (p) { return (p / top * 100).toFixed(2) + '%'; };
  var sets = [['All wines', priced], ['Blind', priced.filter(isBlind)], ['Tasted open', priced.filter(function (w) { return !isBlind(w); })]];
  var med = {};
  var panels = sets.map(function (S) {
    med[S[0]] = {};
    var rows = levels.map(function (q) {
      var ws = S[1].filter(function (w) { return w.quality === q; }), ps = ws.map(priceOf), m = median(ps);
      med[S[0]][q] = { m: m, n: ps.length };
      var dots = ws.map(function (w) { return '<i style="left:' + at(priceOf(w)) + '" title="' + esc((w.producer || 'Wine') + ': ' + money(priceOf(w))) + '"></i>'; }).join('');
      return '<div class="db-pr"><span class="db-prq">' + q + '</span><span class="db-prt">' + dots + (m !== null && ps.length > 1 ? '<b style="left:' + at(m) + '"></b>' : '') + '</span>' +
        '<span class="db-prv">' + (m === null ? '–' : money(m) + '<small>' + ps.length + (ps.length === 1 ? ' wine' : ' wines') + '</small>') + '</span></div>';
    }).join('');
    var ticks = ''; for (var t = 0; t <= top; t += step) ticks += '<span style="left:' + at(t) + '">$' + t + '</span>';
    return '<div class="db-pp"><h4 class="db-h4">' + S[0] + '<small>' + S[1].length + ' priced</small></h4>' + (S[1].length ? rows + '<div class="db-pax" aria-hidden="true">' + ticks + '</div>' : '<p class="db-sub">No ' + S[0].toLowerCase() + ' wines with a price in this view.</p>') + '</div>';
  }).join('');
  // a plain-words comparison of blind and open, only where both sides have enough wines
  var notes = levels.map(function (q) { var b = med.Blind[q], o = med['Tasted open'][q];
    return b && o && b.n >= 3 && o.n >= 3 && Math.abs(b.m - o.m) >= 5 ? 'Your ' + q + ' wines cost a median ' + money(b.m) + ' tasted blind and ' + money(o.m) + ' tasted open.' : ''; }).filter(Boolean);
  var aria = sets.map(function (S) { return S[0] + ': ' + levels.map(function (q) { var x = med[S[0]][q]; return x.m === null ? '' : q + ' ' + money(x.m); }).filter(Boolean).join(', '); }).join('; ');
  var foot = (notes.length ? notes.join(' ') + ' ' : '') + 'Each dot is a wine; the gold line is the median.' + (priced.length < 40 ? ' With only a few wines at some levels, the medians will move a lot as you taste more.' : '');
  return card('db-wide', 'Price by your rating', 'What the wines you rated cost', '<div class="db-pps" role="img" aria-label="Median price by your quality rating. ' + esc(aria) + '">' + panels + '</div><p class="db-sub">' + foot + '</p>');
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
    return '<div class="db-ct c' + lvl + '"><span>' + c + '</span><b>' + n + '</b></div>'; }).join('');
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
/*build*/(window.__V = window.__V || {})['dash'] = 'v2.68';
