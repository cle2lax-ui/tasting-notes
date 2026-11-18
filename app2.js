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
function idLine(w) { return [w.aGrape, w.aRegion, w.aCountry, w.aVintage].filter(Boolean).join(' · '); }
function labHTML(w, cls) {
  var th = THUMBS[w.id];
  return th ? '<img class="lab ' + (cls || '') + '" src="' + th.thumb + '" data-full="' + th.full + '" alt="Label">' : '<span class="lab none ' + (cls || '') + '" style="--wc:' + (SWC[w.color] || 'var(--line-2)') + '"></span>';
}
function dotsHTML(w) { if (w.open || !w.hits) return ''; return '<span class="dots">' + w.hits.map(function (h) { return '<i class="' + (h === null ? '' : h ? 'y' : 'n') + '"></i>'; }).join('') + '</span>'; }
function rowHTMLnb(w) {
  var title = w.producer || w.aGrape || 'Not yet revealed', sub = w.producer ? idLine(w) : !w.aGrape && w.gGrape ? 'My guess: ' + [w.gGrape, w.gRegion].filter(Boolean).join(' · ') : idLine(w);
  var acts = selecting || !w.ymd ? '' : '<div class="ract" aria-hidden="true"><button type="button" class="ra edit" tabindex="-1" data-edit="' + w.ymd + '|' + w.wineNo + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>Edit</button><button type="button" class="ra share" tabindex="-1" data-pdf1="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2M5 4.8L8 2l3 2.8M4.5 7H3.5v7h9V7h-1"/></svg>PDF</button><button type="button" class="ra del" tabindex="-1" data-del="' + esc(w.id) + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5"/></svg>Delete</button></div>';
  return '<div class="rw2">' + acts + '<button type="button" class="row' + (SEL[w.id] ? ' sel' : '') + '" data-id="' + esc(w.id) + '">' + (selecting ? '<span class="pick">' + (SEL[w.id] ? '✓' : '') + '</span>' : '') + labHTML(w) +
    '<span class="w"><b' + (w.producer || w.aGrape ? '' : ' class="un"') + '>' + esc(title) + '</b>' + (sub ? '<span>' + esc(sub) + '</span>' : '') + '<small>' + esc(['Wine ' + w.wineNo, w.quality].filter(Boolean).join(' · ')) + '</small></span>' +
    '<span class="sc">' + (w.open ? '<em>Open</em>' : w.score === '' ? '<b>–</b>' : '<b>' + w.score + '<small>/4</small></b>') + dotsHTML(w) + '</span></button></div>';
}
function renderNotebook() {
  var wines = shownWines(), byGroup = NB.sort === 'Date & Wine #' || NB.sort === 'Tasting / Event', html = '', last = null;
  var filtered = NB.field !== '(no filter)' && NB.value !== '(all)';
  $('showing').innerHTML = !ALL.length ? '' : (filtered ? esc(NB.field) + ': <b>' + esc(NB.value) + '</b> · ' : '') + wines.length + ' of ' + ALL.length + ' wine' + (ALL.length === 1 ? '' : 's') +
    (NB.q.trim() ? ' matching “' + esc(NB.q.trim()) + '”' : '') + ' · ' + esc(NB.sort.toLowerCase());
  $('nbCount').textContent = ALL.length + ' wine' + (ALL.length === 1 ? '' : 's');
  $('filterBtn').classList.toggle('on', filtered || NB.sort !== 'Date & Wine #' || !NB.desc);
  wines.forEach(function (w) {
    var gk = NB.sort === 'Tasting / Event' ? (w.event || '') : w.ymd;
    if (byGroup && gk !== last) {
      var grp = wines.filter(function (x) { return (NB.sort === 'Tasting / Event' ? (x.event || '') : x.ymd) === gk; });
      var ev = grp.map(function (x) { return x.event; }).filter(Boolean).filter(function (v, j, a) { return a.indexOf(v) === j; });
      var when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date';
      html += '<div class="grp"><b>' + esc(NB.sort === 'Tasting / Event' ? (gk || 'No event') : when) + '</b><span>' + esc((NB.sort === 'Tasting / Event' ? '' : ev.join(' · ') + (ev.length ? ' · ' : '')) + grp.length + ' wine' + (grp.length === 1 ? '' : 's')) + '</span></div>';
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
  $('cardBody').innerHTML = cardHTML(w); sheet('cardSheet'); var pn = $('cardSheet').querySelector('.panel'); pn.scrollTop = 0;   // each wine opens at its top
  pn.style.setProperty('--phh', pn.querySelector('.ph').offsetHeight + 'px');                     // the wine's name and photo stay pinned just under Done
});
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
   Each assessed term is stated as a sentence ("The acidity is Medium (+).") with the SAT term capitalized;
   descriptors are grouped by where they come from (primary, secondary, tertiary) using the Lexicon;
   the taster's own comments follow in the same voice. */
function andList(a) { a = a.filter(Boolean); return a.length < 2 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]; }
function term(v) { return nice(v); }                                   // SAT terms keep their capitals: Pale, Medium (+), Off-Dry
var RIPE = { 'unripe fruit': 'Unripe', 'ripe fruit': 'Ripe', 'dried fruit': 'Dried', 'cooked fruit': 'Cooked' };
var ORIGIN_WORD = { p: 'primary', s: 'secondary', t: 'tertiary' };
function descSentences(raw, noun) {                                    // noun: 'aromas' or 'flavors'
  var toksIn = String(raw || '').split(/\s*,\s*/).map(function (t) { return t.trim().replace(/[.;:]+$/, ''); }).filter(Boolean);
  var g = { p: [], s: [], t: [] }, own = [], ripe = [];
  toksIn.forEach(function (t) {
    var k = t.toLowerCase();
    if (RIPE[k]) { ripe.push(RIPE[k]); return; }
    var h = WORDHOME[k]; if (!h) { own.push(t.charAt(0) === t.charAt(0).toUpperCase() && t.slice(1) === t.slice(1).toLowerCase() ? t.toLowerCase() : t); return; }
    var lab = wordLabel(h.w); g[h.t].push(lab.toLowerCase());
  });
  var out = [], used = ['p', 's', 't'].filter(function (o) { return g[o].length; });
  if (used.length > 1 || (used.length === 1 && used[0] !== 'p')) {
    var parts = used.map(function (o) { return ORIGIN_WORD[o] + ' ' + noun + ' of ' + andList(g[o]); });
    // groups are separated clearly: "primary aromas of a and b, and secondary aromas of c" / three groups take semicolons
    var joined = parts.length === 1 ? parts[0] : parts.length === 2 ? parts[0] + ', and ' + parts[1] : parts.slice(0, -1).join('; ') + '; and ' + parts[parts.length - 1];
    out.push('The wine has ' + joined + '.');
    if (own.length) out.push('There are also notes of ' + andList(own) + '.');
  } else if (used.length || own.length) {
    out.push('The wine has ' + noun + ' of ' + andList(g.p.concat(own)) + '.');
  }
  if (ripe.length) out.push('The fruit character is ' + andList(ripe) + '.');
  return out.join(' ');
}
function prose(w) {
  var out = [], S1 = [];
  // Appearance
  if (w.clarity) S1.push('The wine is ' + term(w.clarity) + (/hazy/i.test(w.clarity) ? ', which may indicate a fault.' : '.'));
  if (w.appInt && w.color) S1.push('The color is ' + term(w.appInt) + ' ' + term(w.color) + '.');
  else if (w.color) S1.push('The color is ' + term(w.color) + '.');
  else if (w.appInt) S1.push('The color intensity is ' + term(w.appInt) + '.');
  if (w.appNotes) S1.push(sent(w.appNotes));
  if (S1.length) out.push({ h: 'Appearance', m: S1.join(' ') });
  // Nose
  var N = [];
  if (w.condition) N.push('The nose is ' + term(w.condition) + (/unclean/i.test(w.condition) ? ', which may indicate a fault.' : '.'));
  if (w.noseInt) N.push('The aromatic intensity is ' + term(w.noseInt) + '.');
  if (w.development) N.push('The wine is ' + term(w.development) + '.');
  var ar = descSentences(w.aromas, 'aromas'); if (ar) N.push(ar);
  if (w.noseNotes) N.push(sent(w.noseNotes));
  if (N.length) out.push({ h: 'Nose', m: N.join(' ') });
  // Palate
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
  if (same) { var extra = descSentences(more, 'flavors').replace(/^The wine has /, '').replace(/\.$/, '');
    P.push(SAME + (extra ? ', with additional ' + extra.replace(/^There are also notes of /, 'notes of ') : '') + '.'); }
  else { var fs = descSentences(more, 'flavors'); if (fs) P.push(fs); }
  if (w.finish) P.push('The finish is ' + term(w.finish) + '.');
  if (w.palate) P.push(sent(w.palate));
  if (P.length) out.push({ h: 'Palate', m: P.join(' ') });
  // Conclusions: the rating stands alone (bold, larger); the reasons follow as sentences
  var bl = String(w.blic || '').split(/\s*,\s*/).filter(Boolean).map(function (x) { return x.toLowerCase(); });
  var C = [];
  if (bl.length) C.push('The wine shows ' + andList(bl) + '.');
  if (w.qReason) C.push(sent(w.qReason));
  if (w.aging) C.push(w.aging === 'Suitable' ? 'The wine is suitable for further aging.' : 'The wine is not suitable for further aging.');
  if (w.aReason) C.push(sent(w.aReason));
  if (w.quality || C.length) out.push({ h: 'Conclusions', q: w.quality ? term(w.quality) : '', m: C.join(' ') });
  return out;
}
var PROF = [['Sweetness', 'sweetness', 'sweetness'], ['Acidity', 'acidity', 'five'], ['Tannin', 'tannin', 'five'], ['Alcohol', 'alcohol', 'alcohol'], ['Body', 'body', 'body'], ['Flavor int.', 'flavInt', 'intensity'], ['Finish', 'finish', 'finish']];
function cardHTML(w) {
  var pr = prose(w), when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  var h = '<article class="card"><header class="tc-head">' + labHTML(w, 'big') + '<div><div class="k">' + esc([when, 'Wine ' + w.wineNo, w.event].filter(Boolean).join(' · ')) + '</div>' +
    '<h2' + (w.producer || w.aGrape ? '' : ' class="un"') + '>' + esc(w.producer || w.aGrape || 'Not yet revealed') + '</h2>' + (w.producer && idLine(w) ? '<div class="id">' + esc(idLine(w)) + '</div>' : '') + '</div></header>';
  h += '<div class="tc-body"><div class="prose">' + (pr.length ? pr.map(function (p) {
    return '<p><b>' + p.h + '</b>' + (p.q ? '<strong class="q">' + esc(p.q) + '</strong>' : '') + esc(p.m) + '</p>';
  }).join('') : '<p class="hint">No tasting note yet.</p>') + '</div><div class="side">';
  h += '<div><h6>Structure</h6><div class="prof">' + PROF.map(function (p) {
    var list = S[p[2]] || [], i = list.indexOf(w[p[1]]);
    return '<div' + (i < 0 ? ' class="na"' : '') + '><span>' + p[0] + '</span><span class="line" style="--n:' + list.length + ';--p:' + (i < 0 ? 0 : i / (list.length - 1)).toFixed(3) + '">' + list.map(function (_, j) { return '<i style="--j:' + j + '"' + (j === i ? ' class="on"' : j < i ? ' class="fl"' : '') + '></i>'; }).join('') + '</span><em>' + esc(i < 0 ? '–' : SHORTR[w[p[1]]] || w[p[1]]) + '</em></div>';
  }).join('') + '</div></div>';
  var rows = [['Grape', 'gGrape', 'aGrape'], ['Country', 'gCountry', 'aCountry'], ['Region', 'gRegion', 'aRegion'], ['Vintage', 'gVintage', 'aVintage']];
  h += '<div><h6>' + (w.open ? 'The wine' : 'Guess and actual') + '</h6><div class="gx' + (w.open ? ' open' : '') + '"><span></span>' + (w.open ? '' : '<span class="h">My guess</span>') + '<span class="h">Actual</span>' +
    rows.map(function (r, i) { var hit = w.hits ? w.hits[i] : null, st = w.open || hit === null || !w[r[1]] ? '' : hit ? ' y' : ' n';
      return '<span class="l">' + r[0] + '</span>' + (w.open ? '' : '<span class="g' + st + '">' + esc(w[r[1]] || '–') + '</span>') + '<span class="a">' + esc(w[r[2]] || '–') + '</span>'; }).join('') + '</div></div>';
  h += '</div></div>';
  // the blind-tasting result sits at the end, after the note it grew out of
  h += '<div class="tc-guess">' + (w.open ? '<span>Tasted open</span><b class="op">Not scored</b>' : '<span>Blind Tasting Guess</span><b>' + (w.score === '' ? '–' : w.score + '<small>/4</small>') + '</b>') + '</div>';
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
  var hx = x, when = w.ymd ? new Date(w.ymd + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  if (img) { var ip = D.getImageProperties(img), ih = 40 * K, iw = Math.min(ih * 1.2, ih * ip.width / ip.height); if (draw) { D.addImage(img, 'JPEG', x, y + 2, iw, ih, undefined, 'MEDIUM'); D.setDrawColor(PC.line); D.setLineWidth(.5); D.rect(x, y + 2, iw, ih); } hx = x + iw + 12 * K; }
  var right = x + W;
  font('Playfair', 'bold', 18, PC.gold); var sc = w.open ? '' : w.score === '' ? '–' : w.score + '/4';
  if (w.open) { font('Archivo', 'bold', 7.5, PC.muted); txt('TASTED OPEN', right, y + 14 * K, { align: 'right' }); } else { txt(sc, right, y + 18 * K, { align: 'right' }); font('Archivo', 'bold', 5.6, PC.muted); txt('BLIND TASTING GUESS', right, y + 27 * K, { align: 'right', charSpace: .8 }); }
  font('Archivo', 'bold', 6.4, PC.gold); txt([when, 'Wine ' + w.wineNo, w.event].filter(Boolean).join('  ·  ').toUpperCase(), hx, y + 9 * K, { charSpace: .9 });
  font('Playfair', 'bold', 15, (w.producer || w.aGrape) ? PC.ink : PC.muted);
  var title = D.splitTextToSize(pdfText(w.producer || w.aGrape || 'Not yet revealed'), right - hx - 92 * K)[0]; txt(title, hx, y + 25 * K);
  if (w.producer && idLine(w)) { font('Archivo', 'bold', 8.4, PC.sig); txt(D.splitTextToSize(pdfText(idLine(w)), right - hx - 92 * K)[0], hx, y + 37 * K); }
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
    var hit = w.hits ? w.hits[i] : null, st = w.open || hit === null || !w[r[1]] ? '' : hit ? 'y' : 'n';
    font('Archivo', 'normal', 6.6, PC.muted); txt(r[0], c1, gy);
    if (!w.open) { font('Archivo', 'bold', 7, st === 'n' ? PC.muted : PC.ink); var gt = D.splitTextToSize(pdfText(w[r[1]] || '–'), cw - 8 * K)[0]; txt(gt, c2, gy);
      if (st && draw) { var mx = c2 + D.getTextWidth(gt) + 5 * K, my = gy - 2.6 * K; D.setLineWidth(.9 * K); D.setDrawColor(st === 'y' ? PC.ok : PC.no);
        if (st === 'y') { D.line(mx - 2 * K, my, mx - .5 * K, my + 1.8 * K); D.line(mx - .5 * K, my + 1.8 * K, mx + 2.4 * K, my - 2 * K); }
        else { D.line(mx - 1.8 * K, my - 1.8 * K, mx + 1.8 * K, my + 1.8 * K); D.line(mx + 1.8 * K, my - 1.8 * K, mx - 1.8 * K, my + 1.8 * K); } } }
    font('Archivo', 'bold', 7, PC.sig); txt(D.splitTextToSize(pdfText(w[r[2]] || '–'), cw)[0], c3, gy); gy += 10 * K;
  });
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
Sync.on(function (st) { $('syncNote').hidden = st !== 'signin'; });
$('syncNow').onclick = function () {
  var b = this; b.disabled = true; b.textContent = 'Syncing…';
  Sync.sync(true).then(function () { if (window.afterSync) afterSync(); toast('Synced with your Google Sheet'); })
    .catch(function (err) { toast(err && err.message === 'signin' ? 'Google sign-in was cancelled' : (err && err.message) || 'Could not sync'); })
    .then(function () { b.disabled = false; b.textContent = 'Sync now'; });
};
/*build*/(window.__V = window.__V || {})['app2'] = 'v2.24';
