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
  intensity: ['Light', 'Medium Minus', 'Medium', 'Medium Plus', 'Pronounced'],
  development: ['Youthful', 'Developing', 'Fully Developed'],
  sweetness: ['Dry', 'Off-Dry', 'Medium-Dry', 'Medium-Sweet', 'Sweet', 'Luscious'],
  five: ['Low', 'Medium Minus', 'Medium', 'Medium Plus', 'High'],
  alcohol: ['Low', 'Medium', 'High'],
  body: ['Light', 'Medium Minus', 'Medium', 'Medium Plus', 'Full'],
  finish: ['Short', 'Medium Minus', 'Medium', 'Medium Plus', 'Long'],
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
  { key: 'price', title: 'Approx. Retail Price', kind: 'text', help: 'Found automatically for revealed wines, or type your own' },
  { key: 'priceSrc', title: 'Price Source', kind: 'text' },
  { key: 'reviews', title: 'Professional Reviews', kind: 'para', help: 'Found online for revealed wines: critic | score | vintage | excerpt | link' },
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
// Medium Plus / Medium Minus were written "Medium(+)" / "Medium (−)" before v2.41; old values still read correctly
function legacyMed(s) { return String(s).replace(/^medium\s*\(\s*\+\s*\)$/i, 'Medium Plus').replace(/^medium\s*\(\s*[-\u2212\u2013]\s*\)$/i, 'Medium Minus').replace(/^med(ium)?\s*\+$/i, 'Medium Plus').replace(/^med(ium)?\s*[-\u2212]$/i, 'Medium Minus'); }
function canon(v, list) {                       // match a scale value regardless of capitals
  const s = legacyMed(clean(v)); if (!s) return '';
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
// the grapes named in an answer: "Grenache, Syrah, Mourvèdre", "Cabernet/Merlot", "GSM", "Syrah blend"
const BLENDS = { gsm: ['grenache', 'syrah', 'mourvedre'], sgm: ['syrah', 'grenache', 'mourvedre'] };
function grapeSet(v) {
  const raw = clean(v).toString(); if (!raw) return [];
  let parts = raw.split(/\s*(?:,|\/|&|\+|;|\band\b|\s[-\u2013]\s)\s*/i);
  let out = [];
  parts.forEach(p => { const k = answerKey(p.replace(/\b(blend|cuvee|field blend|dominant|led|based)\b/ig, ' ')); if (!k) return; (BLENDS[k] || [k]).forEach(x => { const y = SYNMAP[x] || x; if (out.indexOf(y) < 0) out.push(y); }); });
  return out;
}
// one answer's points: 1 for the right answer; for grapes, ½ for naming one grape of a blend (or a blend that includes the grape)
function answerPoints(g, a, kind) {
  if (kind === true) kind = 'grape';
  if (answerKey(g) === '' || answerKey(a) === '') return 0;
  if (sameAnswer(g, a)) return 1;
  if (kind === 'region') {                                  // close regions: the same sub-region, or the sub-region named for one of its appellations
    if (regionKey(g) === regionKey(a)) return 1;
    const gn = regionNode(g), an = regionNode(a);
    if (gn && an && gn.key === an.key) return 1;            // the same place, spelled a little differently
    return gn && an && gn.country === an.country && gn.sub === an.sub ? 0.5 : 0;
  }
  if (kind !== 'grape') return 0;
  const gs = grapeSet(g), as = grapeSet(a);
  if (!gs.length || !as.length) return 0;
  const shared = gs.filter(x => as.indexOf(x) >= 0).length;
  if (shared === gs.length && shared === as.length) return 1;           // the same grapes, written another way
  return shared ? 0.5 : 0;
}
const REGION_TREE = ["France|Bordeaux|Bordeaux Regional (Bordeaux generic, Generic Bordeaux): Bordeaux AOC (Bordeaux Rouge, Bordeaux Blanc, Bordeaux Rosé, Bordeaux Clairet); Bordeaux Supérieur; Côtes de Bordeaux", "France|Bordeaux|Left Bank (Médoc and Graves, Bordeaux Left Bank): Médoc; Haut-Médoc; Saint-Estèphe; Pauillac; Saint-Julien; Margaux; Listrac-Médoc (Listrac); Moulis-en-Médoc (Moulis); Graves; Graves Supérieures; Pessac-Léognan; Sauternes; Barsac; Cérons", "France|Bordeaux|Right Bank (Libournais, Bordeaux Right Bank): Saint-Émilion; Saint-Émilion Grand Cru; Pomerol; Lalande-de-Pomerol; Fronsac; Canon-Fronsac; Castillon Côtes de Bordeaux (Côtes de Castillon, Castillon); Montagne-Saint-Émilion; Lussac-Saint-Émilion; Puisseguin-Saint-Émilion; Saint-Georges-Saint-Émilion; Côtes de Bourg (Bourg); Blaye Côtes de Bordeaux (Blaye); Francs Côtes de Bordeaux (Francs)", "France|Bordeaux|Entre-Deux-Mers: Entre-Deux-Mers; Cadillac; Loupiac; Sainte-Croix-du-Mont; Cadillac Côtes de Bordeaux; Premières Côtes de Bordeaux", "France|Burgundy|Chablis: Chablis; Petit Chablis; Chablis Premier Cru; Chablis Grand Cru; Les Clos; Vaudésir; Les Preuses; Valmur; Blanchot; Bougros; Grenouilles; Montée de Tonnerre; Fourchaume; Montmains; Vaillons; Mont de Milieu; Beauroy; Troêsmes", "France|Burgundy|Burgundy Regional (Bourgogne): Bourgogne AOC; Bourgogne Côte d'Or; Crémant de Bourgogne", "France|Burgundy|Côte de Nuits: Marsannay; Fixin; Gevrey-Chambertin; Morey-Saint-Denis; Chambolle-Musigny; Vougeot; Clos de Vougeot (Clos Vougeot); Vosne-Romanée; Nuits-Saint-Georges; Côte de Nuits-Villages; Bourgogne Hautes Côtes de Nuits (Hautes Côtes de Nuits); Chambertin; Chambertin-Clos de Bèze; Charmes-Chambertin; Mazis-Chambertin; Latricières-Chambertin; Griotte-Chambertin; Chapelle-Chambertin; Ruchottes-Chambertin; Musigny; Bonnes-Mares; Clos de la Roche; Clos Saint-Denis; Clos de Tart; Clos des Lambrays; Richebourg; Romanée-Conti; La Tâche; La Romanée; Romanée-Saint-Vivant; Échezeaux; Grands-Échezeaux; La Grande Rue; Les Saint-Georges; Aux Malconsorts", "France|Burgundy|Côte de Beaune: Ladoix (Ladoix-Serrigny); Aloxe-Corton; Corton; Corton-Charlemagne; Pernand-Vergelesses; Savigny-lès-Beaune; Chorey-lès-Beaune; Beaune; Pommard; Volnay; Monthélie; Auxey-Duresses; Saint-Romain; Meursault; Puligny-Montrachet; Chassagne-Montrachet; Saint-Aubin; Santenay; Maranges; Montrachet (Le Montrachet); Bâtard-Montrachet; Chevalier-Montrachet; Bienvenues-Bâtard-Montrachet; Criots-Bâtard-Montrachet; Côte de Beaune-Villages; Bourgogne Hautes Côtes de Beaune (Hautes Côtes de Beaune); Les Rugiens; Clos des Mouches; Les Grèves; Clos des Chênes", "France|Burgundy|Côte Chalonnaise: Bouzeron; Rully; Mercurey; Givry; Montagny; Bourgogne Côte Chalonnaise (Côte Chalonnaise)", "France|Burgundy|Mâconnais: Mâcon; Mâcon-Villages; Viré-Clessé; Pouilly-Fuissé; Pouilly-Loché; Pouilly-Vinzelles; Saint-Véran; Mâcon-Lugny", "France|Beaujolais|Beaujolais: Beaujolais AOC; Beaujolais-Villages; Beaujolais Nouveau; Moulin-à-Vent; Morgon; Côte de Py; Fleurie; Chiroubles; Chénas; Juliénas; Saint-Amour; Brouilly; Côte de Brouilly; Régnié", "France|Alsace|Alsace: Alsace AOC; Crémant d'Alsace; Rangen; Geisberg; Schoenenbourg; Altenberg de Bergheim; Hengst; Kirchberg de Barr", "France|Loire|Pays Nantais: Muscadet; Muscadet Sèvre et Maine; Muscadet Côtes de Grandlieu; Muscadet Coteaux de la Loire; Clisson; Gorges; Le Pallet", "France|Loire|Anjou-Saumur (Anjou, Saumur): Anjou Blanc; Anjou Villages; Savennières; Coulée de Serrant; Coteaux du Layon; Chaume; Quarts de Chaume; Bonnezeaux; Saumur Champigny; Saumur Blanc; Coteaux de Saumur; Rosé d'Anjou; Cabernet d'Anjou; Rosé de Loire; Coteaux de l'Aubance; Anjou Mousseux", "France|Loire|Touraine: Vouvray; Montlouis-sur-Loire (Montlouis); Chinon; Bourgueil; Saint-Nicolas-de-Bourgueil; Touraine AOC; Touraine Amboise; Crémant de Loire; Vouvray Mousseux", "France|Loire|Central Vineyards (Centre-Loire, Upper Loire, Eastern Loire): Sancerre; Pouilly-Fumé; Menetou-Salon; Quincy; Reuilly; Pouilly-sur-Loire", "France|Rhône|Northern Rhône (North Rhône, Rhône Nord, N Rhône, Northern Rhone Valley): Côte-Rôtie; Condrieu; Château-Grillet; Saint-Joseph; Hermitage; Crozes-Hermitage (Crozes); Cornas; Saint-Péray; Collines Rhodaniennes", "France|Rhône|Southern Rhône (South Rhône, Rhône Sud, S Rhône, Southern Rhone Valley): Châteauneuf-du-Pape (CNDP); Gigondas; Vacqueyras; Rasteau; Cairanne; Vinsobres; Lirac; Tavel; Beaumes-de-Venise; Muscat de Beaumes-de-Venise; Côtes du Rhône Villages; Côtes du Rhône; Ventoux (Côtes du Ventoux); Luberon; Costières de Nîmes; Grignan-les-Adhémar; Plan de Dieu; Séguret; Sablet; Visan", "France|Languedoc-Roussillon|Languedoc: Languedoc AOC (Coteaux du Languedoc); Pic Saint-Loup; Faugères; Saint-Chinian; Saint-Chinian Berlou; Saint-Chinian Roquebrun; Minervois; Minervois-la-Livinière (La Livinière); Corbières; Corbières-Boutenac; Fitou; Terrasses du Larzac; Picpoul de Pinet; Limoux; La Clape; Cabardès; Malepère; Muscat de Frontignan; Muscat de Saint-Jean-de-Minervois; Pézenas; Pays d'Oc; Sud de France", "France|Languedoc-Roussillon|Roussillon: Côtes du Roussillon; Côtes du Roussillon Villages; Côtes du Roussillon Villages Tautavel (Tautavel); Collioure; Banyuls; Maury; Rivesaltes; Muscat de Rivesaltes; Côtes Catalanes", "France|Provence|Provence: Côtes de Provence; Côtes de Provence Sainte-Victoire; Bandol; Cassis; Palette; Coteaux d'Aix-en-Provence; Coteaux Varois en Provence; Les Baux-de-Provence; Bellet", "France|South West France|South West France (Sud-Ouest): Bergerac; Côtes de Bergerac; Monbazillac; Cahors; Madiran; Pacherenc du Vic-Bilh; Jurançon; Jurançon Sec; Gaillac; Irouléguy; Saint-Mont; Fronton; Marcillac; Côtes de Gascogne", "France|Jura|Jura: Arbois; Château-Chalon; Côtes du Jura; L'Étoile; Vin Jaune; Crémant du Jura", "Germany|Mosel|Mosel (Mosel-Saar-Ruwer, Moselle): Saar; Ruwer; Bernkastel; Bernkasteler Doctor; Piesport; Piesporter Goldtröpfchen; Wehlen; Wehlener Sonnenuhr; Graach; Graacher Himmelreich; Ürzig; Ürziger Würzgarten; Erden; Erdener Treppchen; Brauneberg; Trittenheim; Zeltingen; Kasel; Ockfen; Wiltingen; Scharzhofberg; Kanzem; Ayl; Saarburg; Mittelmosel; Middle Mosel", "Germany|Rheingau|Rheingau: Rüdesheim; Rüdesheimer Berg Schlossberg; Johannisberg; Schloss Johannisberg; Hattenheim; Erbach; Rauenthal; Kiedrich; Hochheim; Oestrich; Winkel; Geisenheim; Lorch; Assmannshausen", "Germany|Rheinhessen|Rheinhessen: Nierstein; Nackenheim; Oppenheim; Westhofen; Bingen; Roter Hang; Dalsheim; Wonnegau", "Germany|Pfalz|Pfalz (Palatinate): Forst; Deidesheim; Wachenheim; Bad Dürkheim; Ungstein; Kallstadt; Siebeldingen; Birkweiler; Mittelhaardt; Ruppertsberg; Südliche Weinstrasse", "Germany|Nahe|Nahe: Schlossböckelheim; Niederhausen; Norheim; Monzingen; Bad Kreuznach; Dorsheim", "Germany|Baden|Baden: Kaiserstuhl; Ortenau; Tuniberg; Breisgau", "Germany|Franken|Franken (Franconia): Würzburg; Iphofen; Escherndorf", "Germany|Other German Regions|Ahr, Mittelrhein, Württemberg and the East: Ahr; Württemberg; Saale-Unstrut; Sachsen", "Austria|Niederösterreich|Niederösterreich (Lower Austria): Wachau; Kremstal; Kamptal; Traisental; Wagram; Weinviertel; Carnuntum; Thermenregion; Spitz; Weissenkirchen; Dürnstein; Loiben; Langenlois; Krems", "Austria|Burgenland|Burgenland: Neusiedlersee; Leithaberg; Mittelburgenland; Eisenberg; Südburgenland; Rust; Ruster Ausbruch; Rosalia", "Austria|Steiermark|Steiermark (Styria): Südsteiermark; Vulkanland Steiermark; Weststeiermark", "Austria|Wien|Wien (Vienna): Wiener Gemischter Satz", "Greece|Northern Greece|Macedonia (Northern Greece): Naoussa; Amynteo (Amyndeon); Drama", "Greece|Peloponnese|Peloponnese: Nemea; Mantinia; Patra", "Greece|Aegean Islands|Aegean Islands (Cyclades): Santorini; Paros; Samos; Crete", "Italy|North-East Italy|Trentino-Alto Adige (Alto Adige and Trentino, Südtirol): Alto Adige (Südtirol DOC); Trentino; Trento; Teroldego Rotaliano; Lagrein; Lago di Caldaro (Kalterersee, Caldaro); Santa Maddalena (St Magdalener, Santa Magdalena); Vigneti delle Dolomiti; Oltradige; Valle Isarco", "Italy|North-East Italy|Friuli (Friuli-Venezia Giulia): Collio; Friuli Colli Orientali; Friuli Grave (Grave del Friuli); Friuli Isonzo (Isonzo); Ramandolo; Colli Orientali del Friuli Picolit (Picolit); Friuli DOC; Rosazzo", "Italy|North-East Italy|Valpolicella and Soave (Verona, Veneto): Valpolicella; Valpolicella Classico; Valpolicella Valpantena (Valpantena); Valpolicella Ripasso (Ripasso); Amarone della Valpolicella (Amarone); Recioto della Valpolicella; Soave; Soave Classico; Soave Superiore; Recioto di Soave; Bardolino; Bardolino Superiore; Lugana; Custoza (Bianco di Custoza); Delle Venezie (Pinot Grigio delle Venezie); Trevenezie", "Italy|North-East Italy|Prosecco (Prosecco hills): Prosecco; Conegliano Valdobbiadene Prosecco (Valdobbiadene, Conegliano); Asolo Prosecco; Cartizze", "Italy|North-West Italy|Langhe (Langhe and Roero, Alba, Piemonte): Barolo; Barbaresco; Langhe; Langhe Nebbiolo; Dogliani; Barbera d'Alba; Dolcetto d'Alba; Nebbiolo d'Alba; Roero; Roero Arneis; La Morra; Serralunga d'Alba; Castiglione Falletto; Monforte d'Alba; Neive; Cannubi; Bussia; Vignarionda", "Italy|North-West Italy|Asti and Monferrato (Monferrato): Barbera d'Asti; Asti; Moscato d'Asti; Gavi (Cortese di Gavi); Nizza; Barbera del Monferrato; Ruchè di Castagnole Monferrato; Grignolino; Dolcetto di Ovada (Ovada); Piemonte DOC", "Italy|North-West Italy|Alto Piemonte (Northern Piedmont): Gattinara; Ghemme; Boca; Lessona; Bramaterra; Carema", "Italy|North-West Italy|Lombardy: Franciacorta; Valtellina; Valtellina Superiore; Sforzato di Valtellina (Sfursat); Oltrepò Pavese", "Italy|Central Italy|Central Tuscany (Chianti and Montalcino, Tuscany): Chianti; Chianti Classico; Chianti Rufina (Rufina); Chianti Colli Senesi; Chianti Colli Fiorentini; Vino Nobile di Montepulciano (Montepulciano, Nobile di Montepulciano); Rosso di Montepulciano; Brunello di Montalcino (Montalcino, Brunello); Rosso di Montalcino; Sant'Antimo; Vernaccia di San Gimignano (San Gimignano); Carmignano; Vin Santo del Chianti; Pomino; Val d'Arno di Sopra; Toscana IGT (Toscana)", "Italy|Central Italy|Tuscan Coast (Maremma, Tuscan Coast and Maremma): Bolgheri; Bolgheri Sassicaia; Morellino di Scansano (Scansano); Maremma Toscana; Montecucco; Val di Cornia; Suvereto", "Italy|Central Italy|Marche: Verdicchio dei Castelli di Jesi (Castelli di Jesi); Verdicchio di Matelica (Matelica); Rosso Conero; Conero; Rosso Piceno; Offida", "Italy|Central Italy|Umbria: Orvieto; Montefalco Sagrantino (Sagrantino di Montefalco); Torgiano", "Italy|Central Italy|Lazio: Frascati; Frascati Superiore; Castelli Romani; Cesanese del Piglio (Piglio); Est! Est!! Est!!! di Montefiascone", "Italy|Central Italy|Abruzzo: Montepulciano d'Abruzzo; Montepulciano d'Abruzzo Colline Teramane (Colline Teramane); Trebbiano d'Abruzzo; Cerasuolo d'Abruzzo", "Italy|Southern Italy|Campania: Taurasi; Fiano di Avellino; Greco di Tufo; Aglianico del Taburno; Falanghina del Sannio; Sannio; Irpinia; Campi Flegrei; Vesuvio; Lacryma Christi del Vesuvio (Lacryma Christi); Ischia; Capri; Beneventano", "Italy|Southern Italy|Basilicata: Aglianico del Vulture; Aglianico del Vulture Superiore; Vulture", "Italy|Southern Italy|Puglia (Apulia): Primitivo di Manduria; Salice Salentino; Gioia del Colle; Castel del Monte; Salento", "Italy|Southern Italy|Sicily (Sicilia): Sicilia DOC; Etna; Etna Rosso; Etna Bianco; Marsala; Cerasuolo di Vittoria; Vittoria; Pantelleria; Passito di Pantelleria; Faro; Terre Siciliane", "Italy|Southern Italy|Sardinia (Sardegna): Cannonau di Sardegna; Vermentino di Gallura; Vermentino di Sardegna; Carignano del Sulcis", "Spain|Galicia|Galicia (Green Spain): Rías Baixas; Val do Salnés; Condado do Tea; O Rosal; Ribeiro; Ribeira Sacra; Valdeorras; Monterrei; Ribeira do Ulla; Soutomaior", "Spain|Castilla y León|Castilla y León (Duero Valley, Duero): Ribera del Duero; Toro; Rueda; Cigales; Arlanza; Tierra de León; Bierzo; Cebreros; Castilla y León VT", "Spain|Rioja|Rioja: Rioja DOCa; Rioja Alta; Rioja Alavesa; Rioja Oriental; Rioja Baja", "Spain|Navarra|Navarra: Navarra DO; Tierra Estella; Baja Montaña; Valdizarbe; Ribera Alta; Ribera Baja", "Spain|Aragon|Aragon: Calatayud; Campo de Borja; Cariñena; Somontano", "Spain|Catalunya|Catalunya (Catalonia): Priorat (Priorato); Montsant; Penedès; Cava; Costers del Segre; Conca de Barberà; Terra Alta; Empordà; Alella; Corpinnat; Catalunya DO", "Spain|Valencia and Murcia|Valencia and Murcia (Levante, Mediterranean Spain): Jumilla; Yecla; Valencia DO; Utiel-Requena; Alicante; Bullas", "Spain|Castilla-La Mancha|Castilla-La Mancha (Central Spain): La Mancha; Valdepeñas; Méntrida; Manchuela; Vinos de Madrid; Dominio de Valdepusa", "Spain|Other Spanish Regions|Other Spanish Regions (Canary Islands, Andalucía): Lanzarote; Jerez (Sherry, Jerez-Xérès-Sherry); Manzanilla-Sanlúcar de Barrameda (Manzanilla, Sanlúcar de Barrameda); Montilla-Moriles; Málaga; Sierras de Málaga; Txakoli (Getariako Txakolina)", "Portugal|Vinho Verde|Vinho Verde (Minho): Vinho Verde DOC; Monção e Melgaço (Monção, Melgaço); Alvarinho; Baião; Minho VR", "Portugal|Douro|Douro (Douro Valley): Douro DOC; Port (Porto); Cima Corgo; Baixo Corgo; Douro Superior", "Portugal|Dão|Dão: Dão DOC; Terras do Dão; Beira Interior", "Portugal|Bairrada|Bairrada: Bairrada DOC; Beira Atlântico", "Portugal|Alentejo|Alentejo: Alentejo DOC; Alentejano; Reguengos; Borba; Vidigueira; Portalegre; Vinho de Talha", "Portugal|Lisboa|Lisboa: Colares; Bucelas; Alenquer; Lisboa VR; Carcavelos", "Portugal|Península de Setúbal|Península de Setúbal: Setúbal; Moscatel de Setúbal; Palmela; Península de Setúbal VR", "Portugal|Tejo|Tejo: Tejo DOC", "Portugal|Madeira|Madeira (Madeira island): Madeira Wine", "USA|California|California Regional AVAs (North Coast): California; North Coast", "USA|California|Mendocino and Lake (Mendocino County, Lake County): Anderson Valley; Mendocino; Redwood Valley; Mendocino Ridge; Potter Valley; Clear Lake; Red Hills Lake County; Yorkville Highlands; Cole Ranch", "USA|California|Sonoma County (Sonoma): Russian River Valley; Sonoma Coast; Dry Creek Valley; Alexander Valley; Sonoma Valley; Knights Valley; Fort Ross-Seaview; Green Valley of Russian River Valley (Green Valley); Chalk Hill; Petaluma Gap; Sonoma Mountain; Bennett Valley; Moon Mountain District; Rockpile; West Sonoma Coast; Fountaingrove District; Northern Sonoma", "USA|California|Napa Valley (Napa County): Oakville; Rutherford; St. Helena; Stags Leap District (Stag's Leap); Calistoga; Howell Mountain; Mount Veeder; Spring Mountain District (Spring Mountain); Diamond Mountain District (Diamond Mountain); Atlas Peak; Yountville; Coombsville; Oak Knoll District (Oak Knoll); Chiles Valley; Los Carneros (Carneros); Pritchard Hill", "USA|California|Santa Barbara County (Santa Barbara): Sta. Rita Hills (Santa Rita Hills, Sta Rita Hills); Santa Maria Valley; Santa Ynez Valley; Ballard Canyon; Happy Canyon of Santa Barbara (Happy Canyon); Los Olivos District; Alisos Canyon", "USA|California|Central Coast (California Central Coast): Paso Robles; Paso Robles Willow Creek District; Adelaida District; Santa Lucia Highlands; Monterey; Arroyo Seco; Chalone; Carmel Valley; Santa Cruz Mountains; Edna Valley; Arroyo Grande Valley; San Luis Obispo Coast; Livermore Valley; San Benito", "USA|California|Central Valley (California Central Valley): Lodi; Clarksburg; Mokelumne River; San Joaquin Valley; Sacramento Valley", "USA|California|Sierra Foothills: Amador County; El Dorado; Fiddletown; Shenandoah Valley (California Shenandoah Valley); Calaveras County", "USA|Oregon|Willamette Valley: Dundee Hills; Eola-Amity Hills; Chehalem Mountains; Ribbon Ridge; Yamhill-Carlton District (Yamhill-Carlton); McMinnville; Laurelwood District; Van Duzer Corridor; Tualatin Hills; Lower Long Tom; Mount Pisgah Polk County Oregon", "USA|Oregon|Southern Oregon: Rogue Valley; Applegate Valley; Umpqua Valley; Red Hill Douglas County; Elkton Oregon (Elkton)", "USA|Oregon|Eastern Oregon (Snake River): Snake River Valley", "USA|Washington|Columbia Valley (Washington State): Walla Walla Valley (Walla Walla); Red Mountain; Yakima Valley; Horse Heaven Hills; Wahluke Slope; Rattlesnake Hills; Snipes Mountain; Naches Heights; Royal Slope; The Rocks District of Milton-Freewater (The Rocks District); Ancient Lakes; Lake Chelan; Columbia Gorge; Candy Mountain", "USA|Washington|Puget Sound: Puget Sound AVA", "USA|New York|Finger Lakes: Seneca Lake; Cayuga Lake (Lake Cayuga); Keuka Lake", "USA|New York|Long Island and Hudson River: Long Island; North Fork; Hamptons; Hudson River Region", "USA|New York|Lake Erie and Niagara: Lake Erie; Niagara Escarpment", "Canada|Ontario|Ontario (Niagara): Niagara Peninsula; Niagara-on-the-Lake; Lake Erie North Shore; Prince Edward County; Pelee Island", "Canada|British Columbia|British Columbia (Okanagan): Okanagan Valley; Similkameen Valley; Vancouver Island; Fraser Valley; Gulf Islands", "Canada|Nova Scotia and Québec|Nova Scotia and Québec (Eastern Canada): Nova Scotia; Québec", "Chile|Coquimbo|Coquimbo (Northern Chile): Elqui Valley (Elqui); Limarí Valley (Limarí); Choapa Valley", "Chile|Aconcagua|Aconcagua Region (Aconcagua): Aconcagua Valley; Casablanca Valley (Casablanca); San Antonio Valley (San Antonio); Leyda Valley (Leyda); Aconcagua Costa", "Chile|Central Valley|Central Valley (Valle Central): Maipo Valley (Maipo); Alto Maipo; Puente Alto; Pirque; Cachapoal Valley (Cachapoal); Colchagua Valley (Colchagua); Rapel Valley (Rapel); Curicó Valley (Curicó); Maule Valley (Maule); Apalta; Peumo; Maipo Andes; Cauquenes; Entre Cordilleras", "Chile|Southern Chile|Southern Chile (Sur, Austral): Itata Valley (Itata); Bío Bío Valley (Bío Bío); Malleco Valley (Malleco); Osorno", "Argentina|Northern Argentina|Salta and Calchaquí Valleys (Salta, Northern Argentina): Cafayate; Calchaquí Valleys (Valles Calchaquíes); Molinos; Cachi; Quebrada de Humahuaca; Jujuy", "Argentina|Cuyo|San Juan and La Rioja (Cuyo): San Juan; Pedernal Valley; La Rioja Argentina (Famatina)", "Argentina|Mendoza|Mendoza: Luján de Cuyo; Maipú; Uco Valley (Valle de Uco); Tupungato; Tunuyán; San Carlos; Gualtallary; Paraje Altamira; Agrelo; Perdriel; Vistalba; Los Chacayes; San Pablo; Vista Flores; El Cepillo; Las Compuertas; La Consulta; Eastern Mendoza (East Mendoza); San Rafael", "Argentina|Patagonia|Patagonia: Neuquén; Río Negro; Chubut; San Patricio del Chañar", "South Africa|Western Cape|Western Cape (Geographical Unit): Western Cape WO", "South Africa|Coastal Region|Coastal Region: Stellenbosch; Paarl; Franschhoek (Franschhoek Valley); Swartland; Constantia; Durbanville; Wellington; Tulbagh; Darling; Simonsberg-Stellenbosch; Simonsberg-Paarl; Jonkershoek Valley; Banghoek; Helderberg; Polkadraai Hills; Bottelary; Voor Paardeberg (Paardeberg); Cape Town; Groenekloof; Tygerberg; Cape Peninsula", "South Africa|Cape South Coast|Cape South Coast: Walker Bay; Hemel-en-Aarde Valley (Hemel-en-Aarde); Hemel-en-Aarde Ridge; Upper Hemel-en-Aarde Valley; Elgin; Elim; Cape Agulhas; Bot River; Stanford Foothills", "South Africa|Breede River Valley|Breede River Valley: Robertson; Worcester; Breedekloof; Bonnievale", "South Africa|Olifants River and Klein Karoo|Olifants River and Klein Karoo: Olifants River; Citrusdal Mountain; Klein Karoo; Calitzdorp; Piekenierskloof", "Australia|South Eastern Australia|South Eastern Australia (South Eastern Australia zone, Big Rivers, Lower Murray): Riverland; Murray Darling; Riverina", "Australia|South Australia|Barossa (Barossa zone): Barossa Valley; Eden Valley; High Eden", "Australia|South Australia|Mount Lofty Ranges (Mount Lofty Ranges zone): Clare Valley; Adelaide Hills; Adelaide Plains; Piccadilly Valley; Lenswood; Polish Hill River; Watervale; Basket Range", "Australia|South Australia|Fleurieu (Fleurieu zone): McLaren Vale; Langhorne Creek; Currency Creek; Kangaroo Island; Southern Fleurieu; Blewitt Springs", "Australia|South Australia|Limestone Coast (Limestone Coast zone): Coonawarra; Padthaway; Wrattonbully; Mount Benson; Robe; Mount Gambier", "Australia|Victoria|Port Phillip (Port Phillip zone): Yarra Valley; Mornington Peninsula; Geelong; Macedon Ranges; Sunbury; Red Hill", "Australia|Victoria|Central and North East Victoria (Central Victoria, North East Victoria): Heathcote; Bendigo; Goulburn Valley; Nagambie Lakes; Rutherglen; Beechworth; King Valley; Alpine Valleys; Glenrowan; Strathbogie Ranges; Upper Goulburn", "Australia|Victoria|Gippsland: Gippsland; South Gippsland", "Australia|Victoria|Western Victoria: Grampians; Pyrenees; Henty; Great Western", "Australia|New South Wales|New South Wales (NSW): Hunter Valley (Hunter); Mudgee; Orange; Canberra District; Hilltops; Tumbarumba; Lower Hunter; Upper Hunter; Cowra", "Australia|Tasmania|Tasmania: Tamar Valley; Coal River Valley; Derwent Valley; Pipers River; Huon Valley; East Coast Tasmania", "Australia|Western Australia|Western Australia (WA): Margaret River; Great Southern; Frankland River; Mount Barker; Denmark; Porongurup; Albany; Pemberton; Geographe; Swan Valley", "New Zealand|North Island|Northland and Auckland (Auckland): Auckland; Waiheke Island; West Auckland; Matakana", "New Zealand|North Island|Gisborne: Gisborne", "New Zealand|Hawke's Bay|Hawke's Bay: Gimblett Gravels; Bridge Pa Triangle; Te Awanga; Havelock North", "New Zealand|Wairarapa|Wairarapa (Martinborough, Wellington Wine Country): Martinborough; Gladstone; Te Muna", "New Zealand|Nelson|Nelson: Nelson; Moutere Hills; Waimea Plains", "New Zealand|Marlborough|Marlborough: Wairau Valley; Awatere Valley; Southern Valleys; Waihopai Valley", "New Zealand|North Canterbury|North Canterbury (Waipara, Canterbury): Waipara Valley; Waikari; Canterbury; Teviotdale Hills", "New Zealand|Central Otago|Central Otago: Bannockburn; Gibbston; Bendigo Central Otago; Cromwell; Lowburn; Pisa; Wanaka; Alexandra", "New Zealand|North Otago|Waitaki Valley (North Otago): Waitaki Valley North Otago (Waitaki)", "China|Other Chinese Regions|Other Chinese Regions (China): Xinjiang; Shandong; Yantai; Hebei; Huailai; Yunnan; Shangri-La; Gansu; Shanxi; Heilongjiang; Jilin; Shaanxi; Beijing", "France|Champagne|Champagne Subregions (Champagne region): Montagne de Reims; Vallée de la Marne; Côte des Blancs; Côte de Sézanne; Côte des Bar (Aube); Aÿ; Bouzy; Ambonnay; Verzenay; Cramant; Avize; Le Mesnil-sur-Oger; Oger"];
// region family tree (WSET D3 order, audited against the D3 text Nov 2026): country › region › sub-region › appellation. Two answers in the same sub-region (Cornas and
// Crozes-Hermitage, both Northern Rhône), or an appellation and its own sub-region ("Northern Rhône" for Cornas), are close.
function regionKey(v) { return answerKey(String(v || '').replace(/\bSte?\.?(?=[\s-])/g, function (m) { return /e/.test(m.slice(2)) ? 'Sainte' : 'Saint'; })).replace(/\bst\b/g, 'saint').replace(/\bste\b/g, 'sainte'); }
const REGIONS = {};
REGION_TREE.forEach(line => {
  const m = line.match(/^([^|]+)\|([^|]+)\|([^:]+):\s*(.*)$/); if (!m) return;
  const subM = m[3].match(/^([^(]+?)\s*(?:\((.*)\))?$/), sub = subM[1].trim(), node = { country: m[1], region: m[2], sub: sub };
  [sub].concat(subM[2] ? subM[2].split(/\s*,\s*/) : []).forEach(n => { REGIONS[regionKey(n)] = Object.assign({ isSub: true }, node); });
  m[4].split(/\s*;\s*/).forEach(item => { const im = item.match(/^([^(]+?)\s*(?:\((.*)\))?$/); if (!im) return;
    [im[1]].concat(im[2] ? im[2].split(/\s*,\s*/) : []).forEach(n => { const k = regionKey(n); if (k && !REGIONS[k]) REGIONS[k] = Object.assign({ isSub: false, name: im[1].trim() }, node); }); });
});
function levClose(a, b) {                                   // at most one letter added, dropped or changed
  if (a === b) return true; const la = a.length, lb = b.length; if (Math.abs(la - lb) > 1) return false;
  let i = 0, j = 0, d = 0; while (i < la && j < lb) { if (a[i] === b[j]) { i++; j++; continue; } if (++d > 1) return false; if (la > lb) i++; else if (lb > la) j++; else { i++; j++; } }
  return d + (la - i) + (lb - j) <= 1;
}
function regionNode(v) {
  const k = regionKey(v); if (!k) return null; if (REGIONS[k]) return Object.assign({ key: k }, REGIONS[k]);
  for (const alt of [k + ' valley', k.replace(/ valley$/, ''), k + ' district', k.replace(/ district$/, '')]) if (alt !== k && REGIONS[alt]) return Object.assign({ key: alt }, REGIONS[alt]);   // "Wairau" / "Wairau Valley"
  if (k.length >= 7) for (const x in REGIONS) if (levClose(x, k)) return Object.assign({ key: x }, REGIONS[x]);
  return null;
}
function fmtScore(n) { if (n === '' || n === null || n === undefined) return ''; n = Number(n); const w = Math.floor(n); return (n - w >= 0.5 ? (w ? w : '') + '\u00bd' : String(w)); }
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
      id: r.id || '', ts: r.ts || 0, price: clean(r.price), priceSrc: clean(r.priceSrc), reviews: r.reviews || '',
    };
    const pairs = [['gGrape', 'aGrape'], ['gCountry', 'aCountry'], ['gRegion', 'aRegion'], ['gVintage', 'aVintage']];
    w.open = clean(r.open) !== '';
    w.mode = w.open ? 'Open' : 'Blind';
    if (w.open) { w.gGrape = w.gCountry = w.gRegion = w.gVintage = ''; }
    // a hit is true (right), 0.5 (one grape of a blend) or false; null when there is no actual answer
    w.hits = pairs.map(([g, a], i) => { if (w.open || w[a] === '') return null; const pt = answerPoints(w[g], w[a], i === 0 ? 'grape' : i === 2 ? 'region' : ''); return pt === 1 ? true : pt === 0.5 ? 0.5 : false; });
    const scored = w.hits.filter(h => h !== null);
    w.score = scored.length ? scored.reduce((t, h) => t + (h === true ? 1 : h === 0.5 ? 0.5 : 0), 0) : '';
    w.scoreLabel = w.open ? 'Tasted open' : scored.length ? fmtScore(w.score) + ' of ' + pairs.length : '';
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
  else if (field === 'scoreLabel') list.sort((a, b) => parseFloat(String(b).replace('\u00bd', '.5').replace(/^\./, '0.')) - parseFloat(String(a).replace('\u00bd', '.5').replace(/^\./, '0.')));
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
/*build*/(window.__V = window.__V || {})['logic'] = 'v2.56';
