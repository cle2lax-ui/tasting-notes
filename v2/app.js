/* Blind Tasting Notes 2.0 — Taste view, Lexicon sheet, shared helpers. Data layer: logic.js, store.js, google.js. */
var VERSION_LABEL = 'v2.0 preview';
var S = {}, ALL = [], WINES = [], LISTS = {};
var rec = {}, orig = null, dirty = false, view = 'taste';
var DRAFT_KEY = 'btn2-draft', NB_KEY = 'btn2-notebook', GUIDE_KEY = 'btn2-guide';
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
var SHORTR = { 'Medium(-)': 'M−', 'Medium(+)': 'M+', 'Medium': 'Med', 'Pronounced': 'Pron.', 'Medium-Dry': 'M-dry', 'Medium-Sweet': 'M-sweet',
  'Off-Dry': 'Off-dry', 'Luscious': 'Lusc.', 'Acceptable': 'Accept.', 'Very Good': 'V. good', 'Outstanding': 'Outst.' };
var NICE = { 'Hazy (Faulty?)': 'Hazy', 'Unclean (Faulty?)': 'Unclean', 'Medium(-)': 'Medium (−)', 'Medium(+)': 'Medium (+)', 'Not Suitable': 'Not suitable' };

function $(id) { return document.getElementById(id); }
function $$(s, el) { return [].slice.call((el || document).querySelectorAll(s)); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function api(fn) { var a = [].slice.call(arguments, 1); try { return Promise.resolve(API[fn].apply(null, a)); } catch (e) { return Promise.reject(e); } }
function store(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function recall(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
function nice(v) { return NICE[v] || v; }
function low(v) { return String(v || '').trim().toLowerCase(); }
function toast(t) { var e = $('toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(function () { e.classList.remove('show'); }, 2600); }
function ask(msg, yes, no) {
  return new Promise(function (res) {
    $('mMsg').textContent = msg; $('mYes').textContent = yes || 'OK'; $('mNo').textContent = no || 'Cancel'; $('modal').classList.add('show');
    $('mYes').onclick = function () { $('modal').classList.remove('show'); res(true); };
    $('mNo').onclick = function () { $('modal').classList.remove('show'); res(false); };
  });
}
function fail(err) { toast('Something went wrong: ' + (err && err.message ? err.message : err)); }
function sheet(id, on) { $(id).classList.toggle('show', on !== false); document.body.classList.toggle('locked', !!document.querySelector('.sheet.show, .lx.show, .welcome.show')); }

/* ====================================================================== Taste: structure */
function STAGES() { return [
  { t: 'Appearance', need: ['clarity', 'appInt', 'type', 'color'], sum: function () { return [nice(rec.clarity), [rec.appInt, rec.color].filter(Boolean).join(' ').toLowerCase()].filter(Boolean).join(' · '); },
    rows: [['chips', 'clarity', 'Clarity', S.clarity], ['rail', 'appInt', 'Intensity', S.appInt], ['chips', 'type', 'Wine type', S.type], ['color'],
      ['comment', 'appNotes', 'Add an appearance note', 'Legs, deposit, rim, bubbles…']] },
  { t: 'Nose', need: ['condition', 'noseInt', 'development', 'aromas'], sum: function () { var n = toks('aromas').length; return [nice(rec.noseInt), rec.development, n ? n + ' aromas' : ''].filter(Boolean).join(' · '); },
    rows: [['chips', 'condition', 'Condition', S.condition], ['rail', 'noseInt', 'Intensity', S.intensity], ['chips', 'development', 'Development', S.development],
      ['desc', 'aromas', 'Aromas'], ['comment', 'noseNotes', 'Add a nose comment', 'How it changes in the glass, what stands out…']] },
  { t: 'Palate', need: ['sweetness', 'acidity', 'tannin', 'alcohol', 'body', 'flavInt', 'finish', 'flavors'], sum: function () { return [rec.sweetness, rec.acidity && 'acid ' + nice(rec.acidity).toLowerCase(), rec.finish && nice(rec.finish).toLowerCase() + ' finish'].filter(Boolean).join(' · '); },
    rows: [['rail', 'sweetness', 'Sweetness', S.sweetness], ['rail', 'acidity', 'Acidity', S.five], ['rail', 'tannin', 'Tannin', S.five],
      ['comment', 'tanNature', 'Describe the tannin', 'Ripe, fine-grained, grippy, green…', 1], ['rail', 'alcohol', 'Alcohol', S.alcohol], ['rail', 'body', 'Body', S.body],
      ['rail', 'flavInt', 'Flavor intensity', S.intensity], ['rail', 'finish', 'Finish', S.finish], ['desc', 'flavors', 'Flavors'],
      ['comment', 'palate', 'Add a palate note', 'Texture, pétillance, residual sugar…']] },
  { t: 'Conclusions', need: ['quality', 'aging'], sum: function () { return [rec.quality, rec.aging && (rec.aging === 'Suitable' ? 'for aging' : 'drink now')].filter(Boolean).join(' · '); },
    rows: [['rail', 'quality', 'Quality', S.quality], ['chips', 'blic', 'Why', S.blic, 1], ['comment', 'qReason', 'Add your reasoning', 'Balance, length, intensity, complexity…'],
      ['chips', 'aging', 'Bottle aging', S.aging], ['comment', 'aReason', 'Add aging reasoning', 'Structure, fruit, development…']] },
  { t: 'Identity', need: [], sum: function () { var s = score(); return rec.open ? 'Tasted open' : [rec.gGrape, s ? s.hits + ' of 4' : ''].filter(Boolean).join(' · '); }, rows: [['identity']] }
]; }
function stageDone(st) {
  if (st.t === 'Identity') return !!(rec.open ? rec.aGrape || rec.producer : rec.gGrape);
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
      list.map(function (v, j) { return '<button type="button" class="' + (j === i ? 'on' : j < i ? 'f1' : '') + '" data-v="' + esc(v) + '" aria-label="' + esc(nice(v)) + '"><em>' + esc(SHORTR[v] || v) + '</em></button>'; }).join('') + '</div></div>';
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
    h += '<section class="stage" id="st-' + i + '" data-i="' + i + '"><div class="sh"><h2>' + st.t + '</h2><small id="sum-' + i + '">' +
      esc(done ? st.sum() : st.need.length ? n + ' of ' + st.need.length : '') + '</small></div>' + st.rows.map(rowHTML).join('') + '</section>';
  });
  $('taste').innerHTML = h;
  $$('#taste textarea').forEach(grow);
  paintStages(); paintScore();
}
function rerow(k) {
  var el = $('f-' + k); if (!el) return;
  STAGES().forEach(function (st) { st.rows.forEach(function (r) { if (r[1] === k || (k === 'color' && r[0] === 'color')) el.outerHTML = rowHTML(r); }); });
}
function paintStages() {
  STAGES().forEach(function (st, i) {
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
}
window.addEventListener('scroll', function () { if (view === 'taste') spy(); }, { passive: true });
$('stages').addEventListener('click', function (e) {
  var b = e.target.closest('button'); if (!b) return;
  var s = $('st-' + b.getAttribute('data-s')), y = s.getBoundingClientRect().top + window.scrollY - $('stages').getBoundingClientRect().bottom + 1;
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
    var st = !open && s && s.per[i] !== null && low(rec[r[1]]) ? (s.per[i] ? ' hit' : ' miss') : '';
    h += '<span class="l">' + r[0] + '</span>' + (open ? '' : '<input type="text" data-k="' + r[1] + '" class="g' + st + '" value="' + esc(rec[r[1]]) + '"' + (r[3] ? ' list="dl-' + r[3] + '"' : ' inputmode="numeric"') + ' autocomplete="off" autocapitalize="words">') +
      '<input type="text" data-k="' + r[2] + '" value="' + esc(rec[r[2]]) + '"' + (r[3] ? ' list="dl-' + r[3] + '"' : ' inputmode="numeric"') + ' autocomplete="off" autocapitalize="words">';
  });
  h += '</div><div class="f full"><label>Producer and wine</label><input type="text" data-k="producer" value="' + esc(rec.producer) + '" placeholder="' + (open ? 'Producer and wine' : 'After the reveal') + '" autocapitalize="words"></div>';
  h += '<div class="f" id="f-photo"><label>Label photo</label><div class="phbox" id="phBox">' + photoBox() + '</div></div>';
  h += '<div class="scoreline">' + (open ? '<span>Tasted open · not scored</span>' : '<span>Score</span><b id="score">' + (s ? s.hits + '<small>/4</small>' : '–') + '</b>') + '</div>';
  return h;
}
function score() {
  if (rec.open) return null;
  var pairs = [['gGrape', 'aGrape'], ['gCountry', 'aCountry'], ['gRegion', 'aRegion'], ['gVintage', 'aVintage']], of = 0, hits = 0, per = [];
  pairs.forEach(function (p) { if (!low(rec[p[1]])) { per.push(null); return; } of++; var h = low(rec[p[0]]) === low(rec[p[1]]); if (h) hits++; per.push(h); });
  return of ? { hits: hits, per: per } : null;
}
function paintScore() {
  var s = score(), el = $('score'); if (el) el.innerHTML = s ? s.hits + '<small>/4</small>' : '–';
  ['gGrape', 'gCountry', 'gRegion', 'gVintage'].forEach(function (k, i) {
    var e = document.querySelector('input[data-k="' + k + '"]'); if (!e) return;
    e.classList.remove('hit', 'miss'); if (s && s.per[i] !== null && low(rec[k])) e.classList.add(s.per[i] ? 'hit' : 'miss');
  });
}
function photoBox() {
  var u = rec.id && THUMBS[rec.id];
  if (rec.hasPhoto && rec.id && !u) Photos.urls(rec.id).then(function (x) { if (x) { THUMBS[rec.id] = x; var b = $('phBox'); if (b) b.innerHTML = photoBox(); } });
  return (u && rec.hasPhoto ? '<img src="' + u.thumb + '" data-full="' + u.full + '" alt="Label">' : '') +
    '<label class="lnk">' + (rec.hasPhoto ? 'Replace' : 'Add photo') + '<input type="file" accept="image/*" id="phInput"></label>' +
    (rec.hasPhoto ? '<button type="button" class="lnk" id="phRemove">Remove</button>' : '');
}
document.addEventListener('change', function (e) {
  if (e.target.id !== 'phInput' || !e.target.files || !e.target.files[0]) return;
  if (!rec.id) rec.id = uid();
  toast('Adding photo…');
  Photos.add(rec.id, e.target.files[0]).then(function () { delete THUMBS[rec.id]; rec.hasPhoto = true; rec.photoUrl = ''; touch(); return Photos.urls(rec.id); })
    .then(function (x) { THUMBS[rec.id] = x; $('phBox').innerHTML = photoBox(); toast('Photo added. Tap Save to keep it'); })
    .catch(function (err) { toast(err.message || 'Could not add that photo'); });
});
function showPhoto(url) { $('lbImg').src = url; $('lightbox').classList.add('show'); }
$('lightbox').onclick = function () { this.classList.remove('show'); };

/* ---- descriptors (aromas / flavors) */
function toks(k) { return String(rec[k] || '').split(/\s*,\s*/).map(function (t) { return t.trim(); }).filter(Boolean); }
function hasWord(k, w) { var lw = w.toLowerCase(); return toks(k).some(function (t) { return t.toLowerCase().replace(/[.;:]+$/, '') === lw; }); }
function toggleWord(k, w, force) {
  var lw = w.toLowerCase();
  if (hasWord(k, w) && force !== true) rec[k] = toks(k).filter(function (t) { return t.toLowerCase().replace(/[.;:]+$/, '') !== lw; }).join(', ');
  else if (!hasWord(k, w)) rec[k] = toks(k).concat([lw]).join(', ');
  touch(); repaintDesc(k);
}
function tokHTML(t, k) {
  var f = famOf(t.replace(/[.;:]+$/, ''));
  return '<span class="tok' + (f ? ' f-' + f : ' own') + '">' + esc(t) + '<button type="button" data-untok="' + esc(t) + '" data-k="' + k + '" aria-label="Remove ' + esc(t) + '">×</button></span>';
}
function descHTML(k, label) {
  var t = toks(k);
  return '<div class="f full" id="f-' + k + '"><label>' + label + '</label><div class="desc" data-k="' + k + '"><div class="tks">' + t.map(function (x) { return tokHTML(x, k); }).join('') +
    '<input type="text" class="din" data-din="' + k + '" placeholder="' + (t.length ? 'Add another' : k === 'flavors' ? 'Type a flavor' : 'Type an aroma') + '" autocomplete="off" autocapitalize="none" enterkeyhint="done"></div>' +
    '<div class="sug" id="sug-' + k + '"></div>' +
    '<div class="dft"><button type="button" class="lnk" data-lex="' + k + '">Open the Lexicon</button>' +
    (k === 'flavors' ? '<button type="button" class="lnk" id="sameNose">Same as the nose</button>' : '') + '<small>' + (t.length ? t.length + (k === 'flavors' ? ' flavors' : ' aromas') : '') + '</small></div></div></div>';
}
function repaintDesc(k) {
  var el = $('f-' + k); if (el) { var had = document.activeElement && document.activeElement.getAttribute('data-din') === k; el.outerHTML = descHTML(k, k === 'flavors' ? 'Flavors' : 'Aromas'); if (had) document.querySelector('[data-din="' + k + '"]').focus(); }
  paintStages(); if ($('lx').classList.contains('show')) paintLx();
}
var ALLWORDS = (function () { var a = {}; Object.keys(WORDHOME).forEach(function (w) { a[w] = 1; }); return Object.keys(a); })();
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
  rec[k] = e.target.value; if (e.target.tagName === 'TEXTAREA') grow(e.target);
  if (/^[ga](Grape|Country|Region|Vintage)$/.test(k)) paintScore();
  if (k === 'producer' || /^[ga]Grape$/.test(k)) paintStages();
  touch(true);
});
document.addEventListener('keydown', function (e) {
  var din = e.target.getAttribute && e.target.getAttribute('data-din');
  if (din && e.key === 'Enter') { e.preventDefault(); if (e.target.value.trim()) { addTyped(din, e.target.value); } }
  if (din && e.key === 'Backspace' && !e.target.value) { var t = toks(din); if (t.length) toggleWord(din, t[t.length - 1].replace(/[.;:]+$/, '')); }
});
function addTyped(k, v) { v = v.trim(); if (!v) return; var m = ALLWORDS.filter(function (w) { return w === v.toLowerCase(); })[0]; toggleWord(k, m || v, true); }
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
  if (t.id === 'sameNose') { var a = toks('aromas'); if (!a.length) { toast('Add your aromas first'); return; } a.forEach(function (w) { if (!hasWord('flavors', w)) rec.flavors = toks('flavors').concat([w]).join(', '); }); touch(); repaintDesc('flavors'); return; }
  if (t.closest('#openBtn')) { rec.open = !rec.open; rerow('identity'); renderTaste(); touch(); return; }
  if (t.id === 'phRemove') { ask('Remove the label photo from this wine?', 'Remove', 'Keep').then(function (go) { if (!go) return; Photos.remove(rec.id); delete THUMBS[rec.id]; rec.hasPhoto = false; rec.photoUrl = ''; $('phBox').innerHTML = photoBox(); touch(); }); return; }
  var im = t.closest('#phBox img'); if (im) { showPhoto(im.getAttribute('data-full')); return; }
});
/* identity row is rebuilt as a whole */
var _rerow = rerow;
rerow = function (k) { if (k === 'identity') { var st = $('st-4'); if (st) { var s = STAGES()[4]; st.innerHTML = '<div class="sh"><h2>Identity</h2><small id="sum-4"></small></div>' + identityHTML(); paintStages(); } return; } _rerow(k); };

/* ====================================================================== wine identity line and the Change sheet */
function dateNice(d) { if (!d) return 'No date'; return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
function label() { var d = rec.date ? rec.date.split('-') : null; return (d ? (+d[1]) + '/' + (+d[2]) + '/' + d[0].slice(2) + ', ' : '') + 'Wine #' + (rec.wineNo || '?'); }
function paintId() {
  $('idWine').textContent = 'Wine ' + (rec.wineNo || '?');
  $('idSub').textContent = [dateNice(rec.date), rec.event].filter(Boolean).join(' · ');
  var st = $('state'); st.className = 'state' + (dirty ? ' dirty' : ''); st.textContent = dirty ? 'Unsaved' : orig ? 'Saved' : 'New';
}
function touch(quiet) { dirty = true; paintId(); if (!quiet) paintStages(); store(DRAFT_KEY, { rec: rec, orig: orig, t: Date.now() }); }
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} }
function today() { return S.today || new Date().toISOString().slice(0, 10); }
function nextNo(date) { var m = 0; WINES.forEach(function (w) { if (w.d === date) m = Math.max(m, w.n); }); return m + 1; }
function show(r, o, isDirty) { rec = r; orig = o; dirty = !!isDirty; OPENED = {}; paintId(); renderTaste(); }
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
function guard(q) { if (!dirty) return Promise.resolve(true); return ask('You have unsaved changes to ' + label() + '. ' + q + ' Those changes will be lost.', 'Discard changes', 'Keep editing'); }
function openWine(d, n) {
  return api('appLoad', d, n).then(function (r) {
    if (!r) { toast('That wine was not found'); return; }
    clearDraft(); show(r, { date: r.date, wineNo: r.wineNo }, false); setView('taste'); window.scrollTo(0, 0); toast('Opened ' + label());
  }).catch(fail);
}
function save(force, next) {
  if (!rec.date) { toast('Choose a date first'); return; }
  if (!rec.wineNo) { toast('Set the wine number'); return; }
  var b = next ? $('nextBtn') : $('saveBtn'), was = b.textContent; b.disabled = true; b.textContent = 'Saving…';
  api('appSave', rec, orig, force).then(function (r) {
    b.disabled = false; b.textContent = was;
    if (r.conflict) return ask(r.conflict + ' Replace it with this note?', 'Replace', 'Cancel').then(function (go) { if (go) save(true, next); });
    rec.id = r.id; setData(r.all); orig = { date: rec.date, wineNo: rec.wineNo }; dirty = false; clearDraft(); paintId();
    if (next) { var d = rec.date, ev = rec.event || '', saved = label(); show({ date: d, wineNo: nextNo(d), event: ev }, null, false); window.scrollTo(0, 0); toast('Saved ' + saved + ' · now Wine ' + rec.wineNo); }
    else toast('Saved ' + label());
  }).catch(function (err) { b.disabled = false; b.textContent = was; fail(err); });
}
$('saveBtn').onclick = function () { save(false); };
$('nextBtn').onclick = function () { save(false, true); };
window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ====================================================================== the Lexicon sheet (Aroma Compass) */
var LX = { k: 'aromas', mode: 'wheel', fam: 'fruit', q: '', more: {}, step: 0 };
function lxCounts() { return cellCounts(rec[LX.k]); }
function openLx(k) {
  LX.k = k; LX.q = ''; LX.more = {}; $('lxQ').value = '';
  var wide = window.matchMedia('(min-width: 900px)').matches;
  LX.mode = recall(GUIDE_KEY) ? 'guide' : recall('btn2-lxview') === 'list' ? 'list' : wide ? 'family' : 'wheel'; LX.step = 0;
  if (LX.mode === 'guide') LX.fam = FAMS[0].k; else LX.fam = 'fruit';
  paintLx(); $('lx').classList.add('show'); document.body.classList.add('locked'); $('lxBody').scrollTop = 0;
}
$('lxDone').onclick = function () { $('lx').classList.remove('show'); document.body.classList.remove('locked'); };
$('lxQ').addEventListener('input', function () { LX.q = this.value; paintLx(); });
$('lxQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var q = this.value.trim(); if (!q) return; addTyped(LX.k, q); this.value = ''; LX.q = ''; paintLx(); } });
function lxChip(w) { var on = hasWord(LX.k, w); return '<button type="button" class="lc' + (on ? ' on' : '') + '" data-w="' + esc(w) + '">' + esc(wordLabel(w)) + '</button>'; }
function clusterHTML(c) {
  var n = c[4].filter(function (w) { return hasWord(LX.k, w); }).length;
  return '<div class="cl"><div class="cl-h"><img src="' + photoOfSlug(c[3]) + '" alt=""><b>' + esc(c[2]) + '</b>' + (n ? '<small>' + n + '</small>' : '') + '</div><div class="lcs">' + c[4].map(lxChip).join('') + '</div></div>';
}
function tierHead(t, note) {
  return '<div class="tier"><span class="ri">' + ['p', 's', 't'].map(function (x) { return '<i class="' + (x === t ? 'on' : '') + '"></i>'; }).join('') + '</span><b>' + TIERS[t] + '</b>' + (note ? '<small>' + note + '</small>' : '') + '</div>';
}
function familyHTML(fk) {
  var lk = likely(rec.type), h = '';
  ['p', 's', 't'].forEach(function (t) {
    var cs = CLUSTERS.filter(function (c) { return c[0] === fk && c[1] === t; }); if (!cs.length && !(fk === 'fruit' && t === 'p')) return;
    h += tierHead(t);
    if (fk === 'fruit' && t === 'p') {
      h += '<div class="ripe"><span>Fruit character</span><div>' + RIPENESS.map(function (w) { return '<button type="button" class="' + (hasWord(LX.k, w) ? 'on' : '') + '" data-ripe="' + w + '">' + w.split(' ')[0] + '</button>'; }).join('') + '</div></div>';
      var lead = cs.filter(function (c) { return lk.fruit.indexOf(c[2]) >= 0; }), rest = cs.filter(function (c) { return lk.fruit.indexOf(c[2]) < 0; });
      lead.sort(function (a, b) { return lk.fruit.indexOf(a[2]) - lk.fruit.indexOf(b[2]); });
      h += lead.map(clusterHTML).join('');
      var restPicked = rest.some(function (c) { return c[4].some(function (w) { return hasWord(LX.k, w); }); });
      if (rest.length) h += LX.more.fruit || restPicked ? rest.map(clusterHTML).join('') : '<button type="button" class="more" data-more="fruit">' + rest.map(function (c) { return c[2].replace(' fruit', ''); }).join(', ').replace(/^./, function (x) { return x.toUpperCase(); }) + '<span>›</span></button>';
    } else h += cs.map(clusterHTML).join('');
  });
  return h;
}
function famIndex(k) { for (var i = 0; i < FAMS.length; i++) if (FAMS[i].k === k) return i; return 0; }
function paintLx() {
  var k = LX.k, n = toks(k).length, lk = likely(rec.type), counts = lxCounts(), q = LX.q.trim().toLowerCase();
  $('lxTitle').textContent = k === 'flavors' ? 'Flavors' : 'Aromas';
  $('lxSub').textContent = [rec.type ? rec.type + ' wine' : '', n ? n + ' chosen' : 'Nothing chosen yet'].filter(Boolean).join(' · ');
  $('lxPicks').innerHTML = toks(k).map(function (t) { return tokHTML(t, k); }).join('');
  $('lxSame').hidden = k !== 'flavors';
  $$('#lxModes button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === (LX.mode === 'family' ? 'wheel' : LX.mode)); });
  var wide = window.matchMedia('(min-width: 900px)').matches, body = '', left = '';
  var hub = [n, k === 'flavors' ? 'flavors' : 'aromas'];
  if (q) {
    var hits = ALLWORDS.filter(function (w) { return w.indexOf(q) >= 0; }).slice(0, 24);
    body = '<div class="lx-sec"><div class="tier"><b>' + (hits.length ? 'Matches' : 'No match in the Lexicon') + '</b></div><div class="lcs">' +
      hits.map(function (w) { var h0 = WORDHOME[w][0]; return '<button type="button" class="lc srch' + (hasWord(k, w) ? ' on' : '') + '" data-w="' + esc(w) + '"><i class="dot f-' + h0.f + '"></i>' + esc(wordLabel(w)) + '<small>' + esc(h0.c) + '</small></button>'; }).join('') +
      '</div>' + (ALLWORDS.indexOf(q) < 0 ? '<button type="button" class="addown" data-own="' + esc(LX.q.trim()) + '">Add “' + esc(LX.q.trim()) + '” as your own</button>' : '') + '</div>';
  } else if (LX.mode === 'guide') {
    var f = FAMS[LX.step];
    body = '<div class="gm"><div class="gm-dots">' + FAMS.map(function (x, i) { return '<i class="' + (i < LX.step ? 'd' : i === LX.step ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<div class="gm-wheel">' + wheelSVG(counts, { dim: lk.dim, focus: f.k, labels: false, cls: 'sm' }) + '</div>' +
      '<div class="gm-q"><span class="k f-' + f.k + '">Step ' + (LX.step + 1) + ' of 8 · ' + esc(f.name) + '</span><h3>' + esc(f.q) + '</h3><p>' + esc(f.hint) + '</p></div>' +
      familyHTML(f.k) + '<div class="gm-bar"><button type="button" class="btn" data-gstep="back"' + (LX.step ? '' : ' disabled') + '>Back</button>' +
      '<button type="button" class="btn" data-gstep="skip">Nothing here</button><button type="button" class="btn pri" data-gstep="next">' + (LX.step < 7 ? 'Next: ' + esc(FAMS[LX.step + 1].name) : 'Finish') + '</button></div></div>';
  } else if (LX.mode === 'list') {
    body = FAMS.map(function (f) { return '<div class="lx-sec' + (lk.dim.indexOf(f.k) >= 0 ? ' dimmed' : '') + '"><div class="fam-h"><h3>' + esc(f.name) + '</h3></div>' + familyHTML(f.k) + '</div>'; }).join('');
  } else if (LX.mode === 'wheel' && !wide) {
    body = '<div class="cx-wrap">' + wheelSVG(counts, { dim: lk.dim, hub: hub, tap: true, uid: 'lxw' }) + '</div>' + legendHTML() + '<p class="lx-tip">Tap a family to open it.</p>';
  } else {
    var fi = famIndex(LX.fam), ff = FAMS[fi];
    var top = '<div class="fam-top">' + (wide ? '' : '<button type="button" class="mini" data-mode="wheel" aria-label="Back to the compass">' + wheelSVG(counts, { dim: lk.dim, focus: ff.k, labels: false, cls: 'sm' }) + '</button>') +
      '<div class="ft"><span class="k">' + (fi + 1) + ' of 8</span><h3>' + esc(ff.name) + '</h3></div>' +
      '<div class="nav"><button type="button" data-famstep="-1" aria-label="Previous family">‹</button><button type="button" data-famstep="1" aria-label="Next family">›</button></div></div>';
    body = top + familyHTML(ff.k);
    if (wide) left = '<div class="cx-wrap">' + wheelSVG(counts, { dim: lk.dim, focus: ff.k, hub: hub, tap: true, uid: 'lxw' }) + '</div>' + legendHTML();
  }
  $('lxLeft').innerHTML = left; $('lxLeft').hidden = !left;
  $('lxBody').innerHTML = body;
}
function legendHTML() { return '<div class="cx-legend"><span><i class="lg p"></i>Center: from the grape</span><span><i class="lg s"></i>Middle: from winemaking</span><span><i class="lg t"></i>Rim: from age</span></div>'; }
$('lx').addEventListener('click', function (e) {
  var t = e.target;
  var fam = t.closest('[data-fam]'); if (fam) { LX.fam = fam.getAttribute('data-fam'); if (LX.mode !== 'guide') LX.mode = 'family'; paintLx(); $('lxBody').scrollTop = 0; return; }
  var w = t.closest('.lc[data-w]'); if (w) { toggleWord(LX.k, w.getAttribute('data-w')); return; }
  var rp = t.closest('[data-ripe]'); if (rp) { var v = rp.getAttribute('data-ripe'), had = hasWord(LX.k, v);
    RIPENESS.forEach(function (x) { if (hasWord(LX.k, x)) rec[LX.k] = toks(LX.k).filter(function (y) { return y.toLowerCase() !== x.toLowerCase(); }).join(', '); });
    if (!had) rec[LX.k] = toks(LX.k).concat([v.toLowerCase()]).join(', '); touch(); repaintDesc(LX.k); return; }
  var mo = t.closest('[data-more]'); if (mo) { LX.more[mo.getAttribute('data-more')] = 1; paintLx(); return; }
  var m = t.closest('[data-mode]'); if (m) { var md = m.getAttribute('data-mode'); LX.mode = md === 'wheel' && window.matchMedia('(min-width: 900px)').matches ? 'family' : md; LX.step = 0;
    if (md === 'list' || md === 'wheel') store('btn2-lxview', md); LX.q = ''; $('lxQ').value = ''; paintLx(); $('lxBody').scrollTop = 0; return; }
  var fs = t.closest('[data-famstep]'); if (fs) { var i = (famIndex(LX.fam) + +fs.getAttribute('data-famstep') + 8) % 8; LX.fam = FAMS[i].k; paintLx(); $('lxBody').scrollTop = 0; return; }
  var gs = t.closest('[data-gstep]'); if (gs) { var a = gs.getAttribute('data-gstep');
    if (a === 'back') LX.step = Math.max(0, LX.step - 1); else if (LX.step < 7) LX.step++; else { LX.mode = window.matchMedia('(min-width: 900px)').matches ? 'family' : 'wheel'; LX.fam = 'fruit'; toast('Done. Here is your compass'); }
    paintLx(); $('lxBody').scrollTop = 0; return; }
  var own = t.closest('[data-own]'); if (own) { addTyped(LX.k, own.getAttribute('data-own')); LX.q = ''; $('lxQ').value = ''; paintLx(); return; }
  if (t.id === 'lxSame') { $('sameNose') ? $('sameNose').click() : null; if (!$('sameNose')) { var a2 = toks('aromas'); a2.forEach(function (x) { if (!hasWord('flavors', x)) rec.flavors = toks('flavors').concat([x]).join(', '); }); touch(); repaintDesc('flavors'); } return; }
});
/* swipe between families on a phone */
(function () { var x0 = null, y0 = null;
  $('lxBody').addEventListener('touchstart', function (e) { if (LX.mode !== 'family') return; x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  $('lxBody').addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) { LX.fam = FAMS[(famIndex(LX.fam) + (dx < 0 ? 1 : -1) + 8) % 8].k; paintLx(); } }, { passive: true });
})();
