/* Blind Tasting Notes — optional Google Sheets connection.
   Uses only the drive.file permission: the app can see the Sheet it creates (or the one you pick) and its own photo folder. */
"use strict";

var GOOGLE = {
  CLIENT_ID: '717186518901-81ldp74tsdullm4hpo4mvtds0be19b4t.apps.googleusercontent.com',
  API_KEY: 'AIzaSyDiX4US0qXZSIhuhJZKqcwVzjI5hoL0bDM',
  APP_ID: '717186518901',
  SCOPE: 'https://www.googleapis.com/auth/drive.file'
};
var LOG_TAB = 'Tasting Log', PHOTO_FOLDER = 'Blind Tasting Notes — Labels';

var Sync = (function () {
  var CONF_KEY = 'btn-google', TOK_KEY = 'btn-gtoken';
  var conf = read(CONF_KEY) || {}, tok = read(TOK_KEY), state = conf.sheetId ? 'idle' : 'off', timer = null, running = null, listeners = [];
  function read(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function write(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function set(s, detail) { state = s; listeners.forEach(function (f) { f(s, detail); }); }
  function tokenOk() { return tok && tok.exp > Date.now() + 60000; }

  /* ---------------- scripts */
  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    return (loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { delete loaded[src]; rej(new Error('Could not reach Google. Check your connection.')); };
      document.head.appendChild(s);
    }));
  }

  /* ---------------- sign-in (must start from a tap) */
  /* Google's sign-in window must open straight from a tap (Safari blocks it otherwise), so the sign-in
     library is loaded ahead of time and the window is opened without waiting on anything. */
  var client = null, pending = null;
  function gisReady() { return !!(window.google && google.accounts && google.accounts.oauth2); }
  function makeClient() {
    if (client || !gisReady()) return client;
    client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE.CLIENT_ID, scope: GOOGLE.SCOPE,
      callback: function (r) {
        var p = pending; pending = null; if (!p) return;
        if (r && r.access_token) {
          tok = { t: r.access_token, exp: Date.now() + (Number(r.expires_in) || 3500) * 1000 };
          write(TOK_KEY, tok); conf.consented = true; write(CONF_KEY, conf); p.res(tok.t);
          if (!conf.hint) g('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)').then(function (a) {
            if (a && a.user && a.user.emailAddress) { conf.hint = a.user.emailAddress; write(CONF_KEY, conf); } }).catch(function () {});
        } else p.rej(new Error((r && (r.error_description || r.error)) || 'Google sign-in was cancelled.'));
      },
      error_callback: function (e) {
        var p = pending; pending = null; if (!p) return;
        p.rej(new Error(e && e.type === 'popup_closed' ? 'Google sign-in was closed before it finished.' :
          'Google sign-in did not open. Check that pop-ups are allowed, then try again.'));
      }
    });
    return client;
  }
  function preload() {
    if (!navigator.onLine) return Promise.resolve(false);
    return loadScript('https://accounts.google.com/gsi/client').then(function () { makeClient(); return true; }, function () { return false; });
  }
  function signIn() {
    if (makeClient()) {                                  // ready: open Google's window right now, inside the tap
      return new Promise(function (res, rej) {
        pending = { res: res, rej: rej };
        var o = { prompt: conf.consented ? '' : 'consent' }; if (conf.hint) o.login_hint = conf.hint;
        client.requestAccessToken(o);
      });
    }
    return preload().then(function (ok) {
      if (!ok) throw new Error('Could not reach Google. Check your connection and try again.');
      throw new Error('Google is ready now — tap the button once more to sign in.');
    });
  }
  function token(interactive) {
    if (tokenOk()) return Promise.resolve(tok.t);
    if (!interactive) return Promise.reject(Object.assign(new Error('signin'), { signin: true }));
    return signIn();
  }

  /* ---------------- REST helper */
  function g(url, opts) {
    opts = opts || {};
    return token(false).then(function (t) {
      var h = opts.headers || {}; h.Authorization = 'Bearer ' + t;
      if (opts.json !== undefined) { h['Content-Type'] = 'application/json'; opts.body = JSON.stringify(opts.json); }
      return fetch(url, { method: opts.method || 'GET', headers: h, body: opts.body });
    }).then(function (r) {
      if (r.status === 401) { tok = null; write(TOK_KEY, null); throw Object.assign(new Error('signin'), { signin: true }); }
      if (!r.ok) return r.text().then(function (t) {
        var m = ''; try { m = JSON.parse(t).error.message; } catch (e) { m = t.slice(0, 200); }
        throw Object.assign(new Error('Google said: ' + m), { status: r.status });
      });
      return opts.raw ? r : r.json();
    });
  }
  var SHEETS = 'https://sheets.googleapis.com/v4/spreadsheets/', DRIVE = 'https://www.googleapis.com/drive/v3/files';

  /* ---------------- connect */
  function headerTitles() { return ['Timestamp'].concat(QS.map(function (q) { return q.title; })); }
  function remember(id, url, name) { conf.sheetId = id; conf.sheetUrl = url; conf.sheetName = name; conf.lastSync = 0; write(CONF_KEY, conf); }

  function createSheet() {
    return token(true).then(function () {
      var hdr = headerTitles();
      return g(SHEETS.replace(/\/$/, ''), { method: 'POST', json: {
        properties: { title: 'Blind Tasting Notes' },
        sheets: [{ properties: { title: LOG_TAB, gridProperties: { frozenRowCount: 1, frozenColumnCount: 3, columnCount: hdr.length + 2 } } }]
      } }).then(function (ss) {
        var sid = ss.sheets[0].properties.sheetId;
        var dateCol = hdr.indexOf('Tasting Date');
        return g(SHEETS + ss.spreadsheetId + '/values/' + encodeURIComponent("'" + LOG_TAB + "'!A1") + '?valueInputOption=RAW', { method: 'PUT', json: { values: [hdr] } })
          .then(function () {
            return g(SHEETS + ss.spreadsheetId + ':batchUpdate', { method: 'POST', json: { requests: [
              { repeatCell: { range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 }, cell: { userEnteredFormat: {
                backgroundColor: { red: .902, green: .835, blue: .855 }, textFormat: { bold: true, foregroundColor: { red: .427, green: .102, blue: .212 } }, wrapStrategy: 'WRAP', verticalAlignment: 'MIDDLE' } },
                fields: 'userEnteredFormat(backgroundColor,textFormat,wrapStrategy,verticalAlignment)' } },
              { repeatCell: { range: { sheetId: sid, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE_TIME', pattern: 'm/d/yy h:mm' } } }, fields: 'userEnteredFormat.numberFormat' } },
              { repeatCell: { range: { sheetId: sid, startRowIndex: 1, startColumnIndex: dateCol, endColumnIndex: dateCol + 1 }, cell: { userEnteredFormat: { numberFormat: { type: 'DATE', pattern: 'm/d/yy' } } }, fields: 'userEnteredFormat.numberFormat' } },
              { updateDimensionProperties: { range: { sheetId: sid, dimension: 'COLUMNS', startIndex: 0, endIndex: hdr.length }, properties: { pixelSize: 130 }, fields: 'pixelSize' } }
            ] } });
          })
          .then(function () { remember(ss.spreadsheetId, ss.spreadsheetUrl, 'Blind Tasting Notes'); return markAllDirty(); })
          .then(function () { return sync(true); })
          .then(function () { return conf; });
      });
    });
  }

  function pickSheet() {
    return token(true).then(function (t) {
      return loadScript('https://apis.google.com/js/api.js').then(function () {
        return new Promise(function (res, rej) { gapi.load('picker', { callback: res, onerror: function () { rej(new Error('Could not open Google Drive.')); } }); });
      }).then(function () {
        return new Promise(function (res, rej) {
          var view = new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS).setMode(google.picker.DocsViewMode.LIST);
          var picker = new google.picker.PickerBuilder()
            .addView(view).setOAuthToken(t).setDeveloperKey(GOOGLE.API_KEY).setAppId(GOOGLE.APP_ID)
            .setTitle('Choose your Blind Tasting Notes Sheet')
            .setCallback(function (d) {
              if (d.action === google.picker.Action.PICKED) res(d.docs[0]);
              else if (d.action === google.picker.Action.CANCEL) rej(Object.assign(new Error('No Sheet chosen.'), { quiet: true }));
            }).build();
          picker.setVisible(true);
        });
      });
    }).then(function (doc) {
      return g(SHEETS + doc.id + '?fields=spreadsheetUrl,properties.title,sheets.properties.title').then(function (ss) {
        var tabs = ss.sheets.map(function (s) { return s.properties.title; });
        if (tabs.indexOf(LOG_TAB) < 0) throw new Error('That Sheet has no "' + LOG_TAB + '" tab. Choose your Blind Tasting Notes Sheet, or create a new one.');
        remember(doc.id, ss.spreadsheetUrl, ss.properties.title);
        return markAllDirty().then(function () { return sync(true); }).then(function () { return conf; });
      });
    });
  }

  function disconnect() { conf = { consented: conf.consented }; write(CONF_KEY, conf); set('off'); }
  function markAllDirty() { ROWS.forEach(function (r) { r.dirty = true; }); return DB.putMany('wines', ROWS); }

  /* ---------------- photos → Drive folder */
  function folderId() {
    if (conf.folderId) return Promise.resolve(conf.folderId);
    return g(DRIVE + '?fields=id', { method: 'POST', json: { name: PHOTO_FOLDER, mimeType: 'application/vnd.google-apps.folder' } })
      .then(function (f) { conf.folderId = f.id; write(CONF_KEY, conf); return f.id; });
  }
  function uploadPhoto(row) {
    return Photos.get(row.id).then(function (p) {
      if (!p || p.driveId) return p && p.driveId;
      return folderId().then(function (fid) {
        var meta = { name: (row.producer || 'Wine') + ' · ' + row.date + ' #' + row.wineNo + '.jpg', parents: [fid] };
        var b = 'btn' + Date.now(), body = new Blob(['--' + b + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n', JSON.stringify(meta),
          '\r\n--' + b + '\r\nContent-Type: image/jpeg\r\n\r\n', p.full, '\r\n--' + b + '--'], { type: 'multipart/related; boundary=' + b });
        return g('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', body: body, headers: { 'Content-Type': 'multipart/related; boundary=' + b } });
      }).then(function (f) { p.driveId = f.id; return DB.put('photos', p).then(function () { return f.id; }); });
    });
  }
  /** A photo saved from another device: fetch it from Drive once and keep it here. */
  function fetchPhoto(row) {
    var m = String(row.photoUrl || '').match(/\/d\/([\w-]+)/);
    if (!m || !tokenOk()) return Promise.resolve(null);
    return g(DRIVE + '/' + m[1] + '?alt=media', { raw: true }).then(function (r) { return r.blob(); })
      .then(function (blob) { return Photos.add(row.id, blob); }).then(function (p) { p.driveId = m[1]; return DB.put('photos', p); })
      .catch(function () { return null; });
  }

  /* ---------------- two-way sync with the Tasting Log */
  function serialToYmd(v) { var d = new Date(Math.round((Number(v) - 25569) * 86400000)); return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
  function cellYmd(v) {
    if (typeof v === 'number') return serialToYmd(v);
    var s = String(v || '').trim(), m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return m[1] + '-' + pad2(+m[2]) + '-' + pad2(+m[3]);
    if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + pad2(+m[1]) + '-' + pad2(+m[2]);
    return '';
  }
  function wallSerial(ms) { var d = new Date(ms); return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) / 86400000 + 25569; }
  function stamp(ms) { var d = new Date(ms); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()); }
  function safe(v) { v = v == null ? '' : String(v); return /^[=+\-@]/.test(v) ? "'" + v : v; }

  function sheetRowToRec(hdr, row) {
    var rec = {};
    hdr.forEach(function (h, i) {
      var q = QS.filter(function (x) { return x.title === h; })[0];
      if (!q) return;
      var v = row[i];
      if (q.key === 'date') rec.date = cellYmd(v);
      else if (q.key === 'wineNo') rec.wineNo = Number(v) || '';
      else if (q.key === 'photo') rec.photoUrl = v == null ? '' : String(v);
      else rec[q.key] = v == null ? '' : String(v);
    });
    rec.color = rec.colorWhite || rec.colorRose || rec.colorRed || '';
    delete rec.colorWhite; delete rec.colorRose; delete rec.colorRed;
    if (!rec.type && rec.color) rec.type = L.white.indexOf(rec.color) >= 0 ? 'White' : L.rose.indexOf(rec.color) >= 0 ? 'Rosé' : 'Red';
    return rec;
  }
  function recToSheetRow(hdr, base, r) {
    var out = hdr.map(function (h, i) { return base && base[i] !== undefined && base[i] !== null ? base[i] : ''; });
    hdr.forEach(function (h, i) {
      if (h === 'Timestamp') { out[i] = stamp(r.ts || Date.now()); return; }
      var q = QS.filter(function (x) { return x.title === h; })[0];
      if (!q) return;
      if (q.key === 'date') out[i] = r.date;
      else if (q.key === 'wineNo') out[i] = Number(r.wineNo);
      else if (/^g(Grape|Country|Region|Vintage)$/.test(q.key) && r.open) out[i] = '';
      else out[i] = safe(rowCell(r, q.key));
    });
    return out;
  }

  function sync(interactive) {
    if (!conf.sheetId) return Promise.resolve(false);
    if (running) return running;
    if (!navigator.onLine) { set('offline'); return Promise.resolve(false); }
    running = token(!!interactive).then(function () {
      set('syncing');
      // 1) label photos first, so their links go into the Sheet
      var needPhoto = ROWS.filter(function (r) { return (r.dirty || r.photoFix) && r.hasPhoto; });
      return needPhoto.reduce(function (p, r) {
        return p.then(function () { return uploadPhoto(r).then(function (id) { if (id) r.photoUrl = 'https://drive.google.com/file/d/' + id + '/view'; }); });
      }, Promise.resolve());
    }).then(function () {
      return g(SHEETS + conf.sheetId + '/values/' + encodeURIComponent("'" + LOG_TAB + "'!A1:ZZ") + '?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER');
    }).then(function (res) {
      var vals = res.values || [], hdr = (vals[0] || []).map(String), want = headerTitles(), hdrChanged = false;
      want.forEach(function (t) { if (hdr.indexOf(t) < 0) { hdr.push(t); hdrChanged = true; } });
      var tsCol = hdr.indexOf('Timestamp');
      var sheet = {};                                  // key → { r: row number, ts, rec, raw }
      for (var i = 1; i < vals.length; i++) {
        var rec = sheetRowToRec(hdr, vals[i]);
        if (!rec.date || !rec.wineNo) continue;
        var k = rec.date + '#' + Number(rec.wineNo);
        var ser = tsCol >= 0 && typeof vals[i][tsCol] === 'number' ? vals[i][tsCol] : 0;
        if (!sheet[k] || ser >= sheet[k].ser) sheet[k] = { r: i + 1, ser: ser, rec: rec, raw: vals[i] };
      }
      var tomb = (conf.tomb || []).filter(function (k) { return !ROWS.some(function (r) { return keyOf(r) === k; }); });
      var dropRows = tomb.map(function (k) { return sheet[k] ? sheet[k].r : 0; }).filter(Boolean).sort(function (a, b) { return b - a; });
      var updates = [], appends = [], localPuts = [], seen = {};
      ROWS.forEach(function (row) {
        var k = keyOf(row), s = sheet[k] || (row.sheetKey && sheet[row.sheetKey]) || null;
        if (s) seen[sheet[k] === s ? k : row.sheetKey] = true;
        if (!s) {                                                    // not in the Sheet yet
          if (row.dirty || !row.sheetKey) { appends.push(recToSheetRow(hdr, null, row)); row.dirty = false; delete row.photoFix; row.sheetKey = k; row.sheetSer = wallSerial(row.ts); localPuts.push(row); }
          return;
        }
        var sheetChanged = row.sheetSer == null || Math.abs(s.ser - row.sheetSer) > 1.5 / 86400;
        if (row.photoFix) {                                          // a recovered photo: keep any newer edits from the Sheet, add the photo link
          if (sheetChanged && !row.dirty) { var keep = { id: row.id, hasPhoto: true, photoUrl: row.photoUrl }; for (var f in s.rec) row[f] = s.rec[f]; for (var kk in keep) row[kk] = keep[kk]; }
          delete row.photoFix; row.dirty = true; row.ts = Date.now();
        }
        if (row.dirty) {                                             // edited here: this note wins
          updates.push({ range: "'" + LOG_TAB + "'!A" + s.r, values: [recToSheetRow(hdr, s.raw, row)] });
          row.dirty = false; row.sheetKey = k; row.sheetSer = wallSerial(row.ts); localPuts.push(row);
        } else if (sheetChanged) {                                   // edited in the Sheet (or on another device)
          var nr = s.rec; nr.id = row.id; nr.ts = Date.now(); nr.sheetKey = k; nr.sheetSer = s.ser; nr.dirty = false;
          nr.hasPhoto = row.hasPhoto; if (row.photoUrl && !nr.photoUrl) nr.photoUrl = row.photoUrl;
          localPuts.push(nr);
        }
      });
      Object.keys(sheet).forEach(function (k) {
        if (seen[k] || tomb.indexOf(k) >= 0 || ROWS.some(function (r) { return keyOf(r) === k; })) return;
        var nr = sheet[k].rec; nr.id = uid(); nr.ts = Date.now(); nr.sheetKey = k; nr.sheetSer = sheet[k].ser; nr.dirty = false;
        localPuts.push(nr);
      });
      var lastRow = vals.length;
      appends.forEach(function (v, j) { updates.push({ range: "'" + LOG_TAB + "'!A" + (lastRow + 1 + j), values: [v] }); });
      if (hdrChanged) updates.push({ range: "'" + LOG_TAB + "'!A1", values: [hdr] });
      var push = updates.length ? g(SHEETS + conf.sheetId + '/values:batchUpdate', { method: 'POST', json: { valueInputOption: 'USER_ENTERED', data: updates } }) : Promise.resolve();
      var drop = function () {
        if (!dropRows.length) return Promise.resolve();
        return g(SHEETS + conf.sheetId + '?fields=sheets.properties').then(function (meta) {
          var tab = (meta.sheets || []).map(function (x) { return x.properties; }).filter(function (pr) { return pr.title === LOG_TAB; })[0];
          if (!tab) return;
          return g(SHEETS + conf.sheetId + ':batchUpdate', { method: 'POST', json: { requests: dropRows.map(function (r) {
            return { deleteDimension: { range: { sheetId: tab.sheetId, dimension: 'ROWS', startIndex: r - 1, endIndex: r } } }; }) } });
        });
      };
      return push.then(drop).then(function () { conf.tomb = []; write(CONF_KEY, conf); return DB.putMany('wines', localPuts); }).then(loadRows).then(function () {
        conf.lastSync = Date.now(); write(CONF_KEY, conf);
        var pulls = ROWS.filter(function (r) { return r.photoUrl && !r.hasPhoto; });
        return pulls.reduce(function (p, r) {
          return p.then(function () { return fetchPhoto(r).then(function (got) { if (got) { r.hasPhoto = true; return DB.put('wines', r); } }); });
        }, Promise.resolve());
      }).then(loadRows).then(function () {
        set('synced', { sent: updates.length - (hdrChanged ? 1 : 0), got: localPuts.length });
        return true;
      });
    }).catch(function (e) {
      if (e && e.signin) set('signin'); else set('error', e);
      if (interactive) throw e;
      return false;
    }).then(function (v) { running = null; return v; }, function (e) { running = null; throw e; });
    return running;
  }

  function soon() {
    if (!conf.sheetId) return;
    clearTimeout(timer);
    if (!tokenOk()) { set('signin'); return; }
    timer = setTimeout(function () { sync(false).then(function (ok) { if (ok && window.onSynced) onSynced(); }); }, 600);
  }
  window.addEventListener('online', function () { if (conf.sheetId) soon(); });

  return {
    on: function (f) { listeners.push(f); f(state); },
    state: function () { return state; },
    config: function () { return conf; },
    connected: function () { return !!conf.sheetId; },
    signedIn: tokenOk,
    createSheet: createSheet, pickSheet: pickSheet, disconnect: disconnect, sync: sync, soon: soon, signIn: signIn, preload: preload,
    forget: function (key) { if (!conf.sheetId || !key) return; conf.tomb = (conf.tomb || []).filter(function (k) { return k !== key; }).concat([key]); write(CONF_KEY, conf); }
  };
})();
/*build*/(window.__V = window.__V || {})['google'] = 'v2.20';
