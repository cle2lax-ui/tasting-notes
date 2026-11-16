/* Tasting Notes 2.0 — the Lexicon, organized the way you smell: by family, with each cluster's WSET origin noted.
   Words keep the WSET Lexicon's own spellings so notes and the Google Sheet stay consistent. */
var ORIGIN = { p: 'From the grape', s: 'From winemaking', t: 'From age' };
var LEXFAM = [
  { k: 'fruit', name: 'Fruit', clusters: [
    ['Red fruit', 'p', 'red-cherry', ['Redcurrant', 'Cranberry', 'Raspberry', 'Strawberry', 'Red Cherry', 'Red Plum']],
    ['Black fruit', 'p', 'blackberry', ['Blackcurrant', 'Blackberry', 'Blueberry', 'Black Cherry', 'Black Plum']],
    ['Citrus fruit', 'p', 'lemon', ['Grapefruit', 'Lemon', 'Lime', 'Orange']],
    ['Green fruit', 'p', 'apple', ['Apple', 'Pear', 'Gooseberry', 'Grape']],
    ['Stone fruit', 'p', 'peach', ['Peach', 'Apricot', 'Nectarine']],
    ['Tropical fruit', 'p', 'pineapple', ['Banana', 'Lychee', 'Mango', 'Melon', 'Passion Fruit', 'Pineapple']],
    ['Dried and cooked fruit', 't', 'prune', ['Prune', 'Raisin', 'Fig', 'Dried Apricot', 'Cooked Plum', 'Cooked Cherry', 'Orange Marmalade']]] },
  { k: 'floral', name: 'Floral', clusters: [['Flowers', 'p', 'violet', ['Blossom', 'Elderflower', 'Honeysuckle', 'Jasmine', 'Rose', 'Violet']]] },
  { k: 'green', name: 'Green & herbal', clusters: [
    ['Herbaceous', 'p', 'grass', ['Green Bell Pepper', 'Grass', 'Tomato Leaf', 'Asparagus']],
    ['Herbal', 'p', 'mint', ['Eucalyptus', 'Mint', 'Fennel', 'Dill', 'Thyme', 'Oregano']]] },
  { k: 'spice', name: 'Spice', clusters: [
    ['Pepper and licorice', 'p', 'black-white-pepper', ['Black/White Pepper', 'Licorice', 'Cinnamon']],
    ['Sweet spice', 't', 'ginger', ['Ginger', 'Nutmeg', 'Cinnamon']]] },
  { k: 'oak', name: 'Oak', clusters: [['Oak', 's', 'vanilla', ['Vanilla', 'Cloves', 'Coconut', 'Cedar', 'Charred Wood', 'Smoke', 'Chocolate', 'Coffee']]] },
  { k: 'yeast', name: 'Yeast & dairy', clusters: [
    ['Lees and autolysis', 's', 'brioche', ['Biscuit/Graham Cracker', 'Bread', 'Toasted Bread', 'Pastry', 'Brioche', 'Bread Dough', 'Yogurt']],
    ['Malolactic', 's', 'butter', ['Butter', 'Cheese', 'Cream']]] },
  { k: 'age', name: 'Earth & age', clusters: [
    ['Earth and savory', 't', 'leather', ['Leather', 'Earth', 'Mushroom', 'Meat', 'Tobacco', 'Wet Leaves', 'Forest Floor', 'Petrol']],
    ['Nut, honey and caramel', 't', 'honey', ['Almond', 'Hazelnut', 'Walnut', 'Honey', 'Caramel']]] },
  { k: 'other', name: 'Other', clusters: [
    ['Mineral', 'p', 'wet-stones', ['Wet Stones']],
    ['Fruit style', 'p', 'candy', ['Simple', 'Candy']],
    ['Flor', 's', 'acetaldehyde', ['Acetaldehyde']]] }
];
var RIPENESS = ['Unripe Fruit', 'Ripe Fruit', 'Dried Fruit', 'Cooked Fruit'];
var SHOWNAME = { 'Biscuit/Graham Cracker': 'Biscuit', 'Black/White Pepper': 'Black or white pepper' };
/* fruit clusters that lead for each wine type (the rest fold under More fruit) */
var LEAD = {
  Red: { fruit: ['Red fruit', 'Black fruit', 'Dried and cooked fruit'] },
  White: { fruit: ['Citrus fruit', 'Green fruit', 'Stone fruit', 'Tropical fruit'] },
  'Rosé': { fruit: ['Red fruit', 'Citrus fruit', 'Stone fruit'] },
  '': { fruit: ['Red fruit', 'Black fruit', 'Citrus fruit', 'Green fruit', 'Stone fruit', 'Tropical fruit', 'Dried and cooked fruit'] }
};
var WORDHOME = {};
LEXFAM.forEach(function (f) { f.clusters.forEach(function (c) { c[3].forEach(function (w) { if (!WORDHOME[w.toLowerCase()]) WORDHOME[w.toLowerCase()] = { f: f.k, c: c[0], t: c[1], w: w }; }); }); });
RIPENESS.forEach(function (w) { WORDHOME[w.toLowerCase()] = { f: 'fruit', c: 'Fruit character', t: 'p', w: w }; });
var ALLWORDS = Object.keys(WORDHOME);
function wordLabel(w) { var h = WORDHOME[String(w).toLowerCase()]; w = h ? h.w : w; return SHOWNAME[w] || w.charAt(0) + w.slice(1).toLowerCase(); }
function photoOfSlug(s) { return 'aromas/' + s + '.webp'; }
