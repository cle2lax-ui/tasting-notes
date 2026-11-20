/* Tasting Notes — on-device notebook (IndexedDB) and the same API the Google edition's server offered. */
"use strict";

var DB = (function () {
  /* One connection is reused, but the system can close it under us: iOS does when the app goes to the background
     (as it does while Google's sign-in window is open), and another copy of the app can ask it to close for an
     upgrade. A closed connection is dropped and reopened, and the step that hit it is tried once more. */
  var NAME = 'blind-tasting-notes', VER = 1, dbp = null;
  function open() {
    if (dbp) return dbp;
    dbp = new Promise(function (res, rej) {
      var r = indexedDB.open(NAME, VER);
      r.onupgradeneeded = function () {
        var db = r.result;
        if (!db.objectStoreNames.contains('wines')) db.createObjectStore('wines', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id' });
      };
      r.onsuccess = function () {
        var db = r.result;
        db.onclose = function () { dbp = null; };                                   // closed by the system
        db.onversionchange = function () { db.close(); dbp = null; };               // another copy needs it
        res(db);
      };
      r.onerror = function () { dbp = null; rej(r.error); };                        // let the next call try again
      r.onblocked = function () { dbp = null; rej(new Error('Close the other copy of Tasting Notes (another tab or window), then try again.')); };
    });
    return dbp;
  }
  function lost(err) { return err && (err.name === 'InvalidStateError' || err.name === 'UnknownError' || /closing|closed|connection/i.test(err.message || '')); }
  function run(store, mode, fn) {
    return open().then(function (db) {
      return new Promise(function (res, rej) {
        var t, out;
        try { t = db.transaction(store, mode); } catch (e) { rej(e); return; }        // "The database connection is closing"
        var q = fn(t.objectStore(store));
        if (q) q.onsuccess = function () { out = q.result; };
        t.oncomplete = function () { res(out); };
        t.onerror = t.onabort = function () { rej(t.error || new Error('The notebook could not be saved on this device.')); };
      });
    });
  }
  function tx(store, mode, fn) {
    return run(store, mode, fn).catch(function (err) {
      if (!lost(err)) throw err;
      try { dbp && dbp.then(function (db) { try { db.close(); } catch (e) {} }); } catch (e) {}
      dbp = null; return run(store, mode, fn);                                      // reopen once and repeat the step
    });
  }
  return {
    all: function (store) { return tx(store, 'readonly', function (s) { return s.getAll(); }); },
    get: function (store, id) { return tx(store, 'readonly', function (s) { return s.get(id); }); },
    put: function (store, v) { return tx(store, 'readwrite', function (s) { s.put(v); }); },
    del: function (store, id) { return tx(store, 'readwrite', function (s) { s.delete(id); }); },
    putMany: function (store, list) { return tx(store, 'readwrite', function (s) { list.forEach(function (v) { s.put(v); }); }); },
    clear: function (store) { return tx(store, 'readwrite', function (s) { s.clear(); }); },
    keys: function (store) { return tx(store, 'readonly', function (s) { return s.getAllKeys(); }); }
  };
})();

/* ---------------------------------------------------------------- the notebook in memory */
var ROWS = [];                                   // raw saved notes, one per wine (Entry's own field names)
function uid() { return 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function ymdToDate(s) { var p = String(s || '').split('-'); return p.length === 3 ? new Date(+p[0], +p[1] - 1, +p[2], 12) : null; }
function keyOf(r) { return (r.date || '') + '#' + Number(r.wineNo || 0); }
function localToday() { var d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function wineLabel(d, n) { var p = String(d).split('-'); return (+p[1]) + '/' + (+p[2]) + '/' + p[0].slice(2) + ', Wine #' + Number(n); }

function loadRows() {
  return Promise.all([DB.all('wines'), DB.keys('photos').catch(function () { return null; })]).then(function (got) {
    ROWS = got[0] || [];
    var hasBlob = {}, photosKnown = !!got[1]; (got[1] || []).forEach(function (id) { hasBlob[id] = true; });   // if the photo list can't be read, leave photo flags alone
    var fixes = [];
    ROWS.forEach(function (r) {
      var changed = false;
      // repair: strip web links that slipped into aromas or flavors; the fixed note syncs back to the Sheet
      var a = cleanDescs(r.aromas), f = cleanDescs(r.flavors);
      if (a !== r.aromas || f !== r.flavors) { r.aromas = a; r.flavors = f; r.dirty = true; loadRows.repaired = (loadRows.repaired || 0) + 1; changed = true; }
      // repair: the photo is on this device but the note doesn't know it (a photo still being prepared when the
      // wine was saved). Mark it so the next sync uploads it and adds its link to the Sheet.
      if (photosKnown && hasBlob[r.id] && !r.hasPhoto) { r.hasPhoto = true; r.photoFix = true; changed = true; }
      // the note says it has a photo that isn't on this device: clear the flag so a Sheet copy can be fetched again
      if (photosKnown && !hasBlob[r.id] && r.hasPhoto) { r.hasPhoto = false; changed = true; }
      if (changed) fixes.push(r);
    });
    if (!fixes.length) return ROWS;
    return DB.putMany('wines', fixes).then(function () { if (window.Sync) Sync.soon(); return ROWS; });
  });
}

/** Every wine, normalized exactly like the Google edition's Summary. */
function appAllSync() {
  var src = ROWS.slice().sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); }).map(function (r) {
    var o = {}; for (var k in r) o[k] = r[k]; o.date = ymdToDate(r.date); return o;
  });
  return normalize(src).map(function (w) {
    var o = {}; for (var k in w) o[k] = w[k];
    o.ymd = w.date instanceof Date && !isNaN(w.date) ? w.date.getFullYear() + '-' + pad2(w.date.getMonth() + 1) + '-' + pad2(w.date.getDate()) : '';
    delete o.date; return o;
  });
}

var API = {
  appInit: function () {
    return loadRows().then(function () { return { scales: L, all: appAllSync(), urls: {}, today: localToday() }; });
  },
  appPing: function () { return Promise.resolve(true); },
  appLoad: function (d, n) {
    var r = ROWS.filter(function (x) { return keyOf(x) === d + '#' + Number(n); }).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); })[0];
    if (!r) return Promise.resolve(null);
    var o = {}; for (var k in r) o[k] = r[k];
    return Promise.resolve(o);
  },
  appSave: function (rec, orig, force) {
    if (!rec || !/^\d{4}-\d{2}-\d{2}$/.test(rec.date || '') || !(Number(rec.wineNo) > 0)) return Promise.reject(new Error('Date and Wine # are required.'));
    var key = keyOf(rec);
    var mine = rec.id ? ROWS.filter(function (x) { return x.id === rec.id; })[0] : null;
    if (!mine && orig) mine = ROWS.filter(function (x) { return keyOf(x) === orig.date + '#' + Number(orig.wineNo); })[0] || null;
    var clash = ROWS.filter(function (x) { return keyOf(x) === key && (!mine || x.id !== mine.id); })[0];
    if (clash && !force) {
      return Promise.resolve({ conflict: wineLabel(rec.date, rec.wineNo) + ' is already in your notebook' + (clash.producer ? ' (' + clash.producer + ')' : '') + '.' });
    }
    var row = {};
    for (var k in rec) row[k] = rec[k];
    row.wineNo = Number(rec.wineNo);
    row.aromas = cleanDescs(row.aromas); row.flavors = cleanDescs(row.flavors);
    if (row.open) { row.gGrape = row.gCountry = row.gRegion = row.gVintage = ''; }
    row.id = mine ? mine.id : (rec.id || uid());
    if (mine) { row.sheetKey = mine.sheetKey; row.sheetSer = mine.sheetSer; if (!('photoUrl' in rec)) row.photoUrl = mine.photoUrl; }
    if (clash && force && !row.sheetKey) { row.sheetKey = clash.sheetKey; row.sheetSer = clash.sheetSer; }
    row.ts = Date.now();
    row.dirty = true;
    var jobs = [];
    if (clash && force && clash.id !== row.id) jobs.push(DB.del('wines', clash.id));
    return Promise.all(jobs).then(function () { return DB.put('wines', row); }).then(loadRows).then(function () {
      if (window.Sync) Sync.soon();
      return { ok: true, label: wineLabel(rec.date, rec.wineNo), id: row.id, all: appAllSync() };
    });
  },
  appMarkPhoto: function (id) {
    var row = ROWS.filter(function (x) { return x.id === id; })[0];
    if (!row) return Promise.resolve(null);
    row.hasPhoto = true; row.photoUrl = ''; row.dirty = true; row.ts = Date.now();
    return DB.put('wines', row).then(loadRows).then(function () { if (window.Sync) Sync.soon(); return { ok: true, all: appAllSync() }; });
  },
  appDelete: function (id) {
    var row = ROWS.filter(function (x) { return x.id === id; })[0];
    if (!row) return Promise.resolve({ all: appAllSync() });
    if (window.Sync && row.sheetKey) Sync.forget(row.sheetKey);       // remove it from the Google Sheet on the next sync
    return Promise.all([DB.del('wines', id), Photos.remove(id).catch(function () {})]).then(loadRows).then(function () {
      if (window.Sync) Sync.soon();
      return { ok: true, all: appAllSync() };
    });
  }
};

/* ---------------------------------------------------------------- label photos (kept on the device) */
/* The photo is decoded once; the full copy and the thumbnail are both drawn from it, and the canvases are
   released straight away (phones have little memory for big camera images). */
function shrinkImage(file, sizes) {             // sizes: [[maxSide, quality], ...] → one JPEG per size
  return new Promise(function (res, rej) {
    var url = URL.createObjectURL(file), img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(url);
      var src = img, out = [];
      (function next(i) {
        if (i === sizes.length) { if (src !== img) src.width = src.height = 0; res(out); return; }
        var s = Math.min(1, sizes[i][0] / Math.max(src.width || src.naturalWidth, src.height || src.naturalHeight));
        var w = src.width || src.naturalWidth, h = src.height || src.naturalHeight;
        var c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * s)); c.height = Math.max(1, Math.round(h * s));
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        c.toBlob(function (b) {
          if (!b) { rej(new Error('Could not read that photo.')); return; }
          out.push(b); if (src !== img) { src.width = src.height = 0; } src = c; next(i + 1);   // the next size is drawn from this one
        }, 'image/jpeg', sizes[i][1]);
      })(0);
    };
    img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Could not read that photo.')); };
    img.src = url;
  });
}
var Photos = {
  cache: {},
  add: function (wineId, file) {
    return shrinkImage(file, [[1600, 0.82], [360, 0.8]]).then(function (b) {
      var rec = { id: wineId, full: b[0], thumb: b[1], driveId: '', ts: Date.now() };
      return DB.put('photos', rec).then(function () { Photos.forget(wineId); return rec; });
    });
  },
  get: function (wineId) { return DB.get('photos', wineId); },
  remove: function (wineId) { Photos.forget(wineId); return DB.del('photos', wineId); },
  forget: function (wineId) { var c = Photos.cache[wineId]; if (c) { URL.revokeObjectURL(c.thumb); URL.revokeObjectURL(c.full); delete Photos.cache[wineId]; } },
  urls: function (wineId) {
    if (Photos.cache[wineId]) return Promise.resolve(Photos.cache[wineId]);
    return Photos.get(wineId).then(function (p) {
      if (!p) return null;
      return (Photos.cache[wineId] = { thumb: URL.createObjectURL(p.thumb), full: URL.createObjectURL(p.full) });
    });
  }
};

/* ---------------------------------------------------------------- backup, restore, spreadsheet export */
function blobToDataUrl(b) { return new Promise(function (res) { var r = new FileReader(); r.onload = function () { res(r.result); }; r.readAsDataURL(b); }); }
function dataUrlToBlob(u) { var p = u.split(','), bin = atob(p[1]), a = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type: (p[0].match(/:(.*?);/) || [])[1] || 'image/jpeg' }); }

var Backup = {
  /** ids: limit to these wines (sharing a flight); withPhotos: include label photos. */
  make: function (ids, withPhotos, title) {
    var rows = ROWS.filter(function (r) { return !ids || ids.indexOf(r.id) >= 0; }).map(function (r) {
      var o = {}; for (var k in r) if (k !== 'dirty' && k !== 'sheetKey') o[k] = r[k]; return o;
    });
    var file = { app: 'Blind Tasting Notes', kind: ids ? 'flight' : 'backup', title: title || '', made: new Date().toISOString(), wines: rows, photos: {} };
    if (!withPhotos) return Promise.resolve(file);
    return Promise.all(rows.map(function (r) {
      return Photos.get(r.id).then(function (p) { if (p) return blobToDataUrl(p.full).then(function (u) { file.photos[r.id] = u; }); });
    })).then(function () { return file; });
  },
  /** Adds wines from a backup or a shared flight. Same date + wine # → the newer note wins. */
  restore: function (file) {
    if (!file || file.app !== 'Blind Tasting Notes' || !Array.isArray(file.wines)) return Promise.reject(new Error("That file isn't a Tasting Notes backup."));
    var added = 0, updated = 0, puts = [], photoJobs = [];
    file.wines.forEach(function (w) {
      if (!w || !/^\d{4}-\d{2}-\d{2}$/.test(w.date || '')) return;
      var same = ROWS.filter(function (x) { return keyOf(x) === keyOf(w); })[0];
      if (same && (same.ts || 0) >= (w.ts || 0)) return;
      var row = {}; for (var k in w) row[k] = w[k];
      row.id = same ? same.id : uid(); row.dirty = true; delete row.sheetSer; delete row.sheetKey; if (same) { row.sheetKey = same.sheetKey; row.sheetSer = same.sheetSer; }
      if (same) updated++; else added++;
      puts.push(row);
      if (file.photos && file.photos[w.id]) {
        var full = dataUrlToBlob(file.photos[w.id]);
        photoJobs.push(function () { return Photos.add(row.id, full); });
      }
    });
    return DB.putMany('wines', puts)
      .then(function () { return photoJobs.reduce(function (p, j) { return p.then(j); }, Promise.resolve()); })
      .then(loadRows).then(function () { if (window.Sync) Sync.soon(); return { added: added, updated: updated }; });
  },
  csv: function () {
    var cols = ['Timestamp'].concat(QS.map(function (q) { return q.title; }));
    var esc = function (v) { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [cols.map(esc).join(',')];
    ROWS.slice().sort(function (a, b) { return keyOf(a) < keyOf(b) ? -1 : 1; }).forEach(function (r) {
      lines.push([new Date(r.ts || Date.now()).toLocaleString('en-US')].concat(QS.map(function (q) { return rowCell(r, q.key); })).map(esc).join(','));
    });
    return new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' });
  }
};

/** The value a saved note puts in one Tasting Log column (same layout as the Google edition). */
function rowCell(r, key) {
  switch (key) {
    case 'colorWhite': return r.type === 'White' ? (r.color || '') : '';
    case 'colorRose': return r.type === 'Rosé' ? (r.color || '') : '';
    case 'colorRed': return r.type === 'Red' ? (r.color || '') : '';
    case 'photo': return r.photoUrl || '';
    default: return r[key] == null ? '' : r[key];
  }
}

/** Hand a file to the iPhone / iPad share sheet, or download it elsewhere. */
function shareFile(blob, name, title) {
  var file;
  try { file = new File([blob], name, { type: blob.type }); } catch (e) { file = null; }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    return navigator.share({ files: [file], title: title || name }).catch(function (e) { if (e && e.name !== 'AbortError') throw e; });
  }
  var standalone = navigator.standalone || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  if (standalone) { var u = URL.createObjectURL(blob); var win = window.open(u, '_blank'); if (!win) location.href = u; setTimeout(function () { URL.revokeObjectURL(u); }, 60000); return Promise.resolve(); }
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  return Promise.resolve();
}
/*build*/(window.__V = window.__V || {})['store'] = 'v2.31';
