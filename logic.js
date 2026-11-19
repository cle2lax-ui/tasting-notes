/* Blind Tasting Notes — shared tasting logic (generated from the Google edition; keep the two in step). */
"use strict";
const L = {
  clarity: ['Clear', 'Hazy (Faulty?)'],
  appInt: ['Pale', 'Medium', 'Deep'],
  type: ['White', 'Rosé', 'Red'],
  white: ['Lemon-Green', 'Lemon', 'Gold', 'Amber', 'Brown'],
  rose: ['Pink', 'Pink-Orange', 'Orange'],
  red: ['Purple', 'Ruby', 'Garnet', 'Tawny', 'Brown'],
  condition: ['Clean', 'Unclean (Faulty?)'],
  intensity: ['Light', 'Medium(-)', 'Medium', 'Medium(+)', 'Pronounced'],
  development: ['Youthful', 'Developing', 'Fully Developed'],
  sweetness: ['Dry', 'Off-Dry', 'Medium-Dry', 'Medium-Sweet', 'Sweet', 'Luscious'],
  five: ['Low', 'Medium(-)', 'Medium', 'Medium(+)', 'High'],
  alcohol: ['Low', 'Medium', 'High'],
  body: ['Light', 'Medium(-)', 'Medium', 'Medium(+)', 'Full'],
  finish: ['Short', 'Medium(-)', 'Medium', 'Medium(+)', 'Long'],
  quality: ['Faulty', 'Poor', 'Acceptable', 'Good', 'Very Good', 'Outstanding'],
  aging: ['Suitable', 'Not Suitable'],
  blic: ['Balance', 'Length', 'Intensity', 'Complexity'],
};
L.colorAll = ['Lemon-Green', 'Lemon', 'Gold', 'Amber', 'Pink', 'Pink-Orange', 'Orange',
              'Purple', 'Ruby', 'Garnet', 'Tawny', 'Brown'];

// ---------------------------------------------------------------- Form questions = Tasting Log columns
// key, title (becomes the column header), kind, list, help
const Q = [
  { key: 'date', title: 'Tasting Date', kind: 'date', req: true },
  { key: 'event', title: 'Tasting / Event', kind: 'text' },
  { key: 'wineNo', title: 'Wine #', kind: 'int', req: true, help: 'Number of the wine for the night: 1, 2, 3 …' },
  { page: 'Appearance', help: 'Clarity, intensity and color, then anything else the glass shows.' },
  { key: 'clarity', title: 'Clarity', kind: 'mc', list: L.clarity },
  { key: 'appInt', title: 'Appearance Intensity', kind: 'mc', list: L.appInt },
  { key: 'appNotes', title: 'Appearance Notes', kind: 'para', help: 'e.g. legs / tears, deposit, pétillance, bubbles, rim variation' },
  { key: 'type', title: 'Wine Type', kind: 'branch', list: L.type, help: 'Picks which color scale comes next.' },
  { page: 'Color — White', id: 'pWhite', goTo: 'pNose' },
  { key: 'colorWhite', title: 'Color — White', kind: 'mc', list: L.white },
  { page: 'Color — Rosé', id: 'pRose', goTo: 'pNose' },
  { key: 'colorRose', title: 'Color — Rosé', kind: 'mc', list: L.rose },
  { page: 'Color — Red', id: 'pRed', goTo: 'pNose' },
  { key: 'colorRed', title: 'Color — Red', kind: 'mc', list: L.red },
  { page: 'Nose', id: 'pNose', help: 'Condition, intensity and development, then the aromas — primary, secondary, tertiary.' },
  { key: 'condition', title: 'Condition', kind: 'mc', list: L.condition },
  { key: 'noseInt', title: 'Nose Intensity', kind: 'mc', list: L.intensity },
  { key: 'development', title: 'Development', kind: 'mc', list: L.development },
  { key: 'aromas', title: 'Aromas', kind: 'para', help: 'Primary · secondary · tertiary. The Lexicon tab in your Summary sheet has the WSET descriptors.' },
  { key: 'noseNotes', title: 'Nose Comments', kind: 'para' },
  { page: 'Structure and Palate', help: 'Structure first, then flavor intensity, finish and the flavors themselves.' },
  { key: 'sweetness', title: 'Sweetness', kind: 'mc', list: L.sweetness },
  { key: 'acidity', title: 'Acidity', kind: 'mc', list: L.five },
  { key: 'tannin', title: 'Tannin', kind: 'mc', list: L.five, help: 'Leave blank for most whites.' },
  { key: 'tanNature', title: 'Tannin Nature', kind: 'text', help: 'e.g. ripe, soft, fine-grained, grippy, green, coarse, chalky' },
  { key: 'alcohol', title: 'Alcohol', kind: 'mc', list: L.alcohol },
  { key: 'body', title: 'Body', kind: 'mc', list: L.body },
  { key: 'flavInt', title: 'Flavor Intensity', kind: 'mc', list: L.intensity },
  { key: 'finish', title: 'Finish', kind: 'mc', list: L.finish },
  { key: 'flavors', title: 'Flavors', kind: 'para', help: 'Same as the nose? Paste your aromas here and add what the palate shows.' },
  { key: 'palate', title: 'Palate Notes', kind: 'para', help: 'e.g. texture (oily, creamy, austere), pétillance, residual sugar' },
  { page: 'Quality and Aging', help: 'Your assessment, and why — balance, length, intensity, complexity.' },
  { key: 'quality', title: 'Quality', kind: 'mc', list: L.quality },
  { key: 'blic', title: 'Why (BLIC)', kind: 'check', list: L.blic },
  { key: 'qReason', title: 'Quality Reasoning', kind: 'para' },
  { key: 'aging', title: 'Bottle Aging', kind: 'mc', list: L.aging },
  { key: 'aReason', title: 'Aging Reasoning', kind: 'para' },
  { page: 'My Guess', help: 'Commit before the reveal.' },
  { key: 'open', title: 'Tasted Open', kind: 'check', list: ['Tasted Open, Not Blind'], help: 'Tick if you knew the wine — no guess, no score.' },
  { key: 'gGrape', title: 'Grape(s) — My Guess', kind: 'text' },
  { key: 'gCountry', title: 'Country — My Guess', kind: 'text', help: 'Write countries the same way every time (e.g. USA) so the score matches.' },
  { key: 'gRegion', title: 'Region — My Guess', kind: 'text' },
  { key: 'gVintage', title: 'Vintage — My Guess', kind: 'vintage' },
  { page: 'Reveal — Actual', help: 'Fill in after the reveal — now, or later with the edit link on your Summary.' },
  { key: 'producer', title: 'Producer / Wine Name', kind: 'text' },
  { key: 'photo', title: 'Label Photo', kind: 'text' },
  { key: 'aGrape', title: 'Grape(s) — Actual', kind: 'text' },
  { key: 'aCountry', title: 'Country — Actual', kind: 'text' },
  { key: 'aRegion', title: 'Region — Actual', kind: 'text' },
  { key: 'aVintage', title: 'Vintage — Actual', kind: 'vintage' },
];
const QS = Q.filter(q => q.key);
const SCALES = {
  clarity: L.clarity, appInt: L.appInt, type: L.type, color: L.colorAll, condition: L.condition,
  noseInt: L.intensity, development: L.development, sweetness: L.sweetness, acidity: L.five,
  tannin: L.five, alcohol: L.alcohol, body: L.body, flavInt: L.intensity, finish: L.finish,
  quality: L.quality, aging: L.aging,
};
const FILTERS = [
  ['(no filter)', null], ['Tasting / Event', 'event'], ['Date', 'dateLabel'], ['Wine type', 'type'], ['Color', 'color'],
  ['Grape (actual)', 'aGrape'], ['Grape (my guess)', 'gGrape'], ['Grape (either)', ['gGrape', 'aGrape']],
  ['Country (actual)', 'aCountry'], ['Country (my guess)', 'gCountry'], ['Country (either)', ['gCountry', 'aCountry']],
  ['Region (actual)', 'aRegion'], ['Region (my guess)', 'gRegion'], ['Region (either)', ['gRegion', 'aRegion']],
  ['Producer / Wine', 'producer'], ['Vintage (actual)', 'aVintage'],
  ['Clarity', 'clarity'], ['Appearance intensity', 'appInt'], ['Nose condition', 'condition'],
  ['Nose intensity', 'noseInt'], ['Development', 'development'], ['Sweetness', 'sweetness'],
  ['Acidity', 'acidity'], ['Tannin', 'tannin'], ['Alcohol', 'alcohol'], ['Body', 'body'],
  ['Flavor intensity', 'flavInt'], ['Finish', 'finish'], ['Quality', 'quality'], ['Bottle aging', 'aging'],
  ['Score', 'scoreLabel'], ['Blind or open', 'mode'],
];
const SORTS = [
  ['Date & Wine #', 'dateKey'], ['Tasting / Event', 'event'], ['Color', 'color'], ['Grape (my guess)', 'gGrape'], ['Grape (actual)', 'aGrape'],
  ['Country (my guess)', 'gCountry'], ['Country (actual)', 'aCountry'], ['Region (my guess)', 'gRegion'],
  ['Region (actual)', 'aRegion'], ['Producer / Wine', 'producer'], ['Vintage (actual)', 'aVintage'],
  ['Clarity', 'clarity'], ['Appearance intensity', 'appInt'], ['Nose condition', 'condition'],
  ['Nose intensity', 'noseInt'], ['Development', 'development'], ['Sweetness', 'sweetness'], ['Acidity', 'acidity'],
  ['Tannin', 'tannin'], ['Alcohol', 'alcohol'], ['Body', 'body'], ['Flavor intensity', 'flavInt'],
  ['Finish', 'finish'], ['Quality', 'quality'], ['Bottle aging', 'aging'], ['Score', 'score'],
];

// ---------------------------------------------------------------- October 2026 wines (carried over from Excel)
function titleCase(s) {
  return String(s).replace(/(^|[\s\-\/(])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase()).replace(/E\.G\./g, 'e.g.');
}
function sentenceCase(v) {
  let s = clean(v); if (!s) return '';
  s = String(s);
  const words = s.match(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*/g) || [];
  const caps = words.filter(w => /^[A-ZÀ-Þ][a-zß-ÿ'’\-]*$/.test(w)).length;
  if (words.length > 2 && caps / words.length >= 0.6) {
    s = s.replace(/[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’\-]*/g, w => (/^[A-ZÀ-Þ][a-zß-ÿ'’\-]*$/.test(w) ? w.toLowerCase() : w));
  }
  return s.replace(/(^|[.!?]\s+)([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());
}
function clean(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v;
  return String(v).replace(/\s+/g, ' ').trim().replace(/,$/, '').trim();
}
function canon(v, list) {                       // match a scale value regardless of capitals
  const s = clean(v); if (!s) return '';
  const hit = list.find(x => x.toLowerCase() === s.toLowerCase());
  return hit || titleCase(s);
}
const SYN = [
  ['syrah', 'shiraz'], ['grenache', 'garnacha', 'garnacha tinta', 'cannonau'], ['mourvedre', 'monastrell', 'mataro'],
  ['pinot gris', 'pinot grigio', 'grauburgunder'], ['pinot noir', 'spatburgunder', 'pinot nero', 'blauburgunder'], ['pinot blanc', 'pinot bianco', 'weissburgunder'],
  ['zinfandel', 'primitivo'], ['malbec', 'cot'], ['tempranillo', 'tinto fino', 'tinta de toro', 'tinta roriz', 'aragonez', 'cencibel', 'tinto del pais'],
  ['carignan', 'carinena', 'mazuelo', 'carignano'], ['albarino', 'alvarinho'], ['trebbiano', 'ugni blanc'], ['vermentino', 'rolle'],
  ['muscat', 'moscato', 'moscatel'], ['chenin blanc', 'steen'], ['gewurztraminer', 'traminer'], ['cabernet sauvignon', 'cab sauv'],
  ['sangiovese', 'brunello', 'prugnolo gentile', 'morellino'], ['nebbiolo', 'spanna', 'chiavennasca'], ['melon blanc', 'melon de bourgogne'],
  ['usa', 'united states', 'us', 'united states of america', 'america'], ['england', 'uk', 'united kingdom'], ['new zealand', 'nz'], ['south africa', 'rsa'],
  ['burgundy', 'bourgogne'], ['piedmont', 'piemonte'], ['tuscany', 'toscana'], ['sicily', 'sicilia'], ['rhone', 'rhone valley'], ['loire', 'loire valley'],
  ['mosel', 'mosel saar ruwer'], ['jerez', 'sherry', 'jerez xeres sherry'], ['douro', 'douro valley'], ['napa', 'napa valley'], ['barossa', 'barossa valley']
];
const SYNMAP = {}; SYN.forEach(g => g.forEach(n => { SYNMAP[n] = g[0]; }));
function answerKey(v) {
  let s = clean(v).toString().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/[^a-z0-9 ]+/g, ' ').replace(/\b(docg|doc|doca|dop|do|aoc|aop|ava|igt|igp|gi|wo|vdp|appellation|controlee|grosse lage)\b/g, ' ').replace(/\s+/g, ' ').trim();
  return SYNMAP[s] || s;
}
function sameAnswer(a, b) { return answerKey(a) !== '' && answerKey(a) === answerKey(b); }
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function dateLabel(d) {
  if (!(d instanceof Date) || isNaN(d)) return '';
  return (d.getMonth() + 1) + '/' + d.getDate() + '/' + String(d.getFullYear()).slice(-2);
}

function normalize(rows) {
  const out = [];
  const seen = {};
  rows.forEach((r, i) => {
    const d = r.date instanceof Date ? r.date : (r.date ? new Date(r.date) : null);
    const no = r.wineNo === '' || r.wineNo === null || r.wineNo === undefined ? '' : Number(r.wineNo);
    const has = Object.keys(r).some(k => k !== 'ts' && clean(r[k]) !== '');
    if (!has) return;
    const type = canon(r.type, L.type) || (clean(r.colorWhite) ? 'White' : clean(r.colorRose) ? 'Rosé' : clean(r.colorRed) ? 'Red' : '');
    const color = canon(clean(r.colorWhite) || clean(r.colorRose) || clean(r.colorRed) || clean(r.color), L.colorAll);
    const w = {
      row: i, date: d, wineNo: no, dateLabel: dateLabel(d),
      label: (dateLabel(d) ? dateLabel(d) + ', ' : '') + 'Wine #' + (no === '' ? '?' : no),
      dateKey: (d && !isNaN(d) ? d.getTime() / 86400000 : 0) * 1000 + (Number(no) || 0),
      type, color,
      clarity: canon(r.clarity, L.clarity), appInt: canon(r.appInt, L.appInt), appNotes: sentenceCase(r.appNotes),
      condition: canon(r.condition, L.condition), noseInt: canon(r.noseInt, L.intensity),
      development: canon(r.development, L.development), aromas: sentenceCase(r.aromas), noseNotes: sentenceCase(r.noseNotes),
      sweetness: canon(r.sweetness, L.sweetness), acidity: canon(r.acidity, L.five), tannin: canon(r.tannin, L.five),
      tanNature: sentenceCase(r.tanNature), alcohol: canon(r.alcohol, L.alcohol), body: canon(r.body, L.body),
      flavInt: canon(r.flavInt, L.intensity), finish: canon(r.finish, L.finish), flavors: sentenceCase(r.flavors),
      palate: sentenceCase(r.palate), quality: canon(r.quality, L.quality), blic: clean(r.blic), qReason: clean(r.qReason),
      aging: canon(r.aging, L.aging), aReason: clean(r.aReason),
      gGrape: clean(r.gGrape), gCountry: clean(r.gCountry), gRegion: clean(r.gRegion), gVintage: clean(r.gVintage),
      producer: clean(r.producer), aGrape: clean(r.aGrape), aCountry: clean(r.aCountry), aRegion: clean(r.aRegion),
      aVintage: clean(r.aVintage), editLink: clean(r.editLink), event: clean(r.event), photo: clean(r.photo),
      id: r.id || '', ts: r.ts || 0,
    };
    const pairs = [['gGrape', 'aGrape'], ['gCountry', 'aCountry'], ['gRegion', 'aRegion'], ['gVintage', 'aVintage']];
    w.open = clean(r.open) !== '';
    w.mode = w.open ? 'Open' : 'Blind';
    if (w.open) { w.gGrape = w.gCountry = w.gRegion = w.gVintage = ''; }
    w.hits = pairs.map(([g, a]) => (w.open || w[a] === '') ? null : sameAnswer(w[g], w[a]));
    const scored = w.hits.filter(h => h !== null);
    w.score = scored.length ? scored.filter(Boolean).length : '';
    w.scoreLabel = w.open ? 'Tasted open' : scored.length ? w.score + ' of ' + pairs.length : '';
    // a re-submitted Date + Wine # replaces the earlier entry
    const key = w.dateLabel + '#' + w.wineNo;
    if (w.dateLabel && w.wineNo !== '' && seen[key] !== undefined) out[seen[key]] = w;
    else { seen[key] = out.length; out.push(w); }
  });
  return out;
}
function fieldValues(w, field) {
  const keys = Array.isArray(field) ? field : [field];
  return keys.map(k => (w[k] === undefined || w[k] === null ? '' : String(w[k]))).filter(v => v !== '');
}
function filterOptions(wines, fieldLabel) {
  const def = FILTERS.find(f => f[0] === fieldLabel);
  if (!def || !def[1]) return ['(all)'];
  const field = def[1];
  const vals = {};
  wines.forEach(w => fieldValues(w, field).forEach(v => { vals[v.toLowerCase()] = vals[v.toLowerCase()] || v; }));
  let list = Object.keys(vals).map(k => vals[k]);
  const scale = !Array.isArray(field) && SCALES[field];
  if (scale) list.sort((a, b) => idx(scale, a) - idx(scale, b));
  else if (field === 'dateLabel') list.sort((a, b) => new Date(a) - new Date(b));
  else if (field === 'scoreLabel') list.sort((a, b) => parseFloat(b) - parseFloat(a));
  else list.sort((a, b) => a.localeCompare(b));
  return ['(all)'].concat(list);
}
function idx(list, v) { const i = list.findIndex(x => x.toLowerCase() === String(v).toLowerCase()); return i < 0 ? 99 : i; }
function applyFilterSort(wines, fieldLabel, value, sortLabel, order) {
  const def = FILTERS.find(f => f[0] === fieldLabel);
  let list = wines.slice();
  const val = clean(value);
  if (def && def[1] && val && val !== '(all)') {
    const field = def[1];
    const exact = !Array.isArray(field) && (SCALES[field] || field === 'dateLabel' || field === 'scoreLabel' || field === 'type' || field === 'mode');
    list = list.filter(w => fieldValues(w, field).some(v =>
      exact ? v.toLowerCase() === val.toLowerCase() : v.toLowerCase().indexOf(val.toLowerCase()) >= 0));
  }
  const sdef = SORTS.find(s => s[0] === sortLabel) || SORTS[0];
  const key = sdef[1];
  const scale = SCALES[key];
  const val2 = w => {
    if (key === 'color') return w.color ? idx(L.type, w.type) * 100 + idx(L.colorAll, w.color) : null;
    if (scale) return w[key] ? idx(scale, w[key]) : null;
    if (key === 'dateKey' || key === 'score') return w[key] === '' || w[key] === null ? null : Number(w[key]);
    return w[key] ? String(w[key]).toLowerCase() : null;
  };
  const dir = order === 'Descending' ? -1 : 1;
  list.sort((a, b) => {
    const va = val2(a), vb = val2(b);
    if (va === null && vb === null) return a.dateKey - b.dateKey;
    if (va === null) return 1;                     // blanks always last
    if (vb === null) return -1;
    if (va < vb) return -dir;
    if (va > vb) return dir;
    return a.dateKey - b.dateKey;
  });
  return list;
}


const LEXICON = [
    ['Primary Aromas and Flavors', 'The aromas and flavors of the grape and alcoholic fermentation'],
    ['Floral', 'Blossom, Elderflower, Honeysuckle, Jasmine, Rose, Violet'],
    ['Green Fruit', 'Apple, Pear, Gooseberry, Grape'], ['Citrus Fruit', 'Grapefruit, Lemon, Lime, Orange'],
    ['Stone Fruit', 'Peach, Apricot, Nectarine'], ['Tropical Fruit', 'Banana, Lychee, Mango, Melon, Passion Fruit, Pineapple'],
    ['Red Fruit', 'Redcurrant, Cranberry, Raspberry, Strawberry, Red Cherry, Red Plum'],
    ['Black Fruit', 'Blackcurrant, Blackberry, Blueberry, Black Cherry, Black Plum'],
    ['Herbaceous', 'Green Bell Pepper (Capsicum), Grass, Tomato Leaf, Asparagus'],
    ['Herbal', 'Eucalyptus, Mint, Fennel, Dill, Dried Herbs (e.g. Thyme, Oregano)'],
    ['Spice', 'Black/White Pepper, Licorice, Cinnamon'], ['Fruit Ripeness', 'Unripe Fruit, Ripe Fruit, Dried Fruit, Cooked Fruit'],
    ['Other', 'e.g. Simple, Wet Stones, Candy'],
    ['Secondary Aromas and Flavors', 'The aromas and flavors of post-fermentation winemaking'],
    ['Yeast (Lees, Autolysis, Flor)', 'Biscuit/Graham Cracker, Bread, Toasted Bread, Pastry, Brioche, Bread Dough, Cheese, Yogurt, Acetaldehyde'],
    ['Malolactic Conversion', 'Butter, Cheese, Cream'],
    ['Oak', 'Vanilla, Cloves, Coconut, Cedar, Charred Wood, Smoke, Chocolate, Coffee'],
    ['Tertiary Aromas and Flavors', 'The aromas and flavors of maturation'],
    ['Red Wine', 'Dried Fruit (e.g. Prune, Raisin, Fig), Cooked Fruit (e.g. Cooked Plum, Cooked Cherry), Leather, Earth, Mushroom, Meat, Tobacco, Wet Leaves, Forest Floor, Caramel'],
    ['White Wine', 'Dried Fruit (e.g. Dried Apricot, Raisin), Orange Marmalade, Petrol (Gasoline), Cinnamon, Ginger, Nutmeg, Almond, Hazelnut, Honey, Caramel'],
    ['Deliberately Oxidized Wines', 'Almond, Hazelnut, Walnut, Chocolate, Coffee, Caramel'],
  ];

/* A web link or email address is never an aroma or flavor (iOS can drop a recently copied link into a text field). */
function isJunkTok(t) { t = String(t || '').trim(); return /^(https?:|www\.)|:\/\/|\.(com|io|net|org|app|dev|co|uk)(\/|$)|\S+@\S+\.\S+/i.test(t); }
function cleanDescs(v) { var a = String(v || '').split(/\s*,\s*/).filter(function (t) { return t.trim(); }), b = a.filter(function (t) { return !isJunkTok(t); }); return b.length === a.length ? v : b.join(', '); }
/*build*/(window.__V = window.__V || {})['logic'] = 'v2.27';
