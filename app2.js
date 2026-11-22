/* Tasting Notes 2 — Notebook, tasting card, PDF, sync status, start-up. */
var NB = { field: '(no filter)', value: '(all)', sort: 'Date & Wine #', desc: true, q: '' };
var SEL = {}, selecting = false;

function setView(v) {
  view = v; document.body.setAttribute('data-view', v);
  $$('#tabs button').forEach(function (b) { b.setAttribute('aria-selected', String(b.getAttribute('data-view') === v)); });
  if (v === 'notebook') renderNotebook();
  window.scrollTo(0, 0);
}
$('tabs').addEventListener('click', function (e) { var b = e.target.closest('button'); if (b) setView(b.getAttribute('data-view')); });
/* reconnect Google on the taps that matter (Safari only opens Google's window from a tap) */
document.addEventListener('click', function (e) {
  if (!e.target.closest('#saveBtn, #nextBtn, #tabs button[data-view="notebook"]')) return;
  if (!Sync.connected() || Sync.signedIn() || !navigator.onLine) return;
  Sync.signIn().then(function () { Sync.soon(); }, function () {});
}, true);

function setData(all) {
  ALL = all || [];
  WINES = ALL.filter(function (w) { return w.ymd && w.wineNo !== ''; }).map(function (w) { return { d: w.ymd, n: Number(w.wineNo) }; });
  var pick = function (keys) { var seen = {};
    ALL.forEach(function (w) { keys.forEach(function (k) { var v = String(w[k] || '').trim(); if (v && !seen[v.toLowerCase()]) seen[v.toLowerCase()] = v; }); });
    return Object.keys(seen).map(function (k) { return seen[k]; }).sort(function (a, b) { return a.localeCompare(b); }); };
  LISTS = { grape: pick(['gGrape', 'aGrape']), country: pick(['gCountry', 'aCountry']), region: pick(['gRegion', 'aRegion']), event: pick(['event']) };
  ['grape', 'country', 'region', 'event'].forEach(function (k) {
    var seen = {}, all = (LISTS[k] || []).concat(WSET_LISTS[k] || []).filter(function (v) { var key = answerKey(v); if (seen[key]) return false; seen[key] = 1; return true; });
    $('dl-' + k).innerHTML = all.map(function (v) { return '<option value="' + esc(v) + '">'; }).join(''); });
  if (view === 'notebook') renderNotebook();
}
function refreshPhotoIds() { return DB.keys('photos').then(function (k) { PHOTO_IDS = {}; (k || []).forEach(function (id) { PHOTO_IDS[id] = true; }); }); }
function fillThumbs(wines) {
  var need = wines.filter(function (w) { return PHOTO_IDS[w.id] && !THUMBS[w.id]; });
  if (!need.length) return;
  Promise.all(need.map(function (w) { return Photos.urls(w.id).then(function (x) { if (x) THUMBS[w.id] = x; }); })).then(function () { if (view === 'notebook') renderNotebook(); });
}

/* ====================================================================== Notebook list */
function shownWines() {
  var wines = applyFilterSort(ALL, NB.field, NB.value, NB.sort, NB.desc ? 'Descending' : 'Ascending'), q = NB.q.trim().toLowerCase();
  if (!q) return wines;
  var keys = ['producer', 'event', 'aGrape', 'aRegion', 'aCountry', 'aVintage', 'gGrape', 'gRegion', 'gCountry', 'appNotes', 'aromas', 'noseNotes', 'flavors', 'tanNature', 'palate', 'qReason', 'aReason', 'quality', 'color'];
  return wines.filter(function (w) { return keys.some(function (k) { return String(w[k] || '').toLowerCase().indexOf(q) >= 0; }); });
}
function idParts(w) {                                                  // the identity line in whole parts: a line never ends on a dot
  return [w.aGrape, w.aRegion, w.aCountry, w.aVintage].filter(Boolean).map(function (t, i) { return '<span class="idp">' + esc(t) + '</span>'; }).join('');
}
function idLine(w) { return [w.aGrape, w.aRegion, w.aCountry, w.aVintage].filter(Boolean).join(' · '); }
function labHTML(w, cls) {
  var th = THUMBS[w.id];
  return th ? '<img class="lab ' + (cls || '') + '" src="' + th.thumb + '" data-full="' + th.full + '" alt="Label">' : '<span class="lab none ' + (cls || '') + '" style="--wc:' + (SWC[w.color] || 'var(--line-2)') + '"></span>';
}
function dotsHTML(w) { if (w.open || !w.hits) return ''; return '<span class="dots">' + w.hits.map(function (h) { return '<i class="' + (h === null ? '' : h === 0.5 ? 'h' : h ? 'y' : 'n') + '"></i>'; }).join('') + '</span>'; }
function syncAgo() {                                                   // "Synced 2 min ago" under the search, for people using a Google Sheet
  if (!window.Sync || !Sync.connected()) return '';
  var st = Sync.state(), t = +(Sync.config().lastSync || 0);
  if (st === 'syncing') return ' · <span class="sy">Syncing…</span>';
  if (st === 'signin') return ' · <span class="sy warn">Sync paused</span>';
  if (st === 'error') return ' · <span class="sy warn">Not synced</span>';
  if (!t) return '';
  var m = Math.round((Date.now() - t) / 60000);
  return ' · <span class="sy">Synced ' + (m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) + '</span>';
}
setInterval(function () { var sh = $('showing'); if (sh && sh.querySelector('.sy') && !document.hidden) { var y = sh.querySelector('.sy'); y.outerHTML = syncAgo().replace(/^ · /, ''); } }, 60000);
function rowHTMLnb(w) {
  var title = w.producer || w.aGrape || 'Not yet revealed', sub = w.producer ? idLine(w) : !w.aGrape && w.gGrape ? 'My guess: ' + [w.gGrape, w.gRegion].filter(Boolean).join(' · ') : idLine(w);
  var acts = selecting || !w.ymd ? '' : '<div class="ract" aria-hidden="true"><button type="button" class="ra edit" tabindex="-1" data-edit="' + w.ymd + '|' + w.wineNo + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>Edit</button><button type="button" class="ra share" tabindex="-1" data-pdf1="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2M5 4.8L8 2l3 2.8M4.5 7H3.5v7h9V7h-1"/></svg>PDF</button><button type="button" class="ra del" tabindex="-1" data-del="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>Delete</button></div>';
  return '<div class="rw2">' + acts + '<button type="button" class="row' + (SEL[w.id] ? ' sel' : '') + '" data-id="' + esc(w.id) + '">' + (selecting ? '<span class="pick">' + (SEL[w.id] ? '✓' : '') + '</span>' : '') + labHTML(w) +
    '<span class="w"><b' + (w.producer || w.aGrape ? '' : ' class="un"') + '>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '<small>' + esc(['Wine ' + w.wineNo, w.quality].filter(Boolean).join(' · ')) + '</small></span>' +
    '<span class="sc">' + (w.open ? '<em>Open</em>' : w.score === '' ? '<b>–</b>' : '<b>' + fmtScore(w.score) + '<small>/4</small></b>') + dotsHTML(w) + '</span></button></div>';
}
function renderNotebook() {
  var wines = shownWines(), byGroup = NB.sort === 'Date & Wine #' || NB.sort === 'Tasting / Event', html = '', last = null;
  var filtered = NB.field !== '(no filter)' && NB.value !== '(all)';
  $('showing').innerHTML = !ALL.length ? '' : (filtered ? esc(NB.field) + ': <b>' + esc(NB.value) + '</b> · ' : '') + wines.length + ' of ' + ALL.length + ' wine' + (ALL.length === 1 ? '' : 's') +
    (NB.q.trim() ? ' matching “' + esc(NB.q.trim()) + '”' : '') + ' · ' + esc(NB.sort.toLowerCase()) + syncAgo();
  $('nbCount').textContent = ALL.length + ' wine' + (ALL.length === 1 ? '' : 's');
  $('filterBtn').classList.toggle('on', filtered || NB.sort !== 'Date & Wine #' || !NB.desc);
  wines.forEach(function (w) {
    var gk = NB.sort === 'Tasting / Event' ? (w.event || '') : w.ymd;
    if (byGroup && gk !== last) {
      var grp = wines.filter(function (x) { return (NB.sort === 'Tasting / Event' ? (x.event || '') : x.ymd) === gk; });
      var ev = grp.map(function (x) { return x.event; }).filter(Boolean).filter(function (v, j, a) { return a.indexOf(v) === j; });
      var when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
      html += '<div class="grp"><b>' + esc(NB.sort === 'Tasting / Event' ? (gk || 'No event') : when) + '</b><span>' + (grp.length > 1 && !selecting ? '<button type="button" class="lnk fsum" data-fsum="' + esc(NB.sort === 'Tasting / Event' ? 'e:' + gk : 'd:' + gk) + '">Summary \u203a</button> ' : '') + esc((NB.sort === 'Tasting / Event' ? '' : ev.join(' · ') + (ev.length ? ' · ' : '')) + grp.length + ' wine' + (grp.length === 1 ? '' : 's')) + '</span></div>';
      last = gk;
    }
    html += rowHTMLnb(w);
  });
  $('list').innerHTML = wines.length ? html : (ALL.length ? '<div class="empty"><h3>No wines to show</h3><p>Nothing matches. Try clearing the search or filter.</p></div>'
    : '<div class="empty first"><h3>Your notebook is empty</h3><p>Click <button type="button" class="lnk" data-go="taste">Tasting</button> above to start a new tasting note</p></div>');
  $('nbView').classList.toggle('selecting', selecting);
  fillThumbs(wines);
}
$('q').addEventListener('input', function () { NB.q = this.value; clearTimeout(this.t); this.t = setTimeout(renderNotebook, 120); });   // redraw once typing pauses
$('list').addEventListener('click', function (e) {
  if (e.target.closest('.ract')) return;
  var r = e.target.closest('.row'); if (!r) return; var id = r.getAttribute('data-id');
  if (SWIPE.justMoved) { SWIPE.justMoved = false; return; }
  if (SWIPE.open) { closeSwipe(); return; }
  if (selecting) { if (SEL[id]) delete SEL[id]; else SEL[id] = true; paintSel(); r.classList.toggle('sel', !!SEL[id]); r.querySelector('.pick').textContent = SEL[id] ? '✓' : ''; return; }
  var w = ALL.filter(function (x) { return x.id === id; })[0]; if (!w) return;
  openCard(w);
});
function openCard(w) {
  findPrice(w); findReviews(w); $('cardBody').innerHTML = cardHTML(w); sheet('cardSheet'); var pn = $('cardSheet').querySelector('.panel'); pn.scrollTop = 0;   // each wine opens at its top
  pn.style.setProperty('--phh', pn.querySelector('.ph').offsetHeight + 'px');                     // the wine's name and photo stay pinned just under Done
}
$('cardClose').onclick = function () { sheet('cardSheet', false); };
document.addEventListener('click', function (e) {
  var ed = e.target.closest('[data-edit]');
  if (ed) { var p = ed.getAttribute('data-edit').split('|'); guard('Open this wine?').then(function (go) { if (!go) return; sheet('cardSheet', false); openWine(p[0], +p[1]); }); return; }
  var one = e.target.closest('[data-pdf1]');
  if (one) { var w = ALL.filter(function (x) { return x.id === one.getAttribute('data-pdf1'); })[0]; if (w) sharePdf([w], w.producer || w.aGrape || 'Tasting note'); return; }
  var im = e.target.closest('.card img.lab, .row img.lab'); if (im && !selecting && e.target.closest('.card')) { showPhoto(im.getAttribute('data-full')); }
});

/* ---- Filter sheet */
$('filterBtn').onclick = function () {
  $('fField').innerHTML = FILTERS.map(function (f) { return '<option>' + esc(f[0]) + '</option>'; }).join(''); $('fField').value = NB.field; fillValues();
  $('sField').innerHTML = SORTS.map(function (s) { return '<option>' + esc(s[0]) + '</option>'; }).join(''); $('sField').value = NB.sort;
  paintOrd(); sheet('filterSheet');
};
function fillValues() { var o = filterOptions(ALL, NB.field); if (o.indexOf(NB.value) < 0) NB.value = '(all)'; $('fValue').innerHTML = o.map(function (v) { return '<option>' + esc(v) + '</option>'; }).join(''); $('fValue').value = NB.value; $('fValue').disabled = NB.field === '(no filter)'; }
function paintOrd() { $$('#ordSeg button').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-o') === 'd') === NB.desc); }); }
function saveNb() { store(NB_KEY, { field: NB.field, value: NB.value, sort: NB.sort, desc: NB.desc, dv: 2 }); renderNotebook(); }
$('fField').onchange = function () { NB.field = this.value; NB.value = '(all)'; fillValues(); saveNb(); };
$('fValue').onchange = function () { NB.value = this.value; saveNb(); };
$('sField').onchange = function () { NB.sort = this.value; saveNb(); };
$('ordSeg').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; NB.desc = b.getAttribute('data-o') === 'd'; paintOrd(); saveNb(); };
$('fReset').onclick = function () { NB.field = '(no filter)'; NB.value = '(all)'; NB.sort = 'Date & Wine #'; NB.desc = true; $('fField').value = NB.field; fillValues(); $('sField').value = NB.sort; paintOrd(); saveNb(); };
$('filterDone').onclick = function () { sheet('filterSheet', false); };
$('fSelect').onclick = function () { sheet('filterSheet', false); setSelecting(true); };
$('fPdf').onclick = function () { sheet('filterSheet', false); var f = NB.field !== '(no filter)' && NB.value !== '(all)'; sharePdf(shownWines(), f ? NB.value : ''); };
$('selBtn').onclick = function () { setSelecting(!selecting); };
$('pdfBtn').onclick = function () { var f = NB.field !== '(no filter)' && NB.value !== '(all)'; sharePdf(shownWines(), f ? NB.value : ''); };

/* ---- select → Share PDF / Send to a Friend */
function setSelecting(on) { selecting = on; if (!on) SEL = {}; $('selbar').classList.toggle('show', on); $('selBtn').textContent = on ? 'Cancel' : 'Select'; renderNotebook(); paintSel(); }
function paintSel() { var n = Object.keys(SEL).length; $('selN').textContent = n + ' selected'; $('selPdf').disabled = $('selSend').disabled = !n; }
function selectedWines() { return shownWines().filter(function (w) { return SEL[w.id]; }); }
$('selDone').onclick = function () { setSelecting(false); };
$('selAll').onclick = function () { shownWines().forEach(function (w) { SEL[w.id] = true; }); renderNotebook(); paintSel(); };
$('selPdf').onclick = function () { var l = selectedWines(); sharePdf(l, flightTitle(l)); };
$('selSend').onclick = function () {
  var list = selectedWines(), title = flightTitle(list); toast('Preparing the file…');
  Backup.make(list.map(function (w) { return w.id; }), true, title).then(function (file) {
    readyToShare(new Blob([JSON.stringify(file)], { type: 'application/json' }), fileSafe(title) + '.tasting.json', title,
      'Your file of ' + list.length + ' wine' + (list.length === 1 ? '' : 's') + ' is ready. Your friend opens it in the app with Settings › Restore or Import.');
  }).catch(function (err) { toast(err.message || 'Could not share'); });
};

/* ====================================================================== the tasting card */
function cap(s) { s = String(s || '').trim(); return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function sent(s) { s = cap(s); return s && !/[.!?]$/.test(s) ? s + '.' : s; }
function lw(v) { return nice(v).toLowerCase(); }
/* ---- the written note, in the full sentences of the WSET Systematic Approach.
   Each assessed term is stated as a sentence ("The acidity is Medium Plus.") with the SAT term capitalized;
   descriptors are grouped by where they come from (primary, secondary, tertiary) using the Lexicon;
   the taster's own comments follow in the same voice. */
function andList(a) { a = a.filter(Boolean); return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function term(v) { return nice(v); }                                   // SAT terms keep their capitals: Pale, Medium Plus, Off-Dry
var RIPE = { 'unripe fruit': 'Unripe', 'ripe fruit': 'Ripe', 'dried fruit': 'Dried', 'cooked fruit': 'Cooked' };
var ORIGIN_WORD = { p: 'primary', s: 'secondary', t: 'tertiary' };
/* ---- the written note, following the WSET L4 Tasting Guidance (Issue 1.4, 2023):
   - every structural component is named with its single SAT level ("The acidity is Medium Plus.")
   - clarity and condition carry no marks (exam wines are clear and clean), so they are only written when they point to a fault
   - aromas and flavors follow the Lexicon: specific descriptors introduced by their cluster and grouped by type
     ("primary aromas of black fruit (blackcurrant, black cherry) and herbal (mint); secondary aromas of oak (vanilla)"),
     "simple" is stated when chosen, and fruit character (ripe, cooked…) follows
   - order follows the SAT: Nose = intensity, aromas, development; Palate = sweetness … flavor intensity, flavors, other
     observations, finish
   - Quality states the level, then specific reasons drawn from the note; Bottle aging uses the SAT wording and gives reasons */
var CLUSTER_NAME = { 'Red fruit': 'red fruit', 'Black fruit': 'black fruit', 'Citrus fruit': 'citrus fruit', 'Green fruit': 'green fruit',
  'Stone fruit': 'stone fruit', 'Tropical fruit': 'tropical fruit', 'Dried and cooked fruit': 'dried fruit', 'Flowers': 'floral',
  'Herbaceous': 'herbaceous', 'Herbal': 'herbal', 'Pepper and licorice': 'spice', 'Sweet spice': 'sweet spice', 'Oak': 'oak',
  'Lees and autolysis': 'autolysis', 'Malolactic': 'malolactic', 'Earth and savory': 'bottle age', 'Nut, honey and caramel': 'nut and honey',
  'Mineral': 'mineral', 'Flor': 'flor', 'Fruit style': '' };
var CLUSTER_ORDER = []; LEXFAM.forEach(function (f) { f.clusters.forEach(function (c) { CLUSTER_ORDER.push(c[0]); }); });
function descParts(raw, noun) {                                        // noun: 'aromas' or 'flavors'
  var seen = {}, toksIn = String(raw || '').split(/\s*,\s*/).map(function (t) { return t.trim().replace(/[.;:]+$/, ''); }).filter(function (t) { var k = t.toLowerCase(); if (!t || seen[k]) return false; seen[k] = 1; return true; });
  var byType = { p: {}, s: {}, t: {} }, own = [], ripe = [], simple = false, words = { p: [], s: [], t: [] };
  toksIn.forEach(function (t) {
    var k = t.toLowerCase();
    if (k === 'simple') { simple = true; return; }
    if (RIPE[k]) { ripe.push(RIPE[k]); return; }
    var h = WORDHOME[k]; if (!h) { own.push(t.charAt(0) === t.charAt(0).toUpperCase() && t.slice(1) === t.slice(1).toLowerCase() ? t.toLowerCase() : t); return; }
    var lab = wordLabel(h.w).toLowerCase(); (byType[h.t][h.c] = byType[h.t][h.c] || []).push(lab); words[h.t].push(lab);
  });
  var used = ['p', 's', 't'].filter(function (o) { return Object.keys(byType[o]).length; });
  var groups = used.map(function (o) {
    var cl = Object.keys(byType[o]).sort(function (a, b) { return CLUSTER_ORDER.indexOf(a) - CLUSTER_ORDER.indexOf(b); });
    return cl.map(function (c) { var n = CLUSTER_NAME[c] != null ? CLUSTER_NAME[c] : c.toLowerCase(); return n ? n + ' (' + byType[o][c].join(', ') + ')' : byType[o][c].join(', '); });
  });
  var list = '';
  if (used.length > 1 || (used.length === 1 && used[0] !== 'p')) {
    var parts = used.map(function (o, i) { return ORIGIN_WORD[o] + ' ' + noun + ' of ' + andList(groups[i]); });
    list = parts.length === 1 ? parts[0] : parts.slice(0, -1).join('; ') + '; and ' + parts[parts.length - 1];
  } else if (used.length) list = noun + ' of ' + andList(groups[0]);
  if (simple && list) list = 'simple ' + list;
  return { list: list, own: own, ripe: ripe, simple: simple && !list, words: words, types: used };
}
function descSentences(raw, noun) {
  var d = descParts(raw, noun), out = [];
  if (d.list) out.push('It shows ' + d.list + '.');
  else if (d.simple) out.push('The ' + noun + ' are simple.');
  if (d.own.length) out.push((d.list ? 'There are also notes of ' : 'It shows ' + noun + ' of ') + andList(d.own) + '.');
  if (d.ripe.length) out.push('The fruit character is ' + andList(d.ripe) + '.');
  return out.join(' ');
}
function rank(v, list) { return (S[list] || []).indexOf(v); }
function low1(v) { return term(v); }
function qualityReasons(w) {                                           // specific evidence for each reason the taster ticked
  var bl = String(w.blic || '').split(/\s*,\s*/).filter(Boolean).map(function (x) { return x.toLowerCase(); }), R = [];
  var a = descParts(w.aromas, 'aromas'), f = descParts(String(w.flavors || '').split(/\s*,\s*/).filter(function (x) { return !isSame(x); }).join(', '), 'flavors');
  var fruitInt = w.flavInt || w.noseInt;
  if (bl.indexOf('balance') >= 0) {
    var struct = [w.acidity && term(w.acidity) + ' acidity', w.tannin && term(w.tannin) + ' tannins'].filter(Boolean);
    if (w.sweetness && rank(w.sweetness, 'sweetness') >= 3 && w.acidity) R.push('The sweetness is balanced by ' + term(w.acidity) + ' acidity.');
    else if (struct.length && fruitInt) R.push('The ' + andList(struct) + ' ' + (struct.length > 1 ? 'are' : 'is') + ' balanced by ' + term(fruitInt) + ' fruit intensity.');
    else R.push('The structure and fruit are in balance.');
    if (w.alcohol === 'High') R.push('The High alcohol is integrated rather than hot.');
  }
  if (bl.indexOf('intensity') >= 0 && fruitInt) R.push('The ' + term(fruitInt) + ' intensity gives concentrated, well-defined flavors.');
  if (bl.indexOf('length') >= 0 && w.finish) R.push('The ' + term(w.finish) + ' finish lifts the quality.');
  if (bl.indexOf('complexity') >= 0) {
    var types = ['p', 's', 't'].filter(function (o) { return a.words[o].length || f.words[o].length; });
    var eg = types.map(function (o) { return (a.words[o].concat(f.words[o]))[0]; });
    if (types.length > 1) R.push('Complexity comes from ' + andList(types.map(function (o) { return ORIGIN_WORD[o]; })) + ' characters (' + eg.join(', ') + ').');
    else { var pw = a.words.p.concat(f.words.p).filter(function (x, i, all) { return all.indexOf(x) === i; }).slice(0, 3); R.push('Complexity comes from a range of primary characters' + (pw.length ? ' (' + pw.join(', ') + ')' : '') + '.'); }
  }
  return R;
}
function agingReasons(w) {                                              // used only when the taster hasn't written their own
  var a = descParts(w.aromas, 'aromas'), R = [], ok = w.aging === 'Suitable';
  if (ok) {
    var st = [w.flavInt && term(w.flavInt) + ' flavor intensity', w.acidity && term(w.acidity) + ' acidity', w.tannin && term(w.tannin) + ' tannins'].filter(Boolean);
    if (st.length) R.push('It has the concentration and structure to improve, with ' + andList(st) + '.');
    if (a.words.t.length) R.push('Tertiary characters are starting to show and should develop further.');
    else if (st.length) R.push('Its primary fruit should develop tertiary complexity with time.');
  } else {
    if (/fully/i.test(w.development || '')) R.push('It is Fully Developed and will keep but not improve.');
    else if ((w.flavInt && rank(w.flavInt, 'intensity') <= 1) || a.simple || /^simple /.test(a.list)) R.push('It lacks the concentration to improve in bottle, and its primary fruit will fade.');
  }
  return R;
}
function prose(w) {
  var out = [], A = [];
  // Appearance: intensity and color (clarity only when it points to a fault), then other observations
  if (/hazy/i.test(w.clarity || '')) A.push('The wine is Hazy, which may indicate a fault.');
  if (w.appInt && w.color) A.push('The color intensity is ' + term(w.appInt) + ' and the color is ' + term(w.color) + '.');
  else if (w.color) A.push('The color is ' + term(w.color) + '.');
  else if (w.appInt) A.push('The color intensity is ' + term(w.appInt) + '.');
  if (w.appNotes) A.push(sent(w.appNotes));
  if (A.length) out.push({ h: 'Appearance', m: A.join(' ') });
  // Nose: intensity, aroma characteristics, development (condition only when unclean)
  var N = [];
  if (/unclean/i.test(w.condition || '')) N.push('The nose is Unclean, which may indicate a fault.');
  if (w.noseInt) N.push('The aroma intensity is ' + term(w.noseInt) + '.');
  var ar = descSentences(w.aromas, 'aromas'); if (ar) N.push(ar);
  if (w.development) N.push('The wine is ' + term(w.development) + '.');
  if (w.noseNotes) N.push(sent(w.noseNotes));
  if (N.length) out.push({ h: 'Nose', m: N.join(' ') });
  // Palate: sweetness, acidity, tannin, alcohol, body, flavor intensity, flavor characteristics, other observations, finish
  var P = [];
  if (w.sweetness) P.push('The wine is ' + term(w.sweetness) + '.');
  if (w.acidity) P.push('The acidity is ' + term(w.acidity) + '.');
  if (w.tannin) {
    var tn = String(w.tanNature || '').trim().replace(/\.$/, ''), short = tn && tn.split(/\s+/).length <= 4 && !/[.;!?]/.test(tn);
    P.push('The tannins are ' + term(w.tannin) + (short ? ' and ' + tn.charAt(0).toLowerCase() + tn.slice(1) : '') + '.');
    if (tn && !short) P.push(sent(tn));
  } else if (w.tanNature) P.push(sent(w.tanNature));
  if (w.alcohol) P.push('The alcohol is ' + term(w.alcohol) + '.');
  if (w.body) P.push('The body is ' + term(w.body) + '.');
  if (w.flavInt) P.push('The flavor intensity is ' + term(w.flavInt) + '.');
  var fl = String(w.flavors || '').split(/\s*,\s*/).filter(Boolean), same = fl.some(isSame), more = fl.filter(function (x) { return !isSame(x); }).join(', ');
  if (same) {                                                           // the taster's phrase, then the flavors written out (marks go to named flavors)
    var d = descParts([String(w.aromas || ''), more].filter(Boolean).join(', '), 'flavors');
    P.push(SAME + (d.list ? ': ' + d.list : '') + '.');
    if (d.own.length) P.push('There are also notes of ' + andList(d.own) + '.');
  } else { var fs = descSentences(more, 'flavors'); if (fs) P.push(fs); }
  if (w.palate) P.push(sent(w.palate));                                 // other observations (texture, pétillance…)
  if (w.finish) P.push('The finish is ' + term(w.finish) + '.');
  if (P.length) out.push({ h: 'Palate', m: P.join(' ') });
  // Quality: the level stands alone (bold, larger); then reasons specific to this wine
  var Q = qualityReasons(w); if (w.qReason) Q.push(sent(w.qReason));
  if (w.quality || Q.length) out.push({ h: 'Quality', q: w.quality ? term(w.quality) : '', m: Q.join(' ') });
  // Suitability for bottle aging, in the SAT's wording, with reasons
  if (w.aging) {
    var B = [w.aging === 'Suitable' ? 'The wine is suitable for bottle aging.' : 'The wine is not suitable for bottle aging.'];
    B = B.concat(w.aReason ? [sent(w.aReason)] : agingReasons(w));
    out.push({ h: 'Bottle aging', m: B.join(' ') });
  } else if (w.aReason) out.push({ h: 'Bottle aging', m: sent(w.aReason) });
  return out;
}
var PROF = [['Sweetness', 'sweetness', 'sweetness'], ['Acidity', 'acidity', 'five'], ['Tannin', 'tannin', 'five'], ['Alcohol', 'alcohol', 'alcohol'], ['Body', 'body', 'body'], ['Flavor int.', 'flavInt', 'intensity'], ['Finish', 'finish', 'finish']];
function cardHTML(w) {
  var pr = prose(w), when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  var h = '<article class="card"><header class="tc-head">' + labHTML(w, 'big') + '<div><div class="k">' + esc([when, 'Wine ' + w.wineNo, w.event].filter(Boolean).join(' · ')) + '</div>' +
    '<h2' + (w.producer || w.aGrape ? '' : ' class="un"') + '>' + esc(w.producer || w.aGrape || 'Not yet revealed') + '</h2>' + (w.producer && idLine(w) ? '<div class="id"><div class="idw">' + idParts(w) + '</div></div>' : '') + '</div></header>';
  h += '<div class="tc-body"><div class="prose">' + (pr.length ? pr.map(function (p) {
    return '<p><b>' + p.h + '</b>' + (p.q ? '<strong class="q">' + esc(p.q) + '</strong>' : '') + esc(p.m) + '</p>';
  }).join('') : '<p class="hint">No tasting note yet.</p>') + '</div><div class="side">';
  h += '<div><h6>Structure</h6><div class="prof">' + PROF.map(function (p) {
    var list = S[p[2]] || [], i = list.indexOf(w[p[1]]);
    return '<div' + (i < 0 ? ' class="na"' : '') + '><span>' + p[0] + '</span><span class="line" style="--n:' + list.length + ';--p:' + (i < 0 ? 0 : i / (list.length - 1)).toFixed(3) + '">' + list.map(function (_, j) { return '<i style="--j:' + j + '"' + (j === i ? ' class="on"' : j < i ? ' class="fl"' : '') + '></i>'; }).join('') + '</span><em>' + esc(i < 0 ? '–' : SHORTR[w[p[1]]] || w[p[1]]) + '</em></div>';
  }).join('') + '</div></div>';
  var rows = [['Grape', 'gGrape', 'aGrape'], ['Country', 'gCountry', 'aCountry'], ['Region', 'gRegion', 'aRegion'], ['Vintage', 'gVintage', 'aVintage']];
  h += '<div><h6>' + (w.open ? 'The wine' : 'Guess and actual') + '</h6><div class="gx' + (w.open ? ' open' : '') + '"><span></span>' + (w.open ? '' : '<span class="h">My guess</span>') + '<span class="h">Actual</span>' +
    rows.map(function (r, i) { var hit = w.hits ? w.hits[i] : null, st = w.open || hit === null || !w[r[1]] ? '' : hit === 0.5 ? ' hf' : hit ? ' y' : ' n';
      return '<span class="l">' + r[0] + '</span>' + (w.open ? '' : '<span class="g' + st + '">' + esc(w[r[1]] || '–') + '</span>') + '<span class="a">' + esc(w[r[2]] || '–') + '</span>'; }).join('') +
    (String(w.producer || '').trim() ? '<span class="l">Approx. price</span>' + (w.open ? '' : '<span class="g"></span>') + '<span class="a" data-prc="' + esc(w.id) + '">' + priceCell(w) + '</span>' : '') + '</div></div>';
  // the blind-tasting result sits with the answers it comes from; the critics close the page
  h += '<div class="tc-guess">' + (w.open ? '<span>Tasted open</span><b class="op">Not scored</b>' : '<span>Blind Tasting Guess</span><b>' + (w.score === '' ? '–' : fmtScore(w.score) + '<small>/4</small>') + '</b>') + '</div>';
  h += reviewsHTML(w);
  h += '</div></div>';
  h += '<footer class="tc-foot">' + (w.ymd ? '<button type="button" class="btn" data-edit="' + w.ymd + '|' + w.wineNo + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>Edit</button>' : '') + '<button type="button" class="btn" data-pdf1="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2M5 4.8L8 2l3 2.8M4.5 7H3.5v7h9V7h-1"/></svg>Share PDF</button><button type="button" class="btn danger" data-del="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>Delete</button></footer></article>';
  return h;
}
function flightTitle(list) {
  var ev = list.map(function (w) { return w.event; }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
  var ds = list.map(function (w) { return w.dateLabel; }).filter(Boolean).filter(function (v, i, a) { return a.indexOf(v) === i; });
  return (ev.length === 1 ? ev[0] : 'Tasting notes') + (ds.length === 1 ? ' – ' + ds[0] : '');
}
function fileSafe(t) { return String(t || 'Tasting notes').replace(/[\\/:*?"<>|]+/g, '-').trim(); }

/* ---- share sheet: files are prepared first, then offered from a fresh tap (Safari's rule) */
var READY = null;
function readyToShare(blob, name, title, msg) { READY = { blob: blob, name: name, title: title }; $('readyMsg').textContent = msg; $('ready').classList.add('show'); }
$('readyClose').onclick = function () { $('ready').classList.remove('show'); READY = null; };
$('readyGo').onclick = function () { var r = READY; if (!r) return; $('ready').classList.remove('show'); shareFile(r.blob, r.name, r.title).catch(function (err) { toast(err.message || 'Could not open the share sheet'); }); };

/* ====================================================================== PDF: the tasting card, drawn as text and lines */
var LIBS = {};
function loadLib(src) {
  if (LIBS[src]) return LIBS[src];
  return LIBS[src] = new Promise(function (res, rej) {
    var s = document.createElement('script'); s.src = src;
    s.onload = res; s.onerror = function () { delete LIBS[src]; s.remove(); rej(new Error('Could not load the PDF maker. Open the app once while online.')); };
    document.head.appendChild(s);
  });
}
var PDFF = null;
function b64(buf) { var u = new Uint8Array(buf), out = ''; for (var i = 0; i < u.length; i += 0x8000) out += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(out); }
function pdfFonts() {
  if (PDFF) return PDFF;
  var list = [['archivo-400', 'Archivo', 'normal'], ['archivo-600', 'Archivo', 'bold'], ['playfair-700', 'Playfair', 'bold']];
  PDFF = Promise.all(list.map(function (f) { return fetch('fonts/pdf/' + f[0] + '.ttf').then(function (r) { if (!r.ok) throw new Error('font'); return r.arrayBuffer(); }).then(function (b) { return { file: f[0] + '.ttf', fam: f[1], st: f[2], data: b64(b) }; }); }));
  PDFF.catch(function () { PDFF = null; });
  return PDFF;
}
var PC = { sig: '#6D1A36', gold: '#9A7438', ink: '#1F1A1D', ink2: '#5A5055', muted: '#8A7F84', faint: '#CFC6BE', line: '#E7E0D6', ok: '#2F6B2A', no: '#9A2B38' };
function mix(hex, a) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var m = function (c) { return Math.round(c * a + 255 * (1 - a)); }; return 'rgb(' + m(r) + ',' + m(g) + ',' + m(b) + ')'; }
function pdfText(t) { return String(t == null ? '' : t).replace(/[→➜]/g, '>').replace(/[✓✔]/g, '').replace(/\s+/g, ' ').trim(); }
function pdfThumb(id) { return Photos.get(id).then(function (p) { return p && p.thumb ? blobToDataUrl(p.thumb) : null; }).catch(function () { return null; }); }
/* draws one wine; with draw=false it only measures. Returns the height. */
function pdfCard(D, w, x, y, W, draw, K, img) {
  function font(f, st, size, color) { D.setFont(f, st); D.setFontSize(size * K); if (color) D.setTextColor(color); }
  function txt(t, tx, ty, o) { if (draw) D.text(t, tx, ty, o || {}); }
  function fitText(t, width, size, color) {                             // long answers step down in size before they are shortened
    for (var z = size; z >= 5.4; z -= 0.4) { font('Archivo', 'bold', z, color); if (D.getTextWidth(t) <= width) return t; }
    while (t.length > 3 && D.getTextWidth(t + '…') > width) t = t.slice(0, -1); return t.replace(/[\s,]+$/, '') + '…';
  }
  var hx = x, when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  if (img) { var ip = D.getImageProperties(img), ih = 40 * K, iw = Math.min(ih * 1.2, ih * ip.width / ip.height); if (draw) { D.addImage(img, 'JPEG', x, y + 2, iw, ih, undefined, 'MEDIUM'); D.setDrawColor(PC.line); D.setLineWidth(.5); D.rect(x, y + 2, iw, ih); } hx = x + iw + 12 * K; }
  var right = x + W;
  font('Playfair', 'bold', 18, PC.gold); var sc = w.open ? '' : w.score === '' ? '–' : fmtScore(w.score) + '/4';
  if (w.open) { font('Archivo', 'bold', 7.5, PC.muted); txt('TASTED OPEN', right, y + 14 * K, { align: 'right' }); } else { txt(sc, right, y + 18 * K, { align: 'right' }); font('Archivo', 'bold', 5.6, PC.muted); txt('BLIND TASTING GUESS', right, y + 27 * K, { align: 'right', charSpace: .8 }); }
  font('Archivo', 'bold', 6.4, PC.gold); txt([when, 'Wine ' + w.wineNo, w.event].filter(Boolean).join('  ·  ').toUpperCase(), hx, y + 9 * K, { charSpace: .9 });
  font('Playfair', 'bold', 15, (w.producer || w.aGrape) ? PC.ink : PC.muted);
  var title = D.splitTextToSize(pdfText(w.producer || w.aGrape || 'Not yet revealed'), right - hx - 92 * K)[0]; txt(title, hx, y + 25 * K);
  if (w.producer && idLine(w)) { font('Archivo', 'bold', 8.4, PC.sig); txt(D.splitTextToSize(pdfText(idLine(w) + (w.price ? '  \u00b7  Approx. retail ' + priceText(w.price) : '')), right - hx - 92 * K)[0], hx, y + 37 * K); }
  var top = y + Math.max(48 * K, img ? 48 * K : 0);
  // left: the written note
  var LW = W * 0.6, ly = top + 10 * K;
  prose(w).forEach(function (p) {
    font('Archivo', 'bold', 6, PC.sig); txt(p.h.toUpperCase(), x, ly, { charSpace: 1 }); ly += 9.5 * K;
    if (p.q) { font('Archivo', 'bold', 9.4, PC.ink); D.splitTextToSize(pdfText(p.q), LW).forEach(function (line) { txt(line, x, ly + 1 * K); ly += 12.4 * K; }); ly += 1 * K; }
    if (p.m) { font('Archivo', 'normal', 8, PC.ink); D.splitTextToSize(pdfText(p.m), LW).forEach(function (line) { txt(line, x, ly); ly += 10.4 * K; }); }
    ly += 4.5 * K;
  });
  // right: fingerprint, structure, guess and actual
  var rx = x + LW + 22 * K, RW = W - LW - 22 * K, ry = top + 4 * K;
  var sx = rx, sy = ry + 6 * K;
  PROF.forEach(function (p) {
    var list = S[p[2]] || [], i = list.indexOf(w[p[1]]);
    font('Archivo', 'normal', 6.6, i < 0 ? PC.faint : PC.ink2); txt(p[0], sx, sy);
    font('Archivo', 'bold', 6.4, i < 0 ? PC.faint : PC.ink); txt(i < 0 ? '–' : (SHORTR[w[p[1]]] || w[p[1]]), right, sy, { align: 'right' });
    var lx0 = sx + 52 * K, lx1 = right - 50 * K, ly0 = sy - 2.2 * K;
    if (draw) { D.setDrawColor(PC.line); D.setLineWidth(.9 * K); D.line(lx0, ly0, lx1, ly0);
      var at = function (j) { return lx0 + (lx1 - lx0) * (list.length > 1 ? j / (list.length - 1) : 0); };
      if (i > 0) { D.setDrawColor(PC.sig); D.setLineWidth(1.3 * K); D.line(lx0, ly0, at(i), ly0); }
      list.forEach(function (_, j) { var px = at(j); if (j === i) { D.setFillColor(PC.sig); D.circle(px, ly0, 2.6 * K, 'F'); } else if (i >= 0 && j < i) { D.setFillColor(PC.sig); D.circle(px, ly0, 1.4 * K, 'F'); } else { D.setFillColor(PC.faint); D.circle(px, ly0, 1.1 * K, 'F'); } }); }
    sy += 9.6 * K;
  });
  var gy = sy + 8 * K, rows = [['Grape', 'gGrape', 'aGrape'], ['Country', 'gCountry', 'aCountry'], ['Region', 'gRegion', 'aRegion'], ['Vintage', 'gVintage', 'aVintage']];
  var c1 = rx, c2 = rx + 40 * K, c3 = w.open ? c2 : rx + 40 * K + (right - rx - 40 * K) / 2, cw = (right - c2) / (w.open ? 1 : 2) - 4 * K;
  font('Archivo', 'bold', 5.4, PC.muted); if (!w.open) txt('MY GUESS', c2, gy, { charSpace: .6 }); txt('ACTUAL', c3, gy, { charSpace: .6 }); gy += 9 * K;
  rows.forEach(function (r, i) {
    var hit = w.hits ? w.hits[i] : null, st = w.open || hit === null || !w[r[1]] ? '' : hit === 0.5 ? 'h' : hit ? 'y' : 'n';
    font('Archivo', 'normal', 6.6, PC.muted); txt(r[0], c1, gy);
    if (!w.open) { var gt = fitText(pdfText(w[r[1]] || '–'), cw - 8 * K, 7, st === 'n' ? PC.muted : PC.ink); txt(gt, c2, gy);
      if (st && draw) { var mx = c2 + D.getTextWidth(gt) + 5 * K, my = gy - 2.6 * K; D.setLineWidth(.9 * K); D.setDrawColor(st === 'y' ? PC.ok : PC.no);
        if (st === 'h') { D.setFont('Archivo', 'bold'); D.setFontSize(7 * K); D.setTextColor(PC.gold); D.text('½', mx - 2.2 * K, gy); }
        else if (st === 'y') { D.line(mx - 2 * K, my, mx - .5 * K, my + 1.8 * K); D.line(mx - .5 * K, my + 1.8 * K, mx + 2.4 * K, my - 2 * K); }
        else { D.line(mx - 1.8 * K, my - 1.8 * K, mx + 1.8 * K, my + 1.8 * K); D.line(mx + 1.8 * K, my - 1.8 * K, mx - 1.8 * K, my + 1.8 * K); } } }
    var at = pdfText(w[r[2]] || '–'); font('Archivo', 'bold', 6.6, PC.sig);
    if (D.getTextWidth(at) > cw && D.getTextWidth(at) * 6.2 / 6.6 > cw) { var al = D.splitTextToSize(at, cw).slice(0, 2); al.forEach(function (l, j) { txt(l, c3, gy + j * 8 * K); }); gy += 8 * K * (al.length - 1); }   // a blend gets two lines
    else txt(fitText(at, cw, 7, PC.sig), c3, gy);
    gy += 10 * K;
  });
  if (w.price) { font('Archivo', 'normal', 6.6, PC.muted); txt('Approx. price', c1, gy); font('Archivo', 'bold', 7, PC.sig); txt(pdfText(priceText(w.price)), c3, gy); gy += 10 * K; }   // as on the wine page
  // right, below guess and actual: professional reviews
  var rv = reviewsPdf(w);
  if (rv.length) {
    // keep the two columns in balance: when the critics would run well past the written note, set their quotes smaller and shorter
    function quoteLines(x, size) { font('Archivo', 'normal', size, PC.ink2); return x.text ? D.splitTextToSize(pdfText('“' + x.text.replace(/[.\s]+$/, '') + '.”'), RW).length : 0; }
    var est = 16.5 * K + rv.reduce(function (t, x) { return t + 18.6 * K + quoteLines(x, 6.6) * 8.4 * K; }, 0);
    var tight = gy + est > ly + 12 * K, qs = tight ? 6 : 6.6, qh = tight ? 7.6 * K : 8.4 * K, maxL = tight ? 2 : 9;
    gy += 7 * K; font('Archivo', 'bold', 5.4, PC.muted); txt('PROFESSIONAL REVIEWS', c1, gy, { charSpace: .6 }); gy += 9.5 * K;
    rv.forEach(function (x) {
      font('Archivo', 'bold', 7, PC.ink); txt(D.splitTextToSize(pdfText(x.critic), RW - 40 * K)[0], c1, gy);
      if (x.score) { font('Archivo', 'bold', 7.4, PC.gold); txt(pdfText(x.score), right, gy, { align: 'right' }); }
      gy += 8.6 * K;
      if (x.text) { font('Archivo', 'normal', qs, PC.ink2); var ql = D.splitTextToSize(pdfText('“' + x.text.replace(/[.\s]+$/, '') + '.”'), RW);
        if (ql.length > maxL) { ql = ql.slice(0, maxL); ql[maxL - 1] = ql[maxL - 1].replace(/[\s,;:.”]*\S*$/, '') + '…”'; }
        ql.forEach(function (line) { txt(line, c1, gy); gy += qh; }); }
      font('Archivo', 'normal', 5.8, x.other ? PC.no : PC.muted); txt(pdfText((x.other ? x.vintage + ' vintage  ·  ' : '') + (rvSite(x.url) ? '' : 'via ') + rvHost(x.url)), c1, gy); gy += 10 * K;
    });
  }
  return Math.max(ly, gy) - y + 4 * K;
}
function makePdf(list, title) {
  if (!list.length) return Promise.reject(new Error('No wines to share.'));
  var imgs = {};
  return Promise.all([loadLib('lib/jspdf.min.js'), pdfFonts()]).then(function (r) {
    var fonts = r[1];
    return Promise.all(list.filter(function (w) { return PHOTO_IDS[w.id]; }).map(function (w) { return pdfThumb(w.id).then(function (u) { if (u) imgs[w.id] = u; }); })).then(function () { return fonts; });
  }).then(function (fonts) {
    toast('Making PDF…');
    var D = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter', compress: true });
    fonts.forEach(function (f) { D.addFileToVFS(f.file, f.data); D.addFont(f.file, f.fam, f.st); });
    var PW = 612, PH = 792, M = 40, W = PW - 2 * M, TOP = 66, AV = PH - TOP - 30, GAP = 26;
    var stamp = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
    var meta = (title ? title + '  ·  ' : '') + list.length + ' wine' + (list.length === 1 ? '' : 's') + '  ·  printed ' + stamp;
    var items = list.map(function (w) { var K = 1, h = pdfCard(D, w, M, 0, W, false, K, imgs[w.id]); while (h > AV && K > 0.62) { K -= 0.06; h = pdfCard(D, w, M, 0, W, false, K, imgs[w.id]); } return { w: w, h: h, K: K }; });
    var pages = [], cur = null;
    items.forEach(function (it) { if (!cur || cur.items.length >= 3 || cur.h + it.h > AV) { cur = { items: [], h: 0 }; pages.push(cur); } cur.items.push(it); cur.h += it.h + GAP; });
    pages.forEach(function (pg, pi) {
      if (pi) D.addPage('letter', 'portrait');
      D.setFont('Playfair', 'bold'); D.setFontSize(18); D.setTextColor(PC.sig); D.text('Tasting Notes', M, 42);
      D.setFont('Archivo', 'normal'); D.setFontSize(7.4); D.setTextColor(PC.muted); D.text(pdfText(meta + '  ·  page ' + (pi + 1) + ' of ' + pages.length), PW - M, 42, { align: 'right' });
      D.setDrawColor(PC.gold); D.setLineWidth(.7); D.line(M, 50, PW - M, 50);
      var y = TOP; pg.items.forEach(function (it, ii) {
        if (ii) { D.setDrawColor(PC.line); D.setLineWidth(.5); D.line(M, y - GAP / 2, PW - M, y - GAP / 2); }
        pdfCard(D, it.w, M, y, W, true, it.K, imgs[it.w.id]); y += it.h + GAP; });
    });
    return D.output('blob');
  });
}
function sharePdf(list, title) {
  makePdf(list, title).then(function (blob) {
    readyToShare(blob, fileSafe(title || 'Tasting Notes') + '.pdf', title || 'Tasting Notes',
      'Your PDF of ' + list.length + ' wine' + (list.length === 1 ? '' : 's') + ' is ready. Tap Share to print it, save it to Files, or send it by Messages or Mail.');
  }).catch(function (err) { toast(err.message || 'Could not make the PDF'); });
}

/* ====================================================================== sync status on the settings button */
Sync.on(function (s, detail) { $('gear').setAttribute('data-s', s); $('gear').title = { off: 'Settings', idle: 'Google Sheet connected', synced: 'Synced with Google', syncing: 'Syncing…', signin: 'Google sign-in needed', offline: 'Offline', error: 'Sync problem' }[s] || 'Settings';
  if (s === 'error' && detail && detail.message) console.warn(detail.message); if ($('settings').classList.contains('show')) paintGoogle(); });
var lastSeen = Date.now();
document.addEventListener('visibilitychange', function () { if (document.visibilityState !== 'visible') { lastSeen = Date.now(); return; } if (Date.now() - lastSeen > 5 * 60 * 1000 && Sync.connected()) Sync.soon(); lastSeen = Date.now(); });

/* ====================================================================== start */
function start(init) {
  S = init.scales; S.today = init.today;
  var saved = recall(NB_KEY); if (saved) { if (saved.dv !== 2) delete saved.desc; for (var k in saved) if (k in NB) NB[k] = saved[k]; }   // v2.6: newest first is the default
  if (!FILTERS.some(function (f) { return f[0] === NB.field; })) NB.field = '(no filter)';
  if (!SORTS.some(function (s) { return s[0] === NB.sort; })) NB.sort = 'Date & Wine #';
  setData(init.all);
  var draft = recall(DRAFT_KEY) || recall('btn-entry-draft'), d = today();     // also picks up an unsaved draft from 1.x
  if (draft && draft.rec) { draft.rec.aromas = cleanDescs(draft.rec.aromas); draft.rec.flavors = cleanDescs(draft.rec.flavors); }
  if (draft) { show(draft.rec, draft.orig, true); toast('Your unsaved note for ' + label() + ' is waiting in Tasting'); } else show({ date: d, wineNo: nextNo(d) }, null, false);
  findOrphans().then(function (o) { if (o.length && !loadRows.repaired) setTimeout(function () { toast(o.length + ' label photo' + (o.length === 1 ? ' isn\u2019t' : 's aren\u2019t') + ' attached to a wine. Open the wine, then tap Use a photo on this device.'); }, 1800); });
  if (loadRows.repaired) { toast('Removed a stray web link from ' + (loadRows.repaired === 1 ? 'one wine’s' : loadRows.repaired + ' wines’') + ' aromas or flavors'); loadRows.repaired = 0; }
  var back = ''; try { back = sessionStorage.getItem('btn-view') || ''; sessionStorage.removeItem('btn-view'); } catch (e) {}
  var want = new URLSearchParams(location.search).get('view') || back || 'notebook';   // always the Notebook; an unsaved note waits in Tasting (back = the view kept across an update reload)
  setView(want === 'taste' ? 'taste' : 'notebook');
  spy();
}

/* ---- sheets: tap outside or drag down to close (as on iPhone) */
function closeSheetEl(el) { if (el.id === 'lx') closeLx(); else sheet(el.id, false); }
document.addEventListener('click', function (e) { if (e.target.classList && e.target.classList.contains('sheet') && e.target.classList.contains('show')) closeSheetEl(e.target); });
(function () {
  var drag = null;
  document.addEventListener('touchstart', function (e) {
    if (e.target.closest('button, a, input')) return;
    var h = e.target.closest('.grab, .ph, .lx-hd'); if (!h) return;
    var panel = h.closest('.panel, .lxp'); if (!panel) return;
    drag = { panel: panel, y0: e.touches[0].clientY, dy: 0, moved: false };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) { if (!drag) return; drag.dy = Math.max(0, e.touches[0].clientY - drag.y0);
    if (drag.dy > 6) { if (!drag.moved) { drag.moved = true; drag.panel.classList.add('dragging'); } drag.panel.style.transform = 'translateY(' + drag.dy + 'px)'; } }, { passive: true });
  document.addEventListener('touchend', function () {
    if (!drag) return; var d = drag; drag = null; if (!d.moved) return; d.panel.classList.remove('dragging'); d.panel.style.transition = 'transform .2s'; d.panel.style.transform = '';
    setTimeout(function () { d.panel.style.transition = ''; }, 220);
    if (d.dy > 110) closeSheetEl(d.panel.parentNode);
  });
})();

/* ---- delete a wine (from this device and, on the next sync, from the Google Sheet) */
document.addEventListener('click', function (e) {
  var d = e.target.closest('[data-del]'); if (!d) return;
  var id = d.getAttribute('data-del'), w = ALL.filter(function (x) { return x.id === id; })[0]; if (!w) return;
  var name = (w.producer || w.aGrape || 'this wine') + ' (' + (w.dateLabel || '') + ', Wine ' + w.wineNo + ')';
  ask('Delete ' + name + '? ' + (Sync.connected() ? 'It will also be removed from your Google Sheet. ' : '') + 'This can’t be undone.', 'Delete', 'Cancel', true).then(function (go) {
    if (!go) { closeSwipe(); return; }
    api('appDelete', id).then(function (r) {
      if (rec.id === id) { clearDraft(); var dd = today(); show({ date: dd, wineNo: 1 }, null, false); }
      sheet('cardSheet', false); closeSwipe();
      setData(r.all); if (rec.id !== id && !orig) { rec.wineNo = rec.wineNo || nextNo(rec.date); paintId(); }
      toast('Deleted');
    }).catch(fail);
  });
});
/* ---- swipe a Notebook row left for Edit, PDF and Delete (as in Mail) */
var SWIPE = { open: null, justMoved: false };
function closeSwipe() { if (SWIPE.open) { SWIPE.open.style.transform = ''; SWIPE.open.parentNode.classList.remove('open'); SWIPE.open = null; } }
(function () {
  var d = null, W = 222;
  $('list').addEventListener('touchstart', function (e) {
    var r = e.target.closest('.rw2 .row'); if (!r || selecting || !r.parentNode.querySelector('.ract')) return;
    if (SWIPE.open && SWIPE.open !== r) closeSwipe();
    d = { r: r, x0: e.touches[0].clientX, y0: e.touches[0].clientY, base: SWIPE.open === r ? -W : 0, dx: 0, lock: '' };
  }, { passive: true });
  $('list').addEventListener('touchmove', function (e) {
    if (!d) return; var dx = e.touches[0].clientX - d.x0, dy = e.touches[0].clientY - d.y0;
    if (!d.lock) { if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return; d.lock = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; }
    if (d.lock !== 'x') return;
    d.dx = dx; var x = Math.max(-W - 30, Math.min(0, d.base + dx));
    d.r.style.transition = 'none'; d.r.style.transform = 'translateX(' + x + 'px)'; d.r.parentNode.classList.add('open');
  }, { passive: true });
  $('list').addEventListener('touchend', function () {
    if (!d) return; var x = d, end = d.base + d.dx; d = null; if (x.lock !== 'x') return;
    SWIPE.justMoved = true; setTimeout(function () { SWIPE.justMoved = false; }, 350);
    x.r.style.transition = '';
    if (end < -W / 2) { x.r.style.transform = 'translateX(' + -W + 'px)'; SWIPE.open = x.r; x.r.parentNode.classList.add('open'); }
    else { x.r.style.transform = ''; x.r.parentNode.classList.remove('open'); if (SWIPE.open === x.r) SWIPE.open = null; }
  });
  document.addEventListener('touchstart', function (e) { if (SWIPE.open && !e.target.closest('.rw2.open')) closeSwipe(); }, { passive: true });
})();

/* ====================================================================== staying current (v2.9)
   A web app can't close itself on iPhone or iPad, but it can reload itself. The note in progress is
   kept on the device (the draft) and comes back exactly as it was, so a reload never loses work.
   - the app looks for an update once a day; one that arrives loads as soon as the person pauses (20 seconds idle) */
var LASTINPUT = Date.now();
['pointerdown', 'keydown', 'input', 'touchstart', 'scroll'].forEach(function (ev) { document.addEventListener(ev, function () { LASTINPUT = Date.now(); }, true); });
function busy() { return document.visibilityState !== 'visible' || Date.now() - LASTINPUT < 20000 || $('modal').classList.contains('show') || $('ready').classList.contains('show') || !!document.querySelector('.sheet.show, .lx.show, .welcome.show'); }
function safeReload(why) {
  clearInterval(safeReload.t);
  var go = function () { if (dirty) store(DRAFT_KEY, { rec: rec, orig: orig, t: Date.now() }); try { sessionStorage.setItem('btn-updated', why || 'update'); sessionStorage.setItem('btn-view', document.body.getAttribute('data-view') || 'taste'); } catch (e) {} location.reload(); };
  if (!busy()) return go();
  safeReload.t = setInterval(function () { if (!busy()) { clearInterval(safeReload.t); go(); } }, 4000);
}
/* once a day: ask for an update when the app is opened or brought back and the last check was over 24 hours ago */
function dailyCheck(reg) {
  var last = 0; try { last = +localStorage.getItem('btn-upd-check') || 0; } catch (e) {}
  if (Date.now() - last < 24 * 3600 * 1000) return;
  try { localStorage.setItem('btn-upd-check', String(Date.now())); } catch (e) {}
  reg.update().catch(function () {});
}
(function () { var w = ''; try { w = sessionStorage.getItem('btn-updated') || ''; sessionStorage.removeItem('btn-updated'); } catch (e) {}
  if (w) setTimeout(function () { toast('Updated to Tasting Notes ' + VERSION_LABEL + (dirty ? '. Your note is right where you left it' : '')); }, 1500); })();
/*build*/(window.__V = window.__V || {})['app2'] = 'v2.14';

document.addEventListener('click', function (e) { if (e.target.closest('[data-go="taste"]')) { setView('taste'); window.scrollTo(0, 0); } });
/*build*/(window.__V = window.__V || {})['app2'] = 'v2.19';

/* ---- sync on open: Google's sign-in lasts about an hour and can only be renewed from a tap, so when it has
   lapsed the app asks once, in plain view, instead of leaving it to Settings */
var AUTOTAP = { tried: false };
Sync.on(function (st) { $('syncNote').hidden = st !== 'signin'; if (st !== 'signin') AUTOTAP.tried = false; });
/* Renew on the first tap: when Google's hour has run out, the first button, tab, row or rating tapped also renews
   it (Safari only lets Google's window open from a tap). Typing, the photo picker and the Sync now button itself are
   left alone; one try per lapse, and the Sync now bar stays as the fallback. */
document.addEventListener('click', function (e) {
  if (AUTOTAP.tried || !Sync.connected() || Sync.state() !== 'signin' || !navigator.onLine) return;
  var t = e.target;
  if (!t.closest || t.closest('input, textarea, select, label, #syncNow, #phInput, .lightbox, .modal')) return;
  if (!t.closest('button, a, [role="button"], [role="tab"], .row')) return;
  AUTOTAP.tried = true;
  Sync.sync(true).then(function (ok) { if (ok && window.afterSync) afterSync(); }).catch(function () { $('syncNote').hidden = false; });   // the bar stays as the fallback
}, true);
$('syncNow').onclick = function () {
  var b = this; b.disabled = true; b.textContent = 'Syncing…';
  Sync.sync(true).then(function () { if (window.afterSync) afterSync(); toast('Synced with your Google Sheet'); })
    .catch(function (err) { $('syncNote').hidden = false; toast(err && err.message === 'signin' ? 'Google sign-in was cancelled' : (err && err.message) || 'Could not sync'); })
    .then(function () { b.disabled = false; b.textContent = 'Sync now'; });
};
/*build*/(window.__V = window.__V || {})['app2'] = 'v2.29';

/* ====================================================================== professional reviews
   Once a wine is revealed, the app runs the same keyless Tavily search used for prices ("<wine> <vintage> review")
   and reads critics' scores from the results: from the critics' own sites (with a short excerpt of the page's text,
   attributed and linked) and from retailer pages that quote a critic's score. Only pages naming this wine count.
   Kept with the wine as text (readable in the Sheet): "Searched <date> for: <query>", then
   "Critic | score | vintage | excerpt | link" per review. Two search links stay underneath. */
var RV_BUSY = {}, RV_TRIED = {};
var RV_SITES = { 'decanter.com': 'Decanter', 'jamessuckling.com': 'James Suckling', 'winespectator.com': 'Wine Spectator', 'wineenthusiast.com': 'Wine Enthusiast',
  'winemag.com': 'Wine Enthusiast', 'vinous.com': 'Vinous', 'jancisrobinson.com': 'Jancis Robinson', 'robertparker.com': 'Wine Advocate', 'jebdunnuck.com': 'Jeb Dunnuck',
  'timatkin.com': 'Tim Atkin', 'falstaff.com': 'Falstaff', 'falstaff.de': 'Falstaff', 'falstaff.at': 'Falstaff', 'gamberorosso.it': 'Gambero Rosso', 'winecompanion.com.au': 'Halliday',
  'thewinefront.com.au': 'The Wine Front', 'wineandspiritsmagazine.com': 'Wine & Spirits', 'thewineindependent.com': 'The Wine Independent', 'owenbargreen.com': 'Owen Bargreen',
  'winealign.com': 'WineAlign', 'therealreview.com': 'The Real Review', 'insideburgundy.com': 'Jasper Morris', 'burghound.com': 'Burghound', 'wineanorak.com': 'Jamie Goode',
  'matthewjukes.com': 'Matthew Jukes', 'gismondionwine.com': 'Gismondi on Wine', 'kerinokeefe.com': "Kerin O'Keefe", 'doctorwine.it': 'Doctor Wine', 'vinum.eu': 'Vinum',
  'guiapenin.wine': 'Guía Peñín', 'larvf.com': 'La Revue du Vin de France', 'bettanedesseauve.com': 'Bettane+Desseauve', 'gilbertgaillard.com': 'Gilbert & Gaillard',
  'winepages.com': 'Wine Pages', 'raymondchanwinereviews.co.nz': 'Raymond Chan', 'bobcampbell.nz': 'Bob Campbell', 'tysonstelzer.com': 'Tyson Stelzer', 'wine-pages.com': 'Wine Pages',
  'winereviewonline.com': 'Wine Review Online', 'tastingbook.com': 'Tastingbook', 'decanterchina.com': 'Decanter', 'decanterworldwinesawards.com': 'Decanter WWA' };
var RV_DOMAINS = Object.keys(RV_SITES).filter(function (d) { return !/decanterchina|tastingbook/.test(d); });
// shops, auction and score-aggregator pages that quote critics' scores next to the wine
var RV_SHOPS = ['wine.com', 'klwines.com', 'totalwine.com', 'winelibrary.com', 'wallywine.com', 'astorwines.com', 'flatiron-wines.com', 'saratogawine.com', 'woodlandhillswine.com',
  'zachys.com', 'bbr.com', 'thewinesociety.com', 'majestic.co.uk', 'wineaccess.com', 'vivino.com', 'wine-searcher.com', 'danmurphys.com.au', 'lcbo.com', 'saq.com', 'garagistewine.com',
  'kermitlynch.com', 'winc.com', 'grapesthewineco.com', 'bevmo.com', 'gotham-wines.com', 'sokolin.com', 'wineexchange.com', 'thewinecellarinsider.com', 'cellartracker.com'];
var RV_NAMES = ['James Suckling', 'Wine Spectator', 'Wine Advocate', 'Robert Parker', 'Vinous', 'Antonio Galloni', 'Neal Martin', 'Josh Raynolds', 'Stephen Tanzer', 'Eric Guido',
  'Decanter', 'Wine Enthusiast', 'Jeb Dunnuck', 'Jancis Robinson', 'Tim Atkin', 'Falstaff', 'Wine & Spirits', 'Burghound', 'Allen Meadows', 'Halliday', 'James Halliday', 'Wine Front',
  'Vinum', 'Gambero Rosso', 'Lisa Perrotti-Brown', 'Wine Independent', 'William Kelley', 'Owen Bargreen', 'Jasper Morris', 'WineAlign', 'Real Review', 'Bob Campbell',
  'Wine Review Online', 'Gismondi', 'Kerin O’Keefe', "Kerin O'Keefe", 'Monica Larner', 'Guia Penin', 'Guía Peñín', 'Bettane', 'Gilbert & Gaillard', 'Jamie Goode',
  'Tyson Stelzer', 'Raymond Chan', 'Andreas Larsson', 'Matthew Jukes', 'Wine & Spirits Magazine'];
var RV_ALIAS = { 'Robert Parker': 'Wine Advocate', 'William Kelley': 'Wine Advocate', 'Monica Larner': 'Wine Advocate', 'Antonio Galloni': 'Vinous', 'Neal Martin': 'Vinous',
  'Josh Raynolds': 'Vinous', 'Stephen Tanzer': 'Vinous', 'Eric Guido': 'Vinous', 'Wine Front': 'The Wine Front', 'Allen Meadows': 'Burghound', 'James Halliday': 'Halliday',
  'Lisa Perrotti-Brown': 'The Wine Independent', 'Wine Independent': 'The Wine Independent', 'Real Review': 'The Real Review', 'Gismondi': 'Gismondi on Wine',
  'Kerin O’Keefe': "Kerin O'Keefe", 'Guia Penin': 'Guía Peñín', 'Bettane': 'Bettane+Desseauve', 'Wine & Spirits Magazine': 'Wine & Spirits' };
// the shorthand shops print: "WS 93", "93 JS", "RP95", "W&S 92"
var RV_ABBR = { JS: 'James Suckling', WS: 'Wine Spectator', WA: 'Wine Advocate', RP: 'Wine Advocate', WE: 'Wine Enthusiast', JD: 'Jeb Dunnuck', VM: 'Vinous', AG: 'Vinous',
  'W&S': 'Wine & Spirits', BH: 'Burghound', DEC: 'Decanter', TA: 'Tim Atkin', JH: 'Halliday', LPB: 'The Wine Independent', OB: 'Owen Bargreen' };
// Steve's order of preference; everyone else after, quoted reviews first, then by score
var RV_ORDER = ['James Suckling', 'Jeb Dunnuck', 'Jancis Robinson', 'Wine Spectator', 'Decanter', 'Vinous', 'Wine Enthusiast'];
function rvTop(list, n) {
  function rank(x) { var i = RV_ORDER.indexOf(x.critic); return i < 0 ? 99 : i; }
  return list.slice().sort(function (a, b) { return rank(a) - rank(b) || (b.text ? 1 : 0) - (a.text ? 1 : 0) || (parseFloat(b.score) || 0) - (parseFloat(a.score) || 0); }).slice(0, n || 3);
}
function rvQuery(w) { return [String(w.producer || '').trim(), String(w.aVintage || '').trim()].filter(Boolean).join(' '); }
function rvParse(text) {
  var out = { query: '', items: [] };
  String(text || '').split(/\n+/).forEach(function (l) {
    var m = l.match(/^Searched (.+?) for: (.*)$/); if (m) { out.when = m[1]; out.query = m[2].trim(); return; }
    var f = l.split(' | '); if (f.length >= 5) out.items.push({ critic: f[0], score: f[1], vintage: f[2], text: f.slice(3, -1).join(' | '), url: f[f.length - 1] });
  });
  return out;
}
function rvFormat(q, items) {
  var d = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return ['Searched ' + d + ' (v3) for: ' + q].concat(items.map(function (r) { return [r.critic, r.score, r.vintage, r.text, r.url].map(function (x) { return String(x || '').replace(/\s*\|\s*/g, ' / ').replace(/\n/g, ' '); }).join(' | '); })).join('\n');
}
function rvHost(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0]; }
function rvSite(u) { var h = rvHost(u); for (var d in RV_SITES) if (h === d || h.slice(-d.length - 1) === '.' + d) return RV_SITES[d]; return ''; }
function rvExcerpt(text, w) {                                            // one or two sentences of the critic's page, about 30 words
  var t = String(text || '').replace(/\[\.\.\.\]|#+|\*+|\|/g, ' ').replace(/\s+/g, ' ').trim();
  var low = t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), key = prKey(w), at = key ? low.indexOf(key) : -1;
  if (at > 0) { var dot = t.lastIndexOf('. ', at); t = t.slice(dot >= 0 ? dot + 2 : at); }
  var sents = t.match(/[^.!?]+[.!?]+/g) || [t], ex = '';
  for (var i = 0; i < sents.length && ex.split(' ').length < 22; i++) {
    var sn = sents[i].trim();
    if (/cookie|subscribe|sign in|log in|newsletter|javascript|all rights reserved|privacy/i.test(sn) || sn.length < 20) continue;
    if (!ex && sn.split(/\s+/).length <= 10 && /\b(19|20)\d\d\b/.test(sn) && !/\b(is|are|has|shows|offers|with|of)\b/i.test(sn)) continue;   // the wine's own heading
    ex += (ex ? ' ' : '') + sn;
  }
  var words = ex.split(' '); if (words.length > 32) ex = words.slice(0, 30).join(' ').replace(/[,;:]$/, '') + '\u2026';
  return ex;
}
// is this text a tasting note, or a list, an index or a table row that merely names the wine?
function rvProse(t) {
  t = String(t || '').trim(); var words = t.split(/\s+/); if (words.length < 8) return false;
  var nums = words.filter(function (x) { return /^[$£€]?\d/.test(x); }).length; if (nums / words.length > 0.12) return false;
  var caps = words.filter(function (x) { return /^[A-ZÀ-Þ]/.test(x); }).length; if ((t.match(/,/g) || []).length >= 3 && caps / words.length > 0.55) return false;
  return /\b(aromas?|nose|palate|flavou?rs?|notes?|finish(es)?|acid(ity)?|tannins?|fruit|texture|bodied|body|crisp|fresh|ripe|oak|mineral|juicy|savou?ry|elegant|structure|balanced?|drink|bright|lively|round|silky|creamy|zesty|citrus|cherry|berry|spice)\b/i.test(t);
}
// pages that list many wines (ratings tables, A–Z winery indexes, "best of" roundups, search and tag pages)
var RV_LISTPAGE = /\/(wineries|producers|search|tags?|categor(y|ies)|lists?|a-z|index|page\/\d)(\/|$|\?)|wine-ratings\/[a-z-]+\/?$|[?&](page|s|q)=/i;
var RV_LISTTITLE = /\b(wineries|producers|a\s?[-–]\s?z|index|ratings:|best\b|top \d+|under \$|\d+ wines|buying guide|search results|archives?)\b/i;
function rvGood(x) { return !!(x && (x.score || rvProse(x.text))); }
function rvScore(text) {
  var m = String(text).match(/\b(\d{2})(?:\+)?\s?(?:pts|points|\/100|-point)\b/i) || String(text).match(/\bscore[d:]?\s*(\d{2})\b/i);
  if (m && +m[1] >= 80 && +m[1] <= 100) return m[1] + '/100';
  var t = String(text).match(/\b(1\d(?:\.5)?|20)\s?\/\s?20\b/); if (t) return t[1] + '/20';
  return '';
}
function rvPick(w, results) {
  var toks = prToks(w), need = toks.length >= 4 ? toks.length - 1 : toks.length, vin = String(w.aVintage || '').trim(), got = {};
  (results || []).forEach(function (r) {
    if (!r || PR_SKIP.test(r.url || '')) return;
    var text = String(r.content || ''), hay = prNorm((r.title || '') + ' ' + text + ' ' + String(r.url || '').replace(/[\/+_-]/g, ' '));
    if (!toks.length || toks.filter(function (t) { return hay.indexOf(t) >= 0; }).length < need) return;    // a page about a different wine
    var vm = hay.match(/\b(19[5-9]\d|20[0-4]\d)\b/), rv = vin && hay.indexOf(vin) >= 0 ? vin : (vm ? vm[1] : '');
    var site = rvSite(r.url);
    if (site) {                                                         // the critic's own page
      // it must be a page about this wine: its name in the title or address, and not a list of many wines
      var head = prNorm((r.title || '') + ' ' + String(r.url || '').replace(/[\/+_-]/g, ' ')), key = prKey(w);
      if (RV_LISTPAGE.test(r.url || '') || RV_LISTTITLE.test(r.title || '') || (key && head.indexOf(key) < 0)) return;
      var sc = rvScore((r.title || '') + ' ' + text), ex = rvExcerpt(text, w);
      if (!rvProse(ex)) ex = '';
      if (!sc && !ex) return;
      var item = { critic: site, score: sc, vintage: rv, text: ex, url: r.url };
      if (!got[site] || (vin && rv === vin && got[site].vintage !== vin)) got[site] = item;
      return;
    }
    if (RV_LISTPAGE.test(r.url || '') || RV_LISTTITLE.test(r.title || '')) return;
    // a retailer quoting critics: "94 James Suckling", "James Suckling 94 pts", "90 Antonio Galloni - Vinous"
    RV_NAMES.forEach(function (n) {
      var e = n.replace(/&/g, '&'), re1 = new RegExp('\\b(\\d{2})\\s*(?:pts|points|\\+)?\\s*[-\u2013:]?\\s*' + e, 'i'), re2 = new RegExp(e + '\\s*[-\u2013:]?\\s*(\\d{2})\\s*(?:pts|points|\\/100)?\\b', 'i');
      var m = text.match(re1) || text.match(re2); if (!m || +m[1] < 80 || +m[1] > 100) return;
      var c = RV_ALIAS[n] || n; if (got[c]) return;
      got[c] = { critic: c, score: m[1] + '/100', vintage: rv, text: '', url: r.url };
    });
    var re = /(?:^|[^A-Za-z&])(JS|WS|WA|RP|WE|JD|VM|AG|W&S|BH|DEC|TA|JH|LPB|OB)\s?[-:]?\s?(\d{2})(?:\+|-\d{2})?(?![\d%$.,])|\b(\d{2})\s?(?:pts?\s)?(JS|WS|WA|RP|WE|JD|VM|AG|W&S|BH|DEC|TA|JH|LPB|OB)(?![A-Za-z])/g, mm;
    while ((mm = re.exec(text))) {
      var ab = mm[1] || mm[4], num = +(mm[2] || mm[3]), cc = RV_ABBR[ab];
      if (!cc || num < 80 || num > 100 || got[cc]) continue;
      got[cc] = { critic: cc, score: num + '/100', vintage: rv, text: '', url: r.url };
    }
  });
  var list = Object.keys(got).map(function (k) { return got[k]; });
  if (vin && list.some(function (x) { return x.vintage === vin; })) list = list.filter(function (x) { return x.vintage === vin || !x.vintage; });
  return rvTop(list, 5);
}
function findReviews(w, force) {
  if (!w || !w.id || !String(w.producer || '').trim() || RV_BUSY[w.id] || !navigator.onLine) return;
  var q = rvQuery(w), r = rvParse(w.reviews);
  // already searched for this wine (an empty result from the older, narrower search is tried again once)
  if (!force && r.query && r.query.toLowerCase() === q.toLowerCase() && /v3/.test(r.when || '')) return;     // searched with today's rules (older results are re-checked once)
  if (!force && RV_TRIED[w.id + q]) return; RV_TRIED[w.id + q] = 1;
  RV_BUSY[w.id] = 1; repaintReviews(w.id);
  var name = String(w.producer || '').trim().replace(/[‘’'`]/g, ''), vin = String(w.aVintage || '').trim(), qq = q.replace(/[‘’'`]/g, '');
  // the free search allows a limited number a day, so each search is made to count:
  // 1) critics' own sites and shops that print critics' scores, together; 2) the open web, only if that found little;
  // 3) other vintages, only if this vintage found nothing (shown flagged)
  var all = [], seen = {}, fails = 0, cap = false;
  function add(j) { (j && j.results || []).forEach(function (x) { if (x && x.url && !seen[x.url]) { seen[x.url] = 1; all.push(x); } }); }
  function one(query, o) { if (cap) return Promise.resolve(); return tavily(query, o).then(add, function (e) { fails++; if (e && e.cap) cap = true; }); }
  var chain = one(qq + ' review points', { include_domains: RV_DOMAINS.concat(RV_SHOPS), max_results: 20 })
    .then(function () { if (rvPick(w, all).length < 3) return one(qq + ' wine review score points', { max_results: 15 }); })
    .then(function () { if (vin && !rvPick(w, all).length) return one(name + ' review points', { include_domains: RV_DOMAINS.concat(RV_SHOPS), max_results: 20 }); });
  chain.then(function () {
    if ((cap || fails) && !rvPick(w, all).length) { var e = new Error('search busy'); e.cap = cap; throw e; }
    return api('appSetReviews', w.id, rvFormat(q, rvPick(w, all))).then(function (x) { if (x) setData(x.all); });
  })
    .catch(function () { delete RV_TRIED[w.id + q]; if (force) toast('Couldn’t search for reviews right now'); })
    .then(function () { delete RV_BUSY[w.id]; repaintReviews(w.id); });
}
function arrive(el) { if (!el) return; el.classList.remove('arrive'); void el.offsetWidth; el.classList.add('arrive'); }   // new information fades in with a soft glow
function repaintReviews(id) {
  if (!$('cardSheet').classList.contains('show')) return;
  var w = ALL.filter(function (x) { return x.id === id; })[0], box = $('cardBody').querySelector('.revs');
  if (!w || !box || !$('cardBody').querySelector('[data-del="' + id + '"]')) return;
  var had = !!box.querySelector('.rvi'); box.outerHTML = reviewsHTML(w);
  if (!had) arrive($('cardBody').querySelector('.rv-found'));
}
function reviewsHTML(w) {
  var h = '<div class="revs"><h6>Professional reviews</h6>';
  if (!String(w.producer || '').trim()) return h + '<div class="rv-lock">Reviews appear once you fill in the producer and wine name, so they can\u2019t spoil a blind tasting.</div></div>';
  var q = rvQuery(w), s = q.replace(/[\u2018\u2019'`]/g, ''), r = rvParse(w.reviews), fresh = r.query && r.query.toLowerCase() === q.toLowerCase();
  var more = '<p class="rv-more">More reviews: <a href="https://www.wine-searcher.com/find/' + esc(encodeURIComponent(s).replace(/%20/g, '+')) + '" target="_blank" rel="noopener">Wine-Searcher</a> \u00b7 ' +
    '<a href="https://www.google.com/search?q=' + esc(encodeURIComponent(s + ' wine review')) + '" target="_blank" rel="noopener">Google</a>' +
    (RV_BUSY[w.id] || tvPaused() ? '' : ' \u00b7 <button type="button" class="lnk" data-rvagain="' + esc(w.id) + '">Search again</button>') + '</p>';
  if (fresh && r.items.filter(rvGood).length) {
    h += '<div class="rv-found">' + rvTop(r.items.filter(rvGood), 3).map(function (x) {
      var other = x.vintage && w.aVintage && x.vintage !== String(w.aVintage).trim();
      var foot = (other ? '<span class="rv-warn">' + esc(x.vintage) + ' vintage</span> \u00b7 ' : x.vintage ? esc(x.vintage) + ' \u00b7 ' : '') + (rvSite(x.url) ? '' : 'via ') + esc(rvHost(x.url)) + ' \u203a';
      if (!x.text) return '<a class="rvi slim" href="' + esc(x.url) + '" target="_blank" rel="noopener"><b>' + esc(x.critic) + '</b><small>' + foot + '</small>' + (x.score ? '<em>' + esc(x.score) + '</em>' : '') + '</a>';
      return '<a class="rvi" href="' + esc(x.url) + '" target="_blank" rel="noopener"><div class="rvi-h"><b>' + esc(x.critic) + '</b>' + (x.score ? '<em>' + esc(x.score) + '</em>' : '') + '</div>' +
        '<p>\u201c' + esc(x.text) + '\u201d</p><small>' + foot + '</small></a>';
    }).join('') + '</div>';
  } else if (RV_BUSY[w.id]) h += '<p class="rv-state"><i class="rv-spin"></i>Looking for professional reviews\u2026</p>';
  else if (tvPaused()) h += '<p class="rv-state">The free web search has reached today\u2019s limit for this network. Reviews will be looked up again after ' + tvResume() + '.</p>';
  else if (fresh) h += '<p class="rv-state">The critics haven\u2019t weighed in on this one yet.</p>';
  return h + more + '</div>';
}
function reviewsPdf(w) {                                                // the PDF's review list, beside the structure and guess
  var r = rvParse(w.reviews); if (!r.items.length || !String(w.producer || '').trim() || r.query.toLowerCase() !== rvQuery(w).toLowerCase()) return [];
  var v = String(w.aVintage || '').trim();
  return rvTop(r.items.filter(rvGood), 3).map(function (x) { return { critic: x.critic, score: x.score, text: x.text, url: x.url, vintage: x.vintage, other: !!(x.vintage && v && x.vintage !== v) }; });
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-rvagain]'); if (!b) return;
  var w = ALL.filter(function (x) { return x.id === b.getAttribute('data-rvagain'); })[0]; if (w) findReviews(w, true);
});

/* ====================================================================== approximate retail price
   Once a wine is revealed, the app asks Tavily's keyless web search (no account, no key) for "<wine> <vintage> price"
   and reads prices from the results itself: a Wine-Searcher average when one is shown, otherwise the middle of the
   prices on retailer pages that name this wine (and its vintage when known), standard 750 ml bottles only.
   The price and its source page are saved with the wine; a price the taster types is never replaced.
   priceSrc: "auto:<url>" found online · "none:<query>" searched, nothing found · "" typed by the taster */
var TV_Q = Promise.resolve();                                           // one keyless search at a time; a busy answer gets one retry
function tvKey() { try { return (localStorage.getItem('btn-tavily-key') || '').trim(); } catch (x) { return ''; } }
function tvPaint(msg) {
  var k = tvKey(), inp = $('tvKey'), st = $('tvState'); if (!inp) return;
  if (document.activeElement !== inp) inp.value = k ? k.slice(0, 9) + '\u2022\u2022\u2022\u2022\u2022\u2022' + k.slice(-4) : '';
  $('tvClear').hidden = !k;
  st.textContent = msg || (k ? 'Using your Tavily key on this device. No daily limit.' : 'No key on this device: using the shared free daily allowance.');
}
document.addEventListener('click', function (e) {
  if (e.target.closest('#gear')) setTimeout(function () { tvPaint(); }, 50);
  if (e.target.id === 'tvClear') { try { localStorage.removeItem('btn-tavily-key'); } catch (x) {} tvPaint(); return; }
  if (e.target.id !== 'tvSave') return;
  var k = ($('tvKey').value || '').trim();
  if (/\u2022/.test(k)) k = tvKey();
  if (!/^tvly-[A-Za-z0-9_-]{10,}$/.test(k)) { tvPaint('That doesn\u2019t look like a Tavily key. It starts with tvly- and is copied from your Tavily dashboard.'); return; }
  tvPaint('Testing your key\u2026');
  fetch('https://api.tavily.com/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + k }, body: JSON.stringify({ query: 'Ridge Monte Bello review', max_results: 1 }) })
    .then(function (r) {
      if (r.status === 401 || r.status === 403) { tvPaint('Tavily didn\u2019t accept that key. Copy it again from your Tavily dashboard and paste it here.'); return; }
      if (!r.ok && r.status !== 429 && r.status !== 432) { tvPaint('Couldn\u2019t reach Tavily just now (' + r.status + '). The key was not saved; try again.'); return; }
      try { localStorage.setItem('btn-tavily-key', k); localStorage.removeItem('btn-tv-pause'); } catch (x) {}
      RV_TRIED = {}; PR_TRIED = {}; $('tvKey').blur(); tvPaint(r.ok ? 'Key works. Saved on this device; prices and reviews now use it.' : 'Key saved, but your Tavily plan\u2019s allowance is used up for now.');
    })
    .catch(function () { tvPaint('Couldn\u2019t reach Tavily. Check your connection and try again.'); });
});
document.addEventListener('focusin', function (e) { if (e.target.id === 'tvKey' && /\u2022/.test(e.target.value)) e.target.value = ''; });
function tvPaused() { if (tvKey()) return 0; var t = 0; try { t = +localStorage.getItem('btn-tv-pause') || 0; } catch (x) {} return t > Date.now() ? t : 0; }
function tvResume() { var t = tvPaused(); return t ? new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : ''; }
function tavily(query, opts) {
  function go(o) { var body = { query: query, max_results: 10, search_depth: 'basic' }; for (var k in o) body[k] = o[k];
    var key = tvKey(), hd = { 'Content-Type': 'application/json' }; if (key) hd.Authorization = 'Bearer ' + key; else hd['X-Tavily-Access-Mode'] = 'keyless';
    return fetch('https://api.tavily.com/search', { method: 'POST', headers: hd, body: JSON.stringify(body) })
      .then(function (r) { if (r.ok) return r.json(); var e = new Error('search ' + r.status); e.status = r.status;
        if (r.status !== 429) throw e;
        return r.json().catch(function () { return {}; }).then(function (j) {                // the free search's daily allowance for this network is used up
          var err = j && j.error || {}; if (!tvKey() && (err.code === 'daily_cap_reached' || err.window === 'day')) {
            var until = Date.now() + Math.max(60, +err.retry_after_seconds || 3600) * 1000; try { localStorage.setItem('btn-tv-pause', String(until)); } catch (x) {}
            e.cap = true; } throw e; }); }); }
  var run = TV_Q.then(function () { if (tvPaused()) { var c = new Error('daily limit'); c.cap = true; throw c; } return go(opts || {}).catch(function (e) {
    if (e.cap) throw e;
    if (e.status === 400 || e.status === 422) { if (!opts) throw e; var o = { max_results: Math.min((opts || {}).max_results || 10, 10) }; return go(o); }   // option not allowed without a key
    if (e.status && e.status !== 429 && e.status < 500) throw e;
    return new Promise(function (ok) { setTimeout(ok, 2500); }).then(function () { return go(opts || {}); }); }); });
  TV_Q = run.catch(function () {}).then(function () { return new Promise(function (ok) { setTimeout(ok, 400); }); });
  return run;
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-pragain]'); if (!b) return;
  var w = ALL.filter(function (x) { return x.id === b.getAttribute('data-pragain'); })[0]; if (w) findPrice(w, true);
});
var PR_BUSY = {}, PR_TRIED = {}, PR_SKIP = /rocketreach|tracxn|mapquest|tavily\.com|cbinsights|linkedin|zoominfo|crunchbase|facebook|instagram|untappd|yelp|youtube|reddit|pinterest|tiktok|wikipedia/;
var PR_GRAPE = {}; WSET_LISTS.grape.concat(['blanc', 'noir', 'rouge', 'red', 'white', 'rose', 'sec', 'brut', 'grigio', 'gris']).forEach(function (g) { prNorm(g).split(' ').forEach(function (t) { if (t.length > 2) PR_GRAPE[t] = 1; }); });
var PR_STOP = { domaine: 1, dom: 1, chateau: 1, ch: 1, the: 1, and: 1, de: 1, la: 1, le: 1, les: 1, du: 1, des: 1, di: 1, del: 1, della: 1, wine: 1, wines: 1, winery: 1, estate: 1, vineyards: 1, vineyard: 1, cellars: 1, bodega: 1, bodegas: 1, weingut: 1, tenuta: 1, cantina: 1 };
function prNorm(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[‘’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function prQuery(w) { return [String(w.producer || '').trim(), String(w.aVintage || '').trim()].filter(Boolean).join(' '); }
function priceText(p) { p = String(p || '').trim(); return /^\d/.test(p) ? '$' + p : p; }
function priceHTML(w) {
  if (!w.price && !PR_BUSY[w.id]) return '';
  if (PR_BUSY[w.id] && !w.price) return '<div class="pr" data-pr="' + esc(w.id) + '">Finding an approximate retail price…</div>';
  var src = /^auto:/.test(w.priceSrc || '') ? String(w.priceSrc).slice(5) : '';
  return '<div class="pr" data-pr="' + esc(w.id) + '">Approx. retail <b>' + esc(priceText(w.price)) + '</b>' +
    (src ? ' <a href="' + esc(src) + '" target="_blank" rel="noopener">' + esc(rvHostP(src)) + ' ›</a>' : ' <span>your price</span>') + '</div>';
}
function priceCell(w) {                                                 // the Actual column's price: found, typed, searching, or not found
  if (w.price) { var src = /^auto:/.test(w.priceSrc || '') ? String(w.priceSrc).slice(5) : '';
    return esc(priceText(w.price)) + (src ? ' <a class="prc-src" href="' + esc(src) + '" target="_blank" rel="noopener">' + esc(rvHostP(src)) + ' \u203a</a>' : ' <span class="prc-s">your price</span>'); }
  if (PR_BUSY[w.id]) return '<span class="prc-s">Searching…</span>';
  if (tvPaused() && !/^none:/.test(w.priceSrc || '')) return '<span class="prc-s">Search limit reached; tries again after ' + tvResume() + '</span>';
  if (/^none:/.test(w.priceSrc || '')) return '<span class="prc-s">Not found</span> <button type="button" class="prc-again" data-pragain="' + esc(w.id) + '">Search again</button>';
  return '–';
}
function rvHostP(u) { return String(u || '').replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#]/)[0]; }
function prToks(w) { var all = prNorm(w.producer).split(' ').filter(function (t) { return t.length > 1 && !PR_STOP[t]; }); var t = all.filter(function (x) { return !PR_GRAPE[x]; }); return t.length ? t : all; }
function prKey(w) { return prToks(w).slice().sort(function (a, b) { return b.length - a.length; })[0] || ''; }
function prPick(w, results) {                                           // the price, read from the search results
  // the words that tell this wine apart (producer, cuvée, site); grape names alone would match the producer's other wines
  var all = prNorm(w.producer).split(' ').filter(function (t) { return t.length > 1 && !PR_STOP[t]; });
  var toks = all.filter(function (t) { return !PR_GRAPE[t]; }); if (!toks.length) toks = all;
  var vin = String(w.aVintage || '').trim(), need = toks.length >= 4 ? toks.length - 1 : toks.length;
  var cands = [];
  (results || []).forEach(function (r) {
    if (!r || PR_SKIP.test(r.url || '') || (/\/(collections|category|categories|search)\b/.test(r.url || '') && !/\/products?\//.test(r.url || ''))) return;   // list pages show other wines' prices
    var text = String(r.content || ''), hay = prNorm((r.title || '') + ' ' + text + ' ' + String(r.url || '').replace(/[\/+_-]/g, ' '));
    var hits = toks.filter(function (t) { return (' ' + hay + ' ').indexOf(' ' + t + ' ') >= 0 || hay.indexOf(t) >= 0; }).length;
    if (!toks.length || hits < need) return;                            // a page about a different wine
    var vinOk = !vin || hay.indexOf(vin) >= 0;
    if (/\b(1\.5\s?l|magnum|375\s?ml|half bottle|3\s?l|jeroboam|case of|6 pack|12 pack)\b/i.test(text) && !/750\s?ml/i.test(text)) return;
    var avg = text.match(/Avg(?:\.|erage)? Price[^$]{0,20}\$\s?([\d,]+(?:\.\d{2})?)/i);
    if (avg && /wine-searcher/.test(r.url)) { cands.push({ v: +avg[1].replace(/,/g, ''), url: r.url, ws: 1, vinOk: vinOk }); return; }
    // read prices from where this wine is named onward, so a shop page's other bottles aren't picked up
    var low = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''), key = toks.slice().sort(function (a, b) { return b.length - a.length; })[0], at = low.indexOf(key);
    var seg = at >= 0 ? text.slice(at, at + 400) : text.slice(0, 400);
    var m, re = /\$\s?(\d{1,3}(?:,\d{3})*|\d+)(\.\d{2})?(?!\d)/g, found = [];
    while ((m = re.exec(seg))) {
      var whole = m[1].replace(/,/g, ''), v = +(whole + (m[2] || ''));
      if (!m[2] && /^\d{3,6}$/.test(whole) && /^\s*\$\s?\d+\.\d{2}/.test(seg.slice(re.lastIndex))) continue;   // "$8000 $80.00": shop pages print cents twice
      if (!m[2] && whole.length >= 4 && !/,/.test(m[1])) continue;     // "$22499" with no decimals is a mangled price
      if (v >= 5 && v <= 5000) found.push(v);
    }
    if (found.length) cands.push({ v: found[0], url: r.url, vinOk: vinOk });
  });
  if (vin && cands.some(function (c) { return c.vinOk; })) cands = cands.filter(function (c) { return c.vinOk; });
  var ws = cands.filter(function (c) { return c.ws; })[0];
  if (ws) return { price: Math.round(ws.v), url: ws.url };
  if (!cands.length) return null;
  var sorted = cands.slice().sort(function (a, b) { return a.v - b.v; }), n = sorted.length, wide = sorted[n - 1].v > 1.8 * sorted[0].v;
  var mid = sorted[Math.floor((n - 1) / (wide ? 3 : 2))];                // widely spread prices lean low: delivery apps and big formats run high
  return { price: Math.round(mid.v), url: mid.url };
}
function findPrice(w, force) {
  if (!w || !w.id || !String(w.producer || '').trim() || PR_BUSY[w.id] || !navigator.onLine) return;
  var q = prQuery(w), src = String(w.priceSrc || '');
  if (w.price && !/^(auto|none):/.test(src)) return;                     // the taster's own price
  if (!force && (/^auto:/.test(src) && w.price || src === 'none:' + q)) return;   // already found, or already searched for this wine
  if (!force && PR_TRIED[w.id + q]) return; PR_TRIED[w.id + q] = 1;
  PR_BUSY[w.id] = 1; repaintPrice(w.id);
  tavily(q.replace(/[‘’'`]/g, '') + ' price 750ml')
    .then(function (j) {
      var got = prPick(w, j.results);
      var price = got ? String(got.price) : '', src = got ? 'auto:' + got.url : 'none:' + q;
      return api('appSetPrice', w.id, price, src).then(function (x) {
        if (!x) return; setData(x.all);
        if (rec.id === w.id && !rec.price) { rec.price = price; rec.priceSrc = src; rerow('identity'); }   // the wine open in Tasting shows it too
      });
    })
    .catch(function (e) { delete PR_TRIED[w.id + q]; if (force && !(e && e.cap)) toast('Couldn\u2019t search for a price right now'); })                  // offline or the search was busy: try again another time
    .then(function () { delete PR_BUSY[w.id]; repaintPrice(w.id); });
}
function repaintPrice(id) {
  if (!$('cardSheet').classList.contains('show')) return;
  var w = ALL.filter(function (x) { return x.id === id; })[0], head = $('cardBody').querySelector('.tc-head > div');
  if (!w || !head || !$('cardBody').querySelector('[data-del="' + id + '"]')) return;
  var cell = $('cardBody').querySelector('[data-prc="' + id + '"]'); if (!cell) return;
  var was = cell.innerHTML; cell.innerHTML = priceCell(w);
  if (w.price && was.indexOf('prc-src') < 0 && was !== cell.innerHTML) arrive(cell);
}
Sync.on(function () {                                                    // keep "Synced … ago" current
  var sh = $('showing'); if (!sh || !ALL.length) return;
  var y = sh.querySelector('.sy'), t = syncAgo(); if (y) y.outerHTML = t.replace(/^ · /, '') || ''; else if (t) sh.insertAdjacentHTML('beforeend', t);
});

/* ====================================================================== the save moment and the flight summary
   Saving a revealed blind wine plays a short, calm reveal: the four answers fill in one at a time and the score settles
   in gold (a clean 4 of 4 gets a quiet glint). Once per wine. The flight summary closes a date or event. */
function celebrated(id, mark) {
  var m = {}; try { m = JSON.parse(localStorage.getItem('btn-moment') || '{}'); } catch (x) {}
  if (!mark) return !!m[id]; m[id] = Date.now(); var k = Object.keys(m); if (k.length > 400) k.sort(function (a, b) { return m[a] - m[b]; }).slice(0, 100).forEach(function (x) { delete m[x]; });
  try { localStorage.setItem('btn-moment', JSON.stringify(m)); } catch (x) {}
}
function flightOf(w) { return ALL.filter(function (x) { return x.ymd === w.ymd && (x.event || '') === (w.event || ''); }).sort(function (a, b) { return a.wineNo - b.wineNo; }); }
function overlay(cls, html) {
  var o = document.createElement('div'); o.className = 'mo ' + cls; o.innerHTML = html; document.body.appendChild(o);
  requestAnimationFrame(function () { o.classList.add('show'); });
  o.close = function () { o.classList.remove('show'); setTimeout(function () { o.remove(); }, 260); };
  o.addEventListener('click', function (e) { if (e.target === o || e.target.closest('[data-mo-x]')) o.close(); });
  return o;
}
function saveMoment(w, next, nextNo) {
  if (!w || w.open || w.score === '' || !w.hits || celebrated(w.id)) return false;
  celebrated(w.id, true);
  var n = +w.score, perfect = n === 4 && w.hits.every(function (h) { return h === true; }), fl = flightOf(w);
  var dots = w.hits.map(function (h, i) { return '<i class="' + (h === null ? 'x' : h === 0.5 ? 'h' : h ? 'y' : 'n') + '" style="--d:' + (i * 260 + 200) + 'ms"></i>'; }).join('');
  var labels = ['Grape', 'Country', 'Region', 'Vintage'].map(function (t) { return '<span>' + t + '</span>'; }).join('');
  var html = '<div class="mo-card' + (perfect ? ' perfect' : '') + '" role="status"><div class="mo-k">' + esc('Wine ' + w.wineNo + ' revealed') + '</div><h3>' + esc(w.producer || w.aGrape || 'Saved') + '</h3>' +
    '<div class="mo-dots">' + dots + '</div><div class="mo-lab">' + labels + '</div>' +
    '<div class="mo-score"><b>' + fmtScore(n) + '</b><small> of 4</small></div>' +
    (next ? '<p class="mo-next">Now Wine ' + esc(nextNo) + '</p>' :
      '<div class="mo-btns">' + (fl.length > 1 ? '<button type="button" class="btn" data-mo-sum="' + esc(w.id) + '">Flight summary</button>' : '') + '<button type="button" class="btn pri" data-mo-x>Done</button></div>') + '</div>';
  var o = overlay(next ? 'quick' : 'full', html);
  if (next) setTimeout(o.close, 2900);
  var b = o.querySelector('[data-mo-sum]'); if (b) b.onclick = function () { o.close(); flightSummary(fl); };
  return true;
}
function critic100(x) { var m = String(x.score || '').match(/^(\d+(?:\.5)?)\/(100|20)$/); return m ? (+m[2] === 20 ? +m[1] * 5 : +m[1]) : 0; }
function flightSummary(list) {
  if (!list || !list.length) return;
  var blind = list.filter(function (w) { return !w.open && w.score !== ''; }), hits = blind.reduce(function (t, w) { return t + (+w.score || 0); }, 0);
  var best = blind.slice().sort(function (a, b) { return (+b.score || 0) - (+a.score || 0) || a.wineNo - b.wineNo; })[0];
  var top = null; list.forEach(function (w) { rvTop(rvParse(w.reviews).items.filter(rvGood), 3).forEach(function (x) { var v = critic100(x); if (v && (!top || v > top.v)) top = { v: v, x: x, w: w }; }); });
  var when = list[0].ymd ? new Date(list[0].ymd + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
  var name = function (w) { return w.producer || w.aGrape || 'Wine ' + w.wineNo; };
  var html = '<div class="mo-card sum"><div class="mo-k">' + esc([when, list[0].event].filter(Boolean).join(' · ')) + '</div><h3>Flight summary</h3>' +
    '<div class="fs-stats"><div><b>' + list.length + '</b><span>Wines</span></div>' +
    (blind.length ? '<div><b>' + fmtScore(hits) + '<small>/' + (blind.length * 4) + '</small></b><span>Blind score</span></div>' : '') +
    (best ? '<div><b class="t">' + esc(name(best)) + '</b><span>Best call · ' + fmtScore(best.score) + ' of 4</span></div>' : '') +
    (top ? '<div><b class="t">' + esc(top.x.critic) + ' ' + esc(top.x.score) + '</b><span>Top critic score · ' + esc(name(top.w)) + '</span></div>' : '') + '</div>' +
    '<div class="fs-list">' + list.map(function (w) {
      return '<button type="button" class="fs-row" data-fs-open="' + esc(w.id) + '"><span class="n">' + w.wineNo + '</span><span class="w"><b>' + esc(name(w)) + '</b>' + (w.quality ? '<small>' + esc(w.quality) + '</small>' : '') + '</span>' +
        '<span class="sc">' + (w.open ? '<em>Open</em>' : w.score === '' ? '<b>–</b>' : '<b>' + fmtScore(w.score) + '<small>/4</small></b>') + dotsHTML(w) + '</span></button>'; }).join('') + '</div>' +
    '<div class="mo-btns"><button type="button" class="btn" data-mo-x>Done</button><button type="button" class="btn pri" data-fs-pdf>Share PDF</button></div></div>';
  var o = overlay('full', html);
  o.querySelector('[data-fs-pdf]').onclick = function () { o.close(); sharePdf(list, flightTitle(list)); };
  o.querySelectorAll('[data-fs-open]').forEach(function (b) { b.onclick = function () { o.close();
    var w = ALL.filter(function (x) { return x.id === b.getAttribute('data-fs-open'); })[0]; if (!w) return; if (view !== 'notebook') setView('notebook'); openCard(w); }; });
}
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-fsum]'); if (!b) return; e.stopPropagation();
  var k = b.getAttribute('data-fsum'), v = k.slice(2);
  flightSummary(ALL.filter(function (x) { return k[0] === 'd' ? x.ymd === v : (x.event || '') === v; }).sort(function (a, b) { return (a.ymd || '').localeCompare(b.ymd || '') || a.wineNo - b.wineNo; }));
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { var o = document.querySelector('.mo.show'); if (o) o.close(); } });
/*build*/(window.__V = window.__V || {})['app2'] = 'v2.43';
