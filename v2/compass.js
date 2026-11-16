/* Blind Tasting Notes 2.0 — the Aroma Compass.
   Every Lexicon descriptor has a fixed place: the family (angle) says what kind of smell it is,
   the ring (distance from the center) says where it comes from — grape, winemaking or age. */
var FAMS = [
  { k: 'fruit',  name: 'Fruit',          w: 80, q: 'Any fruit?',      hint: 'Fresh fruit comes from the grape. Dried and cooked fruit come with age.' },
  { k: 'floral', name: 'Floral',         w: 40, q: 'Any flowers?',    hint: 'Floral notes come from the grape.' },
  { k: 'green',  name: 'Green & herbal', w: 40, q: 'Anything green or herbal?', hint: 'Leafy, vegetal and herb notes come from the grape.' },
  { k: 'spice',  name: 'Spice',          w: 40, q: 'Any spice?',      hint: 'Pepper and licorice come from the grape. Cloves usually mean oak. Ginger and nutmeg come with age.' },
  { k: 'oak',    name: 'Oak & toast',    w: 40, q: 'Any oak or toast?', hint: 'Vanilla, cedar, smoke and coffee come from oak.' },
  { k: 'yeast',  name: 'Yeast & dairy',  w: 40, q: 'Any yeast or dairy?', hint: 'Bread and biscuit come from lees; butter and cream from malolactic conversion.' },
  { k: 'nut',    name: 'Nut & honey',    w: 40, q: 'Any nut, honey or caramel?', hint: 'Mostly from age and oxidation. Acetaldehyde comes from flor.' },
  { k: 'earth',  name: 'Earth & savory', w: 40, q: 'Anything earthy or savory?', hint: 'Wet stones are mineral, from the grape. Leather, mushroom and forest floor come with age.' }
];
var TIERS = { p: 'From the grape', s: 'From winemaking', t: 'From age' };
var RINGS = { p: [60, 118], s: [121, 160], t: [163, 202] };
/* clusters: [family, tier, name, photo, words]; words are the Lexicon's own spellings */
var CLUSTERS = [
  ['fruit', 'p', 'Red fruit', 'red-cherry', ['Redcurrant', 'Cranberry', 'Raspberry', 'Strawberry', 'Red Cherry', 'Red Plum']],
  ['fruit', 'p', 'Black fruit', 'blackberry', ['Blackcurrant', 'Blackberry', 'Blueberry', 'Black Cherry', 'Black Plum']],
  ['fruit', 'p', 'Citrus fruit', 'lemon', ['Grapefruit', 'Lemon', 'Lime', 'Orange']],
  ['fruit', 'p', 'Green fruit', 'apple', ['Apple', 'Pear', 'Gooseberry', 'Grape']],
  ['fruit', 'p', 'Stone fruit', 'peach', ['Peach', 'Apricot', 'Nectarine']],
  ['fruit', 'p', 'Tropical fruit', 'pineapple', ['Banana', 'Lychee', 'Mango', 'Melon', 'Passion Fruit', 'Pineapple']],
  ['fruit', 'p', 'Fruit style', 'candy', ['Simple', 'Candy']],
  ['fruit', 't', 'Dried and cooked fruit', 'prune', ['Prune', 'Raisin', 'Fig', 'Dried Apricot', 'Cooked Plum', 'Cooked Cherry', 'Orange Marmalade']],
  ['floral', 'p', 'Flowers', 'violet', ['Blossom', 'Elderflower', 'Honeysuckle', 'Jasmine', 'Rose', 'Violet']],
  ['green', 'p', 'Herbaceous', 'grass', ['Green Bell Pepper', 'Grass', 'Tomato Leaf', 'Asparagus']],
  ['green', 'p', 'Herbal', 'mint', ['Eucalyptus', 'Mint', 'Fennel', 'Dill', 'Thyme', 'Oregano']],
  ['spice', 'p', 'Pepper and licorice', 'black-white-pepper', ['Black/White Pepper', 'Licorice', 'Cinnamon']],
  ['spice', 's', 'Oak spice', 'cloves', ['Cloves']],
  ['spice', 't', 'Sweet spice', 'ginger', ['Ginger', 'Nutmeg', 'Cinnamon']],
  ['oak', 's', 'Oak', 'vanilla', ['Vanilla', 'Coconut', 'Cedar', 'Charred Wood', 'Smoke', 'Chocolate', 'Coffee']],
  ['yeast', 's', 'Lees and autolysis', 'brioche', ['Biscuit/Graham Cracker', 'Bread', 'Toasted Bread', 'Pastry', 'Brioche', 'Bread Dough', 'Yogurt']],
  ['yeast', 's', 'Malolactic', 'butter', ['Butter', 'Cheese', 'Cream']],
  ['nut', 's', 'Flor', 'acetaldehyde', ['Acetaldehyde']],
  ['nut', 't', 'Nut, honey and caramel', 'honey', ['Almond', 'Hazelnut', 'Walnut', 'Honey', 'Caramel']],
  ['earth', 'p', 'Mineral', 'wet-stones', ['Wet Stones']],
  ['earth', 't', 'Earth and savory', 'leather', ['Leather', 'Earth', 'Mushroom', 'Meat', 'Tobacco', 'Wet Leaves', 'Forest Floor', 'Petrol']]
];
var RIPENESS = ['Unripe Fruit', 'Ripe Fruit', 'Dried Fruit', 'Cooked Fruit'];
var SHOWNAME = { 'Biscuit/Graham Cracker': 'Biscuit', 'Black/White Pepper': 'Black or white pepper' };

/* word (lowercase) -> its home cells */
var WORDHOME = {};
CLUSTERS.forEach(function (c) { c[4].forEach(function (w) { (WORDHOME[w.toLowerCase()] = WORDHOME[w.toLowerCase()] || []).push({ f: c[0], t: c[1], c: c[2] }); }); });
RIPENESS.forEach(function (w) { WORDHOME[w.toLowerCase()] = [{ f: 'fruit', t: 'p', c: 'Fruit character' }]; });
function famOf(word) { var h = WORDHOME[String(word).toLowerCase()]; return h ? h[0].f : ''; }
function wordLabel(w) { return SHOWNAME[w] || w.charAt(0) + w.slice(1).toLowerCase(); }
function photoOfSlug(s) { return 'aromas/' + s + '.webp'; }

/* which families and clusters lead for a wine type */
function likely(type) {
  if (type === 'Red') return { dim: ['yeast', 'nut'], fruit: ['Red fruit', 'Black fruit'] };
  if (type === 'White') return { dim: [], fruit: ['Citrus fruit', 'Green fruit', 'Stone fruit', 'Tropical fruit'] };
  if (type === 'Rosé') return { dim: ['nut', 'earth'], fruit: ['Red fruit', 'Citrus fruit', 'Stone fruit'] };
  return { dim: [], fruit: ['Red fruit', 'Black fruit', 'Citrus fruit', 'Green fruit', 'Stone fruit', 'Tropical fruit'] };
}

/* ---------------------------------------------------------------- the wheel (SVG) */
function cxPol(r, a) { var t = (a - 90) * Math.PI / 180; return [r * Math.cos(t), r * Math.sin(t)]; }
function cxSector(r0, r1, a0, a1) {
  var p0 = cxPol(r1, a0), p1 = cxPol(r1, a1), p2 = cxPol(r0, a1), p3 = cxPol(r0, a0), lg = a1 - a0 > 180 ? 1 : 0;
  return 'M' + p0[0].toFixed(1) + ' ' + p0[1].toFixed(1) + 'A' + r1 + ' ' + r1 + ' 0 ' + lg + ' 1 ' + p1[0].toFixed(1) + ' ' + p1[1].toFixed(1) +
    'L' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1) + 'A' + r0 + ' ' + r0 + ' 0 ' + lg + ' 0 ' + p3[0].toFixed(1) + ' ' + p3[1].toFixed(1) + 'Z';
}
function famSpans() { var a = -40, out = []; FAMS.forEach(function (f) { out.push({ f: f, a0: a, a1: a + f.w }); a += f.w; }); return out; }
var HAS = {}; CLUSTERS.forEach(function (c) { HAS[c[0] + c[1]] = 1; }); HAS.fruitp = 1;
/* counts: {famTier: n}; opts: {dim:[], focus:'', labels:true, hub:[n,label], uid:'', tap:true} */
function wheelSVG(counts, opts) {
  opts = opts || {}; counts = counts || {}; var g = [], uid = opts.uid || 'w', dim = opts.dim || [];
  famSpans().forEach(function (sp) {
    var k = sp.f.k, anyPick = false;
    ['p', 's', 't'].forEach(function (t) {
      var r = RINGS[t], d = cxSector(r[0], r[1], sp.a0 + 0.9, sp.a1 - 0.9);
      if (!HAS[k + t]) { g.push('<path d="' + d + '" class="cx-empty"/>'); return; }
      var n = counts[k + t] || 0; if (n) anyPick = true;
      g.push('<path d="' + d + '" class="cx-cell f-' + k + (n ? ' has' : '') + (dim.indexOf(k) >= 0 && !n ? ' dim' : '') + (opts.focus === k ? ' foc' : '') + '"' +
        (opts.tap ? ' data-fam="' + k + '"' : '') + '/>');
      for (var i = 0; i < Math.min(n, 6); i++) {
        var p = cxPol((r[0] + r[1]) / 2, sp.a0 + (sp.a1 - sp.a0) * (i + 1) / (Math.min(n, 6) + 1));
        g.push('<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="4.4" class="cx-bead"/>');
      }
    });
    if (opts.labels !== false) {
      var mid = ((sp.a0 + sp.a1) / 2 + 360) % 360, bottom = mid > 90 && mid < 270, r = 221;
      var s = cxPol(r, bottom ? sp.a1 - 1 : sp.a0 + 1), e = cxPol(r, bottom ? sp.a0 + 1 : sp.a1 - 1), id = uid + '-' + k;
      g.push('<path id="' + id + '" d="M' + s[0].toFixed(1) + ' ' + s[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 0 ' + (bottom ? 0 : 1) + ' ' + e[0].toFixed(1) + ' ' + e[1].toFixed(1) + '" fill="none"/>');
      g.push('<text class="cx-lab' + (dim.indexOf(k) >= 0 && !anyPick ? ' dim' : '') + (opts.focus === k ? ' foc' : '') + '" dy="4"' + (opts.tap ? ' data-fam="' + k + '"' : '') +
        '><textPath href="#' + id + '" startOffset="50%" text-anchor="middle">' + sp.f.name.replace('&', '&amp;') + '</textPath></text>');
      if (opts.tap) { var hit = cxSector(57, 236, sp.a0, sp.a1); g.push('<path d="' + hit + '" class="cx-hit" data-fam="' + k + '"/>'); }
    }
  });
  var hub = opts.hub ? '<text class="cx-hubn" y="7">' + opts.hub[0] + '</text><text class="cx-hubl" y="27">' + opts.hub[1] + '</text>' : '';
  var vb = opts.labels === false ? '-205 -205 410 410' : '-242 -242 484 484';
  return '<svg class="cx' + (opts.cls ? ' ' + opts.cls : '') + '" viewBox="' + vb + '" role="img" aria-label="Aroma compass"><circle r="57" class="cx-hub"/>' + g.join('') + hub + '</svg>';
}
/* counts per cell for a comma-separated descriptor list */
function cellCounts(text) {
  var c = {}, seen = {};
  String(text || '').split(/\s*,\s*/).forEach(function (t) {
    t = t.toLowerCase().replace(/[.;:]+$/, '').trim(); if (!t || seen[t]) return; seen[t] = 1;
    var h = WORDHOME[t]; if (!h) return; var key = h[0].f + h[0].t; c[key] = (c[key] || 0) + 1;
  });
  return c;
}
