/* Tasting Notes 2 — Taste view, Lexicon sheet, shared helpers. Data layer: logic.js, store.js, google.js. */
var VERSION_LABEL = 'v2.50';
var S = {}, ALL = [], WINES = [], LISTS = {};
var rec = {}, orig = null, dirty = false, view = 'taste';
var DRAFT_KEY = 'btn2-draft', NB_KEY = 'btn2-notebook';
var THUMBS = {}, PHOTO_IDS = {};
var OPENED = {};                                          // comment rows the user opened
var SWC = {'Lemon-Green':'#D6DC7A','Lemon':'#F1E27E','Gold':'#E2B64A','Amber':'#C98A2E','Pink':'#F2B3C1','Pink-Orange':'#F0A27F',
  'Orange':'#E5843C','Purple':'#4E1A45','Ruby':'#8C1C33','Garnet':'#772331','Tawny':'#9C5530','Brown':'#6E4325'};
var CHIPC = {
  White: { 'Lemon-Green':['#EEF0BC','#D3D97A','Very youthful'], 'Lemon':['#F8EDB0','#EBD668','Youthful'], 'Gold':['#F2D488','#D9A842','Developed or oaked'],
    'Amber':['#E3AE5E','#BA7526','Mature, oxidative'], 'Brown':['#B07836','#7C4819','Fully oxidized'] },
  'Rosé': { 'Pink':['#F9D3DB','#EDA4B5','Youthful'], 'Pink-Orange':['#F8CBB2','#E8977A','Developing'], 'Orange':['#F2B479','#D98038','Mature'] },
  Red: { 'Purple':['#6A2A5E','#380C31','Very youthful'], 'Ruby':['#B02C47','#741129','Youthful'], 'Garnet':['#97363C','#5C1920','Developing'],
    'Tawny':['#B6713F','#7D4220','Mature'], 'Brown':['#88553A','#4C2A17','Fully mature'] } };
var SHORTR = { 'Pronounced': 'Pronounced', 'Medium-Dry': 'Medium-dry', 'Medium-Sweet': 'Medium-sweet',
  'Off-Dry': 'Off-dry', 'Luscious': 'Luscious', 'Acceptable': 'Acceptable', 'Very Good': 'Very Good', 'Outstanding': 'Outstanding' };
var SAME = 'Palate confirms the aromas listed above';
function isSame(t) { return String(t).toLowerCase().replace(/[.;:]+$/, '').trim() === SAME.toLowerCase(); }
var NICE = { 'Hazy (Faulty?)': 'Hazy', 'Unclean (Faulty?)': 'Unclean', 'Not Suitable': 'Not suitable' };

function $(id) { return document.getElementById(id); }
function $$(s, el) { return [].slice.call((el || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function api(fn) { var a = [].slice.call(arguments, 1); try { return Promise.resolve(API[fn].apply(null, a)); } catch (e) { return Promise.reject(e); } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function recall(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function nice(v) { return NICE[v] || v; }
function low(v) { return String(v || '').trim().toLowerCase(); }
function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { e.classList.remove('show'); }, Math.max(2600, String(t).length * 55)); }   // longer messages stay longer
function ask(msg, yes, no, danger) {     // danger: the confirming button is red (deleting, clearing, discarding)
  return new Promise(function (res) {
    $('mMsg').textContent = msg; $('mYes').textContent = yes || 'OK'; $('mYes').classList.toggle('danger', !!danger); $('mNo').textContent = no || 'Cancel'; $('modal').classList.add('show');
    $('mYes').onclick = function () { $('modal').classList.remove('show'); res(true); };
    $('mNo').onclick = function () { $('modal').classList.remove('show'); res(false); };
  });
}
function fail(err) { toast('Something went wrong: ' + (err && err.message ? err.message : err)); }
// iPad and iPhone keep scrolling the page behind an open sheet unless the page itself is pinned in place:
// while body.locked is set, the page is fixed at its scroll position and put back exactly there afterwards
(function () {
  var y = null, OPEN = '.sheet.show, .lx.show, .welcome.show, .lightbox.show';
  new MutationObserver(function () {
    var on = !!document.querySelector(OPEN), st = document.body.style;      // any open sheet (Settings, wine page, Change, Lexicon, photo viewer)
    if (document.body.classList.contains('locked') !== on) document.body.classList.toggle('locked', on);
    if (on && y === null) { y = window.scrollY || 0; st.position = 'fixed'; st.top = -y + 'px'; st.left = '0'; st.right = '0'; st.width = '100%'; }
    else if (!on && y !== null) { st.position = st.top = st.left = st.right = st.width = ''; window.scrollTo(0, y); y = null; }
  }).observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
  // a drag on the dimmed backdrop (outside the panel) must not move anything
  document.addEventListener('touchmove', function (e) { if (e.target.classList && (e.target.classList.contains('sheet') || e.target.classList.contains('modal'))) e.preventDefault(); }, { passive: false });
})();
function sheet(id, on) { $(id).classList.toggle('show', on !== false); document.body.classList.toggle('locked', !!document.querySelector('.sheet.show, .lx.show, .welcome.show, .lightbox.show')); }

/* ====================================================================== Taste: structure */
function STAGES() { return [
  { t: 'Appearance', need: ['clarity', 'appInt', 'type', 'color'], sum: function () { return [nice(rec.clarity), [rec.appInt, rec.color].filter(Boolean).join(' ').toLowerCase()].filter(Boolean).join(' · '); },
    rows: [['chips', 'clarity', 'Clarity', S.clarity], ['rail', 'appInt', 'Intensity', S.appInt], ['chips', 'type', 'Wine type', S.type], ['color'],
      ['comment', 'appNotes', 'Add an appearance note', 'Legs, deposit, rim, bubbles…']] },
  { t: 'Nose', need: ['condition', 'noseInt', 'development', 'aromas'], sum: function () { var n = toks('aromas').length; return [nice(rec.noseInt), rec.development, n ? n + ' aromas' : ''].filter(Boolean).join(' · '); },
    rows: [['chips', 'condition', 'Condition', S.condition], ['rail', 'noseInt', 'Intensity', S.intensity], ['rail', 'development', 'Development', S.development],
      ['desc', 'aromas', 'Aromas'], ['comment', 'noseNotes', 'Add a nose comment', 'How it changes in the glass, what stands out…']] },
  { t: 'Palate', need: ['sweetness', 'acidity', 'tannin', 'alcohol', 'body', 'flavInt', 'finish', 'flavors'], sum: function () { return [rec.sweetness, rec.acidity && 'acid ' + nice(rec.acidity).toLowerCase(), rec.finish && nice(rec.finish).toLowerCase() + ' finish'].filter(Boolean).join(' · '); },
    rows: [['rail', 'sweetness', 'Sweetness', S.sweetness], ['rail', 'acidity', 'Acidity', S.five], ['rail', 'tannin', 'Tannin', S.five],
      ['comment', 'tanNature', 'Describe the tannin', 'Ripe, fine-grained, grippy, green…', 1], ['rail', 'alcohol', 'Alcohol', S.alcohol], ['rail', 'body', 'Body', S.body],
      ['rail', 'flavInt', 'Flavor intensity', S.intensity], ['rail', 'finish', 'Finish', S.finish], ['desc', 'flavors', 'Flavors'],
      ['comment', 'palate', 'Add a palate note', 'Texture, pétillance, residual sugar…']] },
  { t: 'Conclusions', need: ['quality', 'aging'], sum: function () { return [rec.quality, rec.aging && (rec.aging === 'Suitable' ? 'for aging' : 'drink now')].filter(Boolean).join(' · '); },
    rows: [['rail', 'quality', 'Quality', S.quality], ['chips', 'blic', 'Why', S.blic, 1], ['comment', 'qReason', 'Add your reasoning', 'Balance, length, intensity, complexity…'],
      ['chips', 'aging', 'Bottle aging', S.aging], ['comment', 'aReason', 'Add aging reasoning', 'Structure, fruit, development…']] },
  { t: 'Wine Identity and Photo', need: [], sum: function () { var s = score(); return rec.open ? 'Tasted open' : [rec.gGrape, s ? s.hits + ' of 4' : ''].filter(Boolean).join(' · '); }, rows: [['identity']] }
]; }
function stageDone(st) {
  if (st.t === 'Wine Identity and Photo') return !!(rec.open ? rec.aGrape || rec.producer : rec.gGrape);
  return st.need.every(function (k) { return k === 'aromas' || k === 'flavors' ? toks(k).length : !!rec[k]; });
}
function isOn(k, v, multi) { return multi ? String(rec[k] || '').split(/\s*,\s*/).indexOf(v) >= 0 : rec[k] === v; }

function rowHTML(r) {
  var kind = r[0], k = r[1];
  if (kind === 'chips') return '<div class="f" id="f-' + k + '"><label>' + r[2] + '</label><div class="chips" data-k="' + k + '"' + (r[4] ? ' data-multi="1"' : '') + '>' +
    r[3].map(function (v) { return '<button type="button" class="chip' + (isOn(k, v, r[4]) ? ' on' : '') + '" data-v="' + esc(v) + '">' + esc(nice(v)) + '</button>'; }).join('') + '</div></div>';
  if (kind === 'rail') {
    var list = r[3], i = list.indexOf(rec[k]), p = i < 0 ? 0 : i / (list.length - 1);
    return '<div class="f rw" id="f-' + k + '"><label>' + r[2] + (i >= 0 ? '<small>' + esc(nice(rec[k])) + '</small>' : '') + '</label>' +
      '<div class="rail' + (i < 0 ? ' unset' : '') + '" data-k="' + k + '" style="--n:' + list.length + ';--p:' + p.toFixed(3) + '">' +
      list.map(function (v, j) { return '<button type="button" style="--j:' + j + '" class="' + (j === i ? 'on' : j < i ? 'f1' : '') + '" data-v="' + esc(v) + '" aria-label="' + esc(nice(v)) + '"><em>' + ((list.length >= 6 && !/\(/.test(SHORTR[v] || v)) || /^Medium (Plus|Minus)$/.test(v) ? esc(SHORTR[v] || v).replace(' ', '<br>') : esc(SHORTR[v] || v)) + '</em></button>'; }).join('') + '</div></div>';
  }
  if (kind === 'color') {
    var cl = rec.type === 'White' ? S.white : rec.type === 'Rosé' ? S.rose : rec.type === 'Red' ? S.red : null, t = CHIPC[rec.type] || {};
    return '<div class="f rw" id="f-color"><label>Color' + (rec.color && t[rec.color] ? '<small>' + esc(t[rec.color][2]) + '</small>' : '') + '</label>' + (cl ?
      '<div class="sw" data-k="color">' + cl.map(function (v) { var c = t[v] || [SWC[v], SWC[v]];
        return '<button type="button" class="' + (rec.color === v ? 'on' : '') + '" data-v="' + esc(v) + '" style="--c1:' + c[0] + ';--c2:' + c[1] + '"><i></i>' + esc(v) + '</button>'; }).join('') + '</div>' :
      '<span class="hint">Choose the wine type first</span>') + '</div>';
  }
  if (kind === 'desc') return descHTML(k, r[2]);
  if (kind === 'comment') {
    var has = String(rec[k] || '').trim(), open = has || OPENED[k];
    if (!open) return '<div class="f full cm" id="f-' + k + '"><button type="button" class="addc" data-open="' + k + '">+ ' + esc(r[2]) + '</button></div>';
    var lab = r[2].replace(/^Add (a |an |your )?/, ''); lab = lab.charAt(0).toUpperCase() + lab.slice(1);
    return '<div class="f full cm" id="f-' + k + '"><label>' + esc(lab) + '</label>' + (r[4] ?
      '<input type="text" data-k="' + k + '" value="' + esc(rec[k]) + '" placeholder="' + esc(r[3]) + '">' :
      '<textarea data-k="' + k + '" rows="2" placeholder="' + esc(r[3]) + '">' + esc(rec[k]) + '</textarea>') + '</div>';
  }
  if (kind === 'identity') return identityHTML();
  return '';
}
function renderTaste() {
  var h = '';
  STAGES().forEach(function (st, i) {
    var done = stageDone(st), n = st.need.filter(function (k) { return k === 'aromas' || k === 'flavors' ? toks(k).length : rec[k]; }).length;
    var fold = done && FOLDED[i];
    h += '<section class="stage' + (fold ? ' folded' : '') + (done ? ' done' : '') + '" id="st-' + i + '" data-i="' + i + '"><div class="sh" role="button" tabindex="0" aria-expanded="' + !fold + '"><h2>' + st.t + '</h2><small id="sum-' + i + '">' +
      esc(done ? st.sum() : st.need.length ? n + ' of ' + st.need.length : '') + '</small><i class="chev" aria-hidden="true"></i></div><div class="sb">' + st.rows.map(rowHTML).join('') + '</div></section>';
  });
  $('taste').innerHTML = h;
  $$('#taste textarea').forEach(grow);
  paintStages(); paintScore();
}
function rerow(k) {
  var el = $('f-' + k); if (!el) return;
  STAGES().forEach(function (st) { st.rows.forEach(function (r) { if (r[1] === k || (k === 'color' && r[0] === 'color')) el.outerHTML = rowHTML(r); }); });
}
var FOLDED = {}, PINNED = {};
$('clearSel').onclick = function () { clearSelections(); };
/* ---- Clear selections: wipes every answer and note on this wine, after an Are you sure? step */
var ID_KEYS = ['open', 'gGrape', 'aGrape', 'gCountry', 'aCountry', 'gRegion', 'aRegion', 'gVintage', 'aVintage', 'producer', 'price', 'priceSrc', 'reviews'];
function answerKeys() { var ks = ID_KEYS.slice(); STAGES().forEach(function (st) { st.rows.forEach(function (r) { ks.push(r[0] === 'color' ? 'color' : r[1]); }); }); return ks.filter(Boolean); }
function clearSelections() {
  var ks = answerKeys(), any = ks.some(function (k) { var v = rec[k]; return Array.isArray(v) ? v.length : !!(v && String(v).trim()); });
  if (!any) { toast('Nothing to clear yet'); return; }
  ask('Are you sure? This clears every selection, descriptor, note and guess for Wine ' + (rec.wineNo || '') + '. The date, wine number, event and label photo stay.' + (orig ? ' The saved copy changes only if you tap Save.' : ''), 'Clear', 'Cancel', true).then(function (go) {
    if (!go) return;
    ks.forEach(function (k) { delete rec[k]; });
    FOLDED = {}; PINNED = {}; OPENED = {};
    if (orig) touch(true); else { dirty = false; clearDraft(); paintId(); }
    renderTaste(); window.scrollTo(0, 0); toast('Selections cleared');
  });
}
/* finished stages fold to their one-line summary once you move on to a later stage */
function foldAbove(i, anchor) {
  var y0 = anchor ? anchor.getBoundingClientRect().top : 0, changed = false;
  STAGES().forEach(function (st, j) {
    if (j >= i || PINNED[j] || FOLDED[j] || !stageDone(st)) return;
    FOLDED[j] = 1; var el = $('st-' + j); if (el) { el.classList.add('folded'); el.querySelector('.sh').setAttribute('aria-expanded', 'false'); changed = true; }
  });
  if (changed && anchor) window.scrollBy(0, anchor.getBoundingClientRect().top - y0);
}
function setFold(i, fold) {
  var el = $('st-' + i); if (!el) return;
  FOLDED[i] = fold ? 1 : 0; PINNED[i] = fold ? 0 : 1;
  el.classList.toggle('folded', !!fold); el.querySelector('.sh').setAttribute('aria-expanded', String(!fold));
  $$('#st-' + i + ' textarea').forEach(grow);
}
function paintStages() {
  STAGES().forEach(function (st, i) {
    var el0 = $('st-' + i); if (el0) el0.classList.toggle('done', stageDone(st));
    var done = stageDone(st), n = st.need.filter(function (k) { return k === 'aromas' || k === 'flavors' ? toks(k).length : rec[k]; }).length;
    var b = document.querySelector('#stages button[data-s="' + i + '"]'); if (b) b.classList.toggle('done', done);
    var s = $('sum-' + i); if (s) s.textContent = done ? st.sum() : st.need.length ? n + ' of ' + st.need.length : '';
  });
}
/* which stage is on screen */
function spy() {
  var top = $('stages').getBoundingClientRect().bottom + 40, cur = 0;
  $$('#taste .stage').forEach(function (s, i) { if (s.getBoundingClientRect().top < top) cur = i; });
  if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 4) cur = 4;
  $$('#stages button').forEach(function (b) { b.classList.toggle('on', +b.getAttribute('data-s') === cur); });
  if (spy.cur !== cur) { spy.cur = cur; var on = document.querySelector('#stages button.on'), row = on && on.parentNode;   // keep the current stage's tab in view
    if (row && row.scrollWidth > row.clientWidth) { var x = on.offsetLeft - (row.clientWidth - on.offsetWidth) / 2; row.scrollTo({ left: Math.max(0, x), behavior: 'smooth' }); } }
}
window.addEventListener('scroll', function () { if (view === 'taste' && !spy.f) spy.f = requestAnimationFrame(function () { spy.f = 0; spy(); }); }, { passive: true });   // at most once a frame
$('stages').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  var si = +b.getAttribute('data-s'); if (FOLDED[si]) setFold(si, false);
  var s = $('st-' + si), y = s.getBoundingClientRect().top + window.scrollY - $('stages').getBoundingClientRect().bottom + 1;
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
});

/* ---- identity: guess and actual, producer, label photo */
function identityHTML() {
  var open = !!rec.open, rows = [['Grape', 'gGrape', 'aGrape', 'grape'], ['Country', 'gCountry', 'aCountry', 'country'], ['Region', 'gRegion', 'aRegion', 'region'], ['Vintage', 'gVintage', 'aVintage', '']];
  var s = score();
  var h = '<div class="f" id="f-identity"><label>Tasted open<small class="mu">' + (open ? 'No guess, no score' : 'Off for a blind tasting') + '</small></label>' +
    '<button type="button" class="switch' + (open ? ' on' : '') + '" id="openBtn" role="switch" aria-checked="' + open + '"><i></i></button></div>';
  h += '<div class="gtab' + (open ? ' open' : '') + '"><span></span>' + (open ? '' : '<span class="h">My guess</span>') + '<span class="h">Actual</span>';
  rows.forEach(function (r, i) {
    var st = !open && s && s.per[i] !== null && low(rec[r[1]]) ? (s.per[i] === true ? ' hit' : s.per[i] === 0.5 ? ' half' : ' miss') : '';
    h += '<span class="l">' + r[0] + '</span>' + (open ? '' : '<input type="text" data-k="' + r[1] + '" class="g' + st + '" value="' + esc(rec[r[1]]) + '"' + (r[3] ? ' list="dl-' + r[3] + '"' : ' inputmode="numeric"') + ' autocomplete="off" autocapitalize="words">') +
      '<input type="text" data-k="' + r[2] + '" value="' + esc(rec[r[2]]) + '"' + (r[3] ? ' list="dl-' + r[3] + '"' : ' inputmode="numeric"') + ' autocomplete="off" autocapitalize="words">';
  });
  h += '</div>';
  h += '<div class="scoreline">' + (open ? '<span>Tasted open · not scored</span>' : '<span>Blind Tasting Guess</span><b id="score">' + (s ? fmtScore(s.hits) + '<small>/4</small>' : '–') + '</b>') + '</div>';
  h += '<h4 class="subh">The reveal</h4><div class="f full"><label>Producer and wine</label><input type="text" data-k="producer" value="' + esc(rec.producer) + '" placeholder="' + (open ? 'Producer and wine' : 'After the reveal') + '" autocapitalize="words"></div>';
  var autoP = /^auto:/.test(rec.priceSrc || '');
  h += '<div class="f full"><label>Approx. retail price<small class="mu">' + (rec.price ? (autoP ? 'Found online \u00b7 ' + esc(String(rec.priceSrc).replace(/^auto:https?:\/\/(www\.)?/, '').split(/[\/?#]/)[0]) : 'Your price') : 'Found online after the reveal, or type your own') + '</small></label>' +
    '<input type="text" data-k="price" inputmode="decimal" autocomplete="off" placeholder="$" value="' + esc(rec.price) + '"></div>';
  h += '<div class="f" id="f-photo"><label>Label photo</label><div class="phbox" id="phBox">' + photoBox() + '</div></div>';
  return h;
}
function score() {
  if (rec.open) return null;
  var pairs = [['gGrape', 'aGrape'], ['gCountry', 'aCountry'], ['gRegion', 'aRegion'], ['gVintage', 'aVintage']], of = 0, hits = 0, per = [];
  pairs.forEach(function (p, i) { if (!low(rec[p[1]])) { per.push(null); return; } of++; var pt = answerPoints(rec[p[0]], rec[p[1]], i === 0); hits += pt; per.push(pt === 1 ? true : pt === 0.5 ? 0.5 : false); });
  return of ? { hits: hits, per: per } : null;
}
function paintScore() {
  var s = score(), el = $('score'); if (el) el.innerHTML = s ? fmtScore(s.hits) + '<small>/4</small>' : '–';
  ['gGrape', 'gCountry', 'gRegion', 'gVintage'].forEach(function (k, i) {
    var e = document.querySelector('input[data-k="' + k + '"]'); if (!e) return;
    e.classList.remove('hit', 'miss', 'half'); if (s && s.per[i] !== null && low(rec[k])) e.classList.add(s.per[i] === true ? 'hit' : s.per[i] === 0.5 ? 'half' : 'miss');
  });
}
function photoBox() {
  var u = rec.id && THUMBS[rec.id];
  if (rec.hasPhoto && rec.id && !u) Photos.urls(rec.id).then(function (x) { if (x) { THUMBS[rec.id] = x; var b = $('phBox'); if (b) b.innerHTML = photoBox(); } });
  return (u && rec.hasPhoto ? '<img src="' + u.thumb + '" data-full="' + u.full + '" alt="Label">' : '') +
    '<label class="dbtn ph-add"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7.2c0-.9.7-1.6 1.6-1.6h1.9l1.2-1.8h4.6l1.2 1.8h1.9c.9 0 1.6.7 1.6 1.6v7.2c0 .9-.7 1.6-1.6 1.6H4.6c-.9 0-1.6-.7-1.6-1.6z"/><circle cx="10" cy="10.6" r="3"/></svg>' + (rec.hasPhoto ? 'Replace photo' : 'Add label photo') + '<input type="file" accept="image/*" id="phInput"></label>' +
    (rec.hasPhoto ? '<button type="button" class="lnk" id="phRemove">Remove</button>' : '') +
    (!rec.hasPhoto && ORPHANS.length ? '<button type="button" class="lnk" id="phOrphans">Use a photo on this device (' + ORPHANS.length + ')</button>' : '');
}
/* ---- label photos saved on this device that no wine points to (left behind by an interrupted save) */
var ORPHANS = [];
function findOrphans() {
  return DB.keys('photos').then(function (keys) {
    var live = {}; ROWS.forEach(function (r) { live[r.id] = true; }); if (rec && rec.id) live[rec.id] = true;
    ORPHANS = (keys || []).filter(function (k) { return !live[k]; });
    var b = $('phBox'); if (b) b.innerHTML = photoBox();
    return ORPHANS;
  }).catch(function () { return ORPHANS = []; });
}
function openOrphans() {
  $('orphGrid').innerHTML = '';
  Promise.all(ORPHANS.map(function (id) { return Photos.urls(id).then(function (u) { return u && '<button type="button" data-orph="' + esc(id) + '"><img src="' + u.thumb + '" alt="Label photo"></button>'; }); }))
    .then(function (h) { $('orphGrid').innerHTML = h.filter(Boolean).join(''); sheet('orphSheet'); });
}
function adoptOrphan(id) {
  if (!rec.id) rec.id = uid();
  var to = rec.id;
  Photos.get(id).then(function (p) { if (!p) throw new Error('That photo is no longer on this device.'); p.id = to; p.driveId = ''; return DB.put('photos', p); })
    .then(function () { return DB.del('photos', id); })
    .then(function () { Photos.forget(id); Photos.forget(to); delete THUMBS[to]; rec.hasPhoto = true; rec.photoUrl = ''; touch(); sheet('orphSheet', false); return findOrphans(); })
    .then(function () { toast('Photo attached. Tap Save to keep it'); })
    .catch(fail);
}
$('orphClose').onclick = function () { sheet('orphSheet', false); };
$('orphGrid').addEventListener('click', function (e) { var b = e.target.closest('[data-orph]'); if (b) adoptOrphan(b.getAttribute('data-orph')); });
$('orphDel').onclick = function () {
  ask('Delete the ' + ORPHANS.length + ' photo' + (ORPHANS.length === 1 ? '' : 's') + ' that aren\u2019t attached to any wine?', 'Delete', 'Keep', true).then(function (go) {
    if (!go) return; Promise.all(ORPHANS.map(function (id) { return Photos.remove(id); })).then(findOrphans).then(function () { sheet('orphSheet', false); toast('Deleted'); });
  });
};
/* A label photo takes a moment to prepare. The photo belongs to the wine it was added to, even if the taster
   saves or moves on before it's ready: Save waits for it, and a wine already saved is updated when it lands. */
var PHOTO_BUSY = null;
document.addEventListener('change', function (e) {
  if (e.target.id !== 'phInput' || !e.target.files || !e.target.files[0]) return;
  var target = rec, id = rec.id || (rec.id = uid());
  toast('Adding photo…');
  var job = PHOTO_BUSY = Photos.add(id, e.target.files[0]).then(function () {
    delete THUMBS[id];
    if (rec === target) { rec.hasPhoto = true; rec.photoUrl = ''; touch(); return Photos.urls(id).then(function (x) { THUMBS[id] = x; var b = $('phBox'); if (b) b.innerHTML = photoBox(); toast('Photo added. Tap Save to keep it'); }); }
    return api('appMarkPhoto', id).then(function (r) { if (r) { setData(r.all); toast('Photo added to ' + (target.producer || 'Wine ' + target.wineNo)); } else Photos.remove(id); });
  }).catch(function (err) { toast(err.message || 'Could not add that photo'); })
    .then(function () { if (PHOTO_BUSY === job) PHOTO_BUSY = null; });
});
/* ---- the photo viewer: Done (or a tap outside the photo, or a swipe down) closes it; the page underneath stays put */
function showPhoto(url) { var im = $('lbImg'); im.style.transform = ''; im.style.opacity = ''; im.src = url; $('lightbox').classList.add('show'); document.body.classList.add('locked'); }
function closePhoto() { $('lightbox').classList.remove('show'); document.body.classList.toggle('locked', !!document.querySelector('.sheet.show, .lx.show, .welcome.show, .lightbox.show')); }
$('lbDone').onclick = function (e) { e.stopPropagation(); closePhoto(); };
$('lightbox').addEventListener('click', function (e) { if (e.target !== $('lbImg') && !LB.moved) closePhoto(); LB.moved = false; });
var LB = { y: null, dy: 0, moved: false };
$('lightbox').addEventListener('touchstart', function (e) { if (e.touches.length !== 1 || e.target.closest('.lb-done')) return; LB.y = e.touches[0].clientY; LB.dy = 0; LB.moved = false; $('lbImg').classList.add('drag'); }, { passive: true });
$('lightbox').addEventListener('touchmove', function (e) {
  e.preventDefault();                                                       // nothing behind the viewer scrolls
  if (LB.y == null) return; LB.dy = Math.max(0, e.touches[0].clientY - LB.y); if (LB.dy > 6) LB.moved = true;
  var im = $('lbImg'); im.style.transform = 'translateY(' + LB.dy + 'px)'; im.style.opacity = String(Math.max(0.35, 1 - LB.dy / 400));
}, { passive: false });
$('lightbox').addEventListener('touchend', function () {
  if (LB.y == null) return; var im = $('lbImg'); im.classList.remove('drag'); LB.y = null;
  if (LB.dy > 90) { closePhoto(); } else { im.style.transform = ''; im.style.opacity = ''; }
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && $('lightbox').classList.contains('show')) closePhoto(); });

/* ---- descriptors (aromas / flavors) */
function toks(k) { return String(rec[k] || '').split(/\s*,\s*/).map(function (t) { return t.trim(); }).filter(Boolean); }
function toggleSame() {
  var t = toks('flavors'), on = t.some(isSame);
  if (!on && !toks('aromas').length) { toast('Add your aromas first'); return; }
  rec.flavors = on ? t.filter(function (x) { return !isSame(x); }).join(', ') : [SAME].concat(t).join(', ');
  touch(); repaintDesc('flavors');
}
function hasWord(k, w) { var lw = w.toLowerCase(); return toks(k).some(function (t) { return t.toLowerCase().replace(/[.;:]+$/, '') === lw; }); }
function toggleWord(k, w, force) {
  var lw = w.toLowerCase();
  if (hasWord(k, w) && force !== true) rec[k] = toks(k).filter(function (t) { return t.toLowerCase().replace(/[.;:]+$/, '') !== lw; }).join(', ');
  else if (!hasWord(k, w)) rec[k] = toks(k).concat([lw]).join(', ');
  touch(); repaintDesc(k);
}
function tokHTML(t, k) {
  if (isSame(t)) return '<span class="tok same">Same as the nose<button type="button" data-untok="' + esc(t) + '" data-k="' + k + '" aria-label="Remove">×</button></span>';
  var known = !!WORDHOME[t.replace(/[.;:]+$/, '').toLowerCase()];
  return '<span class="tok' + (known ? '' : ' own') + '">' + esc(t) + '<button type="button" data-untok="' + esc(t) + '" data-k="' + k + '" aria-label="Remove ' + esc(t) + '">×</button></span>';
}
function descHTML(k, label) {
  var t = toks(k);
  return '<div class="f full" id="f-' + k + '"><label>' + label + '</label><div class="desc" data-k="' + k + '"><div class="tks">' + t.map(function (x) { return tokHTML(x, k); }).join('') +
    '<input type="text" class="din" data-din="' + k + '" placeholder="' + (t.length ? 'Add another' : k === 'flavors' ? 'Type a flavor' : 'Type an aroma') + '" autocomplete="off" autocorrect="off" spellcheck="false" autocapitalize="none" enterkeyhint="done" name="desc-' + k + '"></div>' +
    '<div class="sug" id="sug-' + k + '"></div>' +
    '<div class="dft"><button type="button" class="dbtn" data-lex="' + k + '"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 5.5C8.6 4.4 6.6 4 4 4v11c2.6 0 4.6.4 6 1.5 1.4-1.1 3.4-1.5 6-1.5V4c-2.6 0-4.6.4-6 1.5zM10 5.5v11"/></svg>Pick from the Lexicon</button>' +
    (k === 'flavors' ? '<button type="button" class="dbtn same' + (t.some(isSame) ? ' on' : '') + '" id="sameNose" aria-pressed="' + t.some(isSame) + '">' + (t.some(isSame) ? '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 10.5l3.2 3.2L15 7"/></svg>' : '') + 'Same as the nose</button>' : '') + '<small>' + (function () { var n = t.filter(function (x) { return !isSame(x); }).length; return n ? n + (k === 'flavors' ? ' flavor' : ' aroma') + (n === 1 ? '' : 's') : ''; })() + '</small></div></div></div>';
}
function repaintDesc(k) {
  var el = $('f-' + k); if (el) { var had = document.activeElement && document.activeElement.getAttribute('data-din') === k; el.outerHTML = descHTML(k, k === 'flavors' ? 'Flavors' : 'Aromas'); if (had) document.querySelector('[data-din="' + k + '"]').focus(); }
  paintStages(); if ($('lx').classList.contains('show')) paintLx();
}
function suggest(q, k) {
  q = q.trim().toLowerCase(); if (!q) return [];
  return ALLWORDS.filter(function (w) { return w.indexOf(q) === 0 || w.indexOf(' ' + q) > 0; }).filter(function (w) { return !hasWord(k, w); }).slice(0, 6);
}
document.addEventListener('input', function (e) {
  var din = e.target.getAttribute && e.target.getAttribute('data-din');
  if (din) {
    var v = e.target.value;
    if (/,$/.test(v)) { addTyped(din, v.replace(/,$/, '')); e.target.value = ''; $('sug-' + din).innerHTML = ''; return; }
    $('sug-' + din).innerHTML = suggest(v, din).map(function (w) { return '<button type="button" class="chip sm" data-addw="' + esc(w) + '" data-k="' + din + '">' + esc(wordLabel(w)) + '</button>'; }).join('');
    return;
  }
  var k = e.target.getAttribute && e.target.getAttribute('data-k'); if (!k) return;
  rec[k] = e.target.value; if (k === 'price') rec.priceSrc = '';   // a typed price is the taster's own
  if (e.target.tagName === 'TEXTAREA') grow(e.target);
  if (/^[ga](Grape|Country|Region|Vintage)$/.test(k)) paintScore();
  if (k === 'producer' || /^[ga]Grape$/.test(k)) paintStages();
  touch(true);
});
document.addEventListener('keydown', function (e) {
  var din = e.target.getAttribute && e.target.getAttribute('data-din');
  if (din && e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) { addTyped(din, e.target.value); } }
  if (din && e.key === 'Backspace' && !e.target.value) { var t = toks(din); if (t.length) toggleWord(din, t[t.length - 1].replace(/[.;:]+$/, '')); }
});
function addTyped(k, v) { v = v.trim(); if (!v) return; if (isJunkTok(v)) { toast('A web link can’t be an aroma or flavor'); return; } var m = ALLWORDS.filter(function (w) { return w === v.toLowerCase(); })[0]; toggleWord(k, m || v, true); }
function grow(t) { if (!t.offsetParent) return; t.style.height = 'auto'; t.style.height = Math.max(44, t.scrollHeight + 2) + 'px'; }

/* ---- taps in the Taste view */
document.addEventListener('click', function (e) {
  var t = e.target;
  var c = t.closest('#taste .chips button');
  if (c) { var box = c.parentNode, k = box.getAttribute('data-k'), v = c.getAttribute('data-v');
    if (box.getAttribute('data-multi')) { var cur = String(rec[k] || '').split(/\s*,\s*/).filter(Boolean), i = cur.indexOf(v); if (i >= 0) cur.splice(i, 1); else cur.push(v);
      rec[k] = S[k] ? S[k].filter(function (x) { return cur.indexOf(x) >= 0; }).join(', ') : cur.join(', '); }
    else rec[k] = rec[k] === v ? '' : v;
    if (k === 'type') { var ok = rec.type === 'White' ? S.white : rec.type === 'Rosé' ? S.rose : rec.type === 'Red' ? S.red : []; if (ok.indexOf(rec.color) < 0) rec.color = ''; rerow('color'); }
    rerow(k); touch(); return; }
  var r = t.closest('#taste .rail button');
  if (r) { var k2 = r.parentNode.getAttribute('data-k'), v2 = r.getAttribute('data-v'); rec[k2] = rec[k2] === v2 ? '' : v2; rerow(k2); touch(); return; }
  var sw = t.closest('#taste .sw button');
  if (sw) { var v3 = sw.getAttribute('data-v'); rec.color = rec.color === v3 ? '' : v3; rerow('color'); touch(); return; }
  var op = t.closest('[data-open]');
  if (op) { var k4 = op.getAttribute('data-open'); OPENED[k4] = 1; rerow(k4); var f = document.querySelector('#f-' + k4 + ' [data-k]'); if (f) f.focus(); return; }
  var ut = t.closest('[data-untok]');
  if (ut) { toggleWord(ut.getAttribute('data-k'), ut.getAttribute('data-untok').replace(/[.;:]+$/, '')); return; }
  var aw = t.closest('[data-addw]');
  if (aw) { var kk = aw.getAttribute('data-k'); toggleWord(kk, aw.getAttribute('data-addw'), true); var inp = document.querySelector('[data-din="' + kk + '"]'); if (inp) { inp.value = ''; inp.focus(); } return; }
  var lx = t.closest('[data-lex]');
  if (lx) { openLx(lx.getAttribute('data-lex')); return; }
  if (t.closest('#sameNose')) { toggleSame(); return; }
  if (t.closest('#openBtn')) { rec.open = !rec.open; rerow('identity'); renderTaste(); touch(); return; }
  if (t.id === 'phOrphans') { openOrphans(); return; }
  if (t.id === 'phRemove') { ask('Remove the label photo from this wine?', 'Remove', 'Keep', true).then(function (go) { if (!go) return; Photos.remove(rec.id); delete THUMBS[rec.id]; rec.hasPhoto = false; rec.photoUrl = ''; $('phBox').innerHTML = photoBox(); touch(); }); return; }
  var im = t.closest('#phBox img'); if (im) { showPhoto(im.getAttribute('data-full')); return; }
});
/* identity row is rebuilt as a whole */
var _rerow = rerow;
rerow = function (k) { if (k === 'identity') { var st = $('st-4'); if (st) { var s = STAGES()[4]; var sb = st.querySelector('.sb'); if (sb) sb.innerHTML = identityHTML(); paintStages(); } return; } _rerow(k); };

/* ====================================================================== wine identity line and the Change sheet */
function dateNice(d) { if (!d) return 'No date'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function label() { var d = rec.date ? rec.date.split('-') : null; return (d ? (+d[1]) + '/' + (+d[2]) + '/' + d[0].slice(2) + ', ' : '') + 'Wine #' + (rec.wineNo || '?'); }
function paintId() {
  $('idWine').textContent = 'Wine ' + (rec.wineNo || '?');
  $('idSub').textContent = [dateNice(rec.date), rec.event].filter(Boolean).join(' · ');
  var st = $('state'); st.className = 'state' + (dirty ? ' dirty' : ''); st.textContent = dirty ? 'Unsaved' : orig ? 'Saved' : 'New'; $('saveBtn').classList.toggle('quiet', !dirty);
}
function touch(quiet) { dirty = true; paintId(); if (!quiet) paintStages(); clearTimeout(touch.t); touch.t = setTimeout(keepDraft, 300); }   // the draft is written once typing pauses
function keepDraft() { clearTimeout(touch.t); touch.t = 0; if (dirty) store(DRAFT_KEY, { rec: rec, orig: orig, t: Date.now() }); }
window.addEventListener('pagehide', keepDraft);
document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') keepDraft(); });
function clearDraft() { clearTimeout(touch.t); try { localStorage.removeItem(DRAFT_KEY); localStorage.removeItem('btn-entry-draft'); } catch (e) {} }
function today() { return S.today || new Date().toISOString().slice(0, 10); }
function nextNo(date) { var m = 0; WINES.forEach(function (w) { if (w.d === date) m = Math.max(m, w.n); }); return m + 1; }
function show(r, o, isDirty) { rec = r; orig = o; dirty = !!isDirty; OPENED = {}; PINNED = {}; FOLDED = {}; STAGES().forEach(function (st, i) { if (o && stageDone(st)) FOLDED[i] = 1; }); paintId(); renderTaste(); }
$('idChange').onclick = function () { $('cDate').value = rec.date || ''; $('cNo').textContent = rec.wineNo || 1; $('cEvent').value = rec.event || ''; $('openQ').value = ''; paintOpen(); sheet('changeSheet'); };
$('changeDone').onclick = function () { sheet('changeSheet', false); };
$('cDate').addEventListener('change', function () { rec.date = this.value; if (!orig) { rec.wineNo = nextNo(rec.date); $('cNo').textContent = rec.wineNo; } touch(); });
$('cEvent').addEventListener('input', function () { rec.event = this.value; touch(true); });
$('cUp').onclick = function () { rec.wineNo = (+rec.wineNo || 0) + 1; $('cNo').textContent = rec.wineNo; touch(); };
$('cDn').onclick = function () { rec.wineNo = Math.max(1, (+rec.wineNo || 1) - 1); $('cNo').textContent = rec.wineNo; touch(); };
$('cNew').onclick = function () { guard('Start a new wine?').then(function (go) { if (!go) return; var d = today(), ev = rec.date === d ? rec.event : ''; clearDraft(); show({ date: d, wineNo: nextNo(d), event: ev || '' }, null, false); sheet('changeSheet', false); window.scrollTo(0, 0); }); };
$('openQ').addEventListener('input', paintOpen);
function paintOpen() {
  var q = $('openQ').value.trim().toLowerCase(), h = '', last = '';
  ALL.filter(function (w) { return w.ymd && w.wineNo !== ''; }).sort(function (a, b) { return a.ymd < b.ymd ? 1 : a.ymd > b.ymd ? -1 : b.wineNo - a.wineNo; })
    .filter(function (w) { return !q || [w.producer, w.aGrape, w.gGrape, w.event, w.aRegion, w.dateLabel].join(' ').toLowerCase().indexOf(q) >= 0; })
    .forEach(function (w) {
      if (w.ymd !== last) { h += '<div class="od">' + esc(dateNice(w.ymd)) + (w.event ? ' · ' + esc(w.event) : '') + '</div>'; last = w.ymd; }
      h += '<button type="button" class="orow" data-d="' + w.ymd + '" data-n="' + w.wineNo + '"><b>Wine ' + esc(w.wineNo) + '</b><span>' + esc(w.producer || w.aGrape || (w.gGrape ? 'Guess: ' + w.gGrape : 'Not yet revealed')) + '</span></button>';
    });
  $('openList').innerHTML = h || '<p class="hint">' + (ALL.length ? 'No saved wines match.' : 'No saved wines yet.') + '</p>';
}
$('openList').addEventListener('click', function (e) {
  var b = e.target.closest('.orow'); if (!b) return;
  guard('Open another wine?').then(function (go) { if (!go) return; sheet('changeSheet', false); openWine(b.getAttribute('data-d'), +b.getAttribute('data-n')); });
});
function guard(q) { if (!dirty) return Promise.resolve(true); return ask('You have unsaved changes to ' + label() + '. ' + q + ' Those changes will be lost.', 'Discard changes', 'Keep editing', true); }
function openWine(d, n) {
  return api('appLoad', d, n).then(function (r) {
    if (!r) { toast('That wine was not found'); return; }
    clearDraft(); show(r, { date: r.date, wineNo: r.wineNo }, false); setView('taste'); window.scrollTo(0, 0); toast('Opened ' + label());
  }).catch(fail);
}
function save(force, next) {
  if (PHOTO_BUSY) { var bb = next ? $('nextBtn') : $('saveBtn'); bb.disabled = true; bb.textContent = 'Adding photo…'; var lbl = next ? 'Save & Next Wine' : 'Save';
    PHOTO_BUSY.then(function () { bb.disabled = false; bb.textContent = lbl; save(force, next); }); return; }   // wait for the photo, then save it with the wine
  if (!rec.date) { toast('Choose a date first'); return; }
  if (!rec.wineNo) { toast('Set the wine number'); return; }
  var b = next ? $('nextBtn') : $('saveBtn'), was = b.textContent; b.disabled = true; b.textContent = 'Saving…';
  api('appSave', rec, orig, force).then(function (r) {
    b.disabled = false; b.textContent = was;
    if (r.conflict) return ask(r.conflict + ' Replace it with this note?', 'Replace', 'Cancel').then(function (go) { if (go) save(true, next); });
    rec.id = r.id; setData(r.all); orig = { date: rec.date, wineNo: rec.wineNo }; dirty = false; clearDraft(); paintId();
    var sw = ALL.filter(function (x) { return x.id === r.id; })[0]; if (sw && window.findPrice) { findPrice(sw); findReviews(sw); }   // look up a retail price once the wine is revealed
    if (next) { var d = rec.date, ev = rec.event || '', saved = label(); show({ date: d, wineNo: nextNo(d), event: ev }, null, false); window.scrollTo(0, 0);
      if (!(window.saveMoment && saveMoment(sw, true, rec.wineNo))) toast('Saved ' + saved + ' · now Wine ' + rec.wineNo); }
    else if (!(window.saveMoment && saveMoment(sw, false))) toast('Saved ' + label());
  }).catch(function (err) { b.disabled = false; b.textContent = was; fail(err); });
}
$('saveBtn').onclick = function () { save(false); };
$('nextBtn').onclick = function () { save(false, true); };
window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ====================================================================== the Lexicon picker
   One scroll of aroma families with a sticky family bar (scroll-spy),
   search that finishes the job, and your picks pinned at the top. */
var LX = { k: 'aromas', q: '', more: {} };
function openLx(k) {
  LX.k = k; LX.q = ''; LX.more = {}; $('lxQ').value = '';
  paintLx(); $('lx').classList.add('show'); document.body.classList.add('locked'); $('lxBody').scrollTop = 0; lxSpy();
}
function closeLx() { $('lx').classList.remove('show'); document.body.classList.remove('locked'); }
$('lxDone').onclick = closeLx;
$('lx').addEventListener('click', function (e) { if (e.target === this) closeLx(); });
$('lxQ').addEventListener('input', function () { LX.q = this.value; paintLxBody(); });
$('lxQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var q = this.value.trim(); if (!q) return; addTyped(LX.k, q); this.value = ''; LX.q = ''; paintLx(); } });
function lxChip(w) { var on = hasWord(LX.k, w); return '<button type="button" class="lc' + (on ? ' on' : '') + '" data-w="' + esc(w) + '" aria-pressed="' + on + '">' + esc(wordLabel(w)) + '</button>'; }
function clusterHTML(c) {
  var n = c[3].filter(function (w) { return hasWord(LX.k, w); }).length;
  return '<div class="cl"><div class="cl-h"><img src="' + photoOfSlug(c[2]) + '" alt="" loading="lazy"><b>' + esc(c[0]) + '</b><span class="org">' + ORIGIN[c[1]] + '</span>' + (n ? '<small>' + n + '</small>' : '') + '</div><div class="lcs">' + c[3].map(lxChip).join('') + '</div></div>';
}
function famCount(f) { var n = 0, seen = {}; f.clusters.forEach(function (c) { c[3].forEach(function (w) { if (!seen[w] && hasWord(LX.k, w)) { seen[w] = 1; n++; } }); }); if (f.k === 'fruit') RIPENESS.forEach(function (w) { if (hasWord(LX.k, w)) n++; }); return n; }
function familyHTML(f) {
  var h = '<section class="lx-sec" id="lxs-' + f.k + '" data-f="' + f.k + '"><h3>' + esc(f.name) + '</h3>', cs = f.clusters;
  if (f.k === 'fruit') {
    h += '<div class="ripe"><span>Fruit character</span><div class="seg">' + RIPENESS.map(function (w) { return '<button type="button" class="opt' + (hasWord(LX.k, w) ? ' on' : '') + '" data-ripe="' + w + '">' + w.split(' ')[0] + '</button>'; }).join('') + '</div></div>';
    var lead = (LEAD[rec.type || ''] || LEAD['']).fruit;
    var first = cs.filter(function (c) { return lead.indexOf(c[0]) >= 0; }).sort(function (a, b) { return lead.indexOf(a[0]) - lead.indexOf(b[0]); });
    var rest = cs.filter(function (c) { return lead.indexOf(c[0]) < 0; });
    var restOpen = LX.more.fruit || rest.some(function (c) { return c[3].some(function (w) { return hasWord(LX.k, w); }); });
    h += first.map(clusterHTML).join('');
    if (rest.length) h += restOpen ? rest.map(clusterHTML).join('') : '<button type="button" class="more" data-more="fruit"><span>More fruit</span><small>' + rest.map(function (c) { return c[0].replace(/ fruit$/, ''); }).join(', ') + '</small><i>+</i></button>';
  } else h += cs.map(clusterHTML).join('');
  return h + '</section>';
}
function paintLx() {
  var k = LX.k, n = toks(k).length;
  $('lxTitle').textContent = k === 'flavors' ? 'Flavors' : 'Aromas';
  $('lxSub').textContent = [rec.type ? rec.type + ' wine' : '', n ? n + ' chosen' : 'Tap to choose'].filter(Boolean).join(' · ');
  $('lxPicks').innerHTML = n ? toks(k).map(function (t) { return tokHTML(t, k); }).join('') : '<span class="ph0">Your ' + (k === 'flavors' ? 'flavors' : 'aromas') + ' appear here</span>';
  $('lxSame').hidden = k !== 'flavors'; $('lxSame').textContent = toks('flavors').some(isSame) ? '✓ Same as the nose' : 'Same as the nose';
  $('lxTabs').innerHTML = LEXFAM.map(function (f) { var c = famCount(f); return '<button type="button" data-jump="' + f.k + '">' + esc(f.name) + (c ? '<b>' + c + '</b>' : '') + '</button>'; }).join('');
  paintLxBody();
}
function paintLxBody() {
  var k = LX.k, q = LX.q.trim().toLowerCase(), keep = $('lxBody').scrollTop;
  $('lx').classList.toggle('searching', !!q);
  if (q) {
    var hits = ALLWORDS.filter(function (w) { return w.indexOf(q) === 0 || w.indexOf(' ' + q) > 0 || w.indexOf('/' + q) > 0; });
    var exact = ALLWORDS.indexOf(q) >= 0;
    $('lxBody').innerHTML = '<section class="lx-sec srch">' + (hits.length ? '<div class="lcs">' + hits.slice(0, 30).map(function (w) { var h = WORDHOME[w]; return '<button type="button" class="lc' + (hasWord(k, w) ? ' on' : '') + '" data-w="' + esc(h.w) + '">' + esc(wordLabel(w)) + '<small>' + esc(h.c) + '</small></button>'; }).join('') + '</div>' : '<p class="none">Not in the WSET Lexicon.</p>') +
      (exact ? '' : '<button type="button" class="addown" data-own="' + esc(LX.q.trim()) + '"><i>+</i>Add “' + esc(LX.q.trim()) + '” in your own words</button>') + '</section>';
    return;
  }
  $('lxBody').innerHTML =
    LEXFAM.map(familyHTML).join('') + '<div class="lx-end"></div>';
  $('lxBody').scrollTop = keep; lxSpy();
}
function lxSpy() {
  var body = $('lxBody'), top = body.getBoundingClientRect().top + 8, cur = 'fruit';
  $$('#lxBody .lx-sec[data-f]').forEach(function (s) { if (s.getBoundingClientRect().top <= top + 40) cur = s.getAttribute('data-f'); });
  $$('#lxTabs button').forEach(function (b) { var on = b.getAttribute('data-jump') === cur; b.classList.toggle('on', on); if (on && b.scrollIntoView && !lxSpy.lock) { var p = b.parentNode; if (p.scrollWidth > p.clientWidth) p.scrollTo({ left: b.offsetLeft - 16, behavior: 'smooth' }); } });
}
$('lxBody').addEventListener('scroll', function () { if (!lxSpy.t) lxSpy.t = requestAnimationFrame(function () { lxSpy.t = 0; lxSpy(); }); }, { passive: true });
$('lx').addEventListener('click', function (e) {
  var t = e.target;
  var j = t.closest('[data-jump]'); if (j) { var s = $('lxs-' + j.getAttribute('data-jump')); if (s) { $('lxBody').scrollTo({ top: s.offsetTop - 4, behavior: 'smooth' }); } return; }
  var w = t.closest('.lc[data-w]'); if (w) { toggleWord(LX.k, w.getAttribute('data-w')); if (LX.q) { LX.q = ''; $('lxQ').value = ''; paintLx(); } return; }
  var rp = t.closest('[data-ripe]'); if (rp) { var v = rp.getAttribute('data-ripe'), had = hasWord(LX.k, v);
    RIPENESS.forEach(function (x) { if (hasWord(LX.k, x)) rec[LX.k] = toks(LX.k).filter(function (y) { return y.toLowerCase() !== x.toLowerCase(); }).join(', '); });
    if (!had) rec[LX.k] = toks(LX.k).concat([v.toLowerCase()]).join(', '); touch(); repaintDesc(LX.k); return; }
  var mo = t.closest('[data-more]'); if (mo) { LX.more[mo.getAttribute('data-more')] = 1; paintLxBody(); return; }
  var own = t.closest('[data-own]'); if (own) { addTyped(LX.k, own.getAttribute('data-own')); LX.q = ''; $('lxQ').value = ''; paintLx(); return; }
  if (t.closest('#lxSame')) { toggleSame(); return; }
});

/* taps on a stage header fold or open it; working in a stage folds the finished ones above */
document.addEventListener('click', function (e) {
  var sh = e.target.closest('#taste .sh'); if (!sh) return;
  var st = sh.parentNode, i = +st.getAttribute('data-i');
  if (st.classList.contains('folded')) setFold(i, false); else if (st.classList.contains('done')) setFold(i, true);
});
document.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('#taste .sh')) { e.preventDefault(); e.target.click(); } });
['click', 'focusin'].forEach(function (ev) {
  document.addEventListener(ev, function (e) {
    var st = e.target.closest && e.target.closest('#taste .stage'); if (!st || e.target.closest('.sh')) return;
    foldAbove(+st.getAttribute('data-i'), e.target);
  }, true);
});
/*build*/(window.__V = window.__V || {})['app'] = 'v2.50';
