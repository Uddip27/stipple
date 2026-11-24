/* PhotoQR — studio workflow layer.
   Builds on the engine and state in app.js: content-type builder, live
   readability check, undo/redo, templates, saved designs and the mobile
   mini preview. Everything here runs in the browser; saved designs live in
   localStorage on this device only. */
'use strict';

(() => {
  /* ---------------- content types ---------------- */

  const TYPE_PANELS = { link: 'freeFields', text: 'freeFields', wifi: 'wifiFields', email: 'emailFields', phone: 'phoneFields' };
  const drafts = { link: '', text: '' };

  const wifiEsc = (s) => s.replace(/([\\;,:"])/g, '\\$1');
  const wifiUnesc = (s) => s.replace(/\\([\\;,:"])/g, '$1');

  function detectType(text) {
    if (/^WIFI:/i.test(text)) return 'wifi';
    if (/^mailto:/i.test(text)) return 'email';
    if (/^tel:/i.test(text)) return 'phone';
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text) || looksLikeDomain(text)) return 'link';
    return text ? 'text' : 'link';
  }

  function looksLikeDomain(text) {
    return /^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+([/?#]\S*)?$/i.test(text.trim());
  }

  function buildText(type) {
    if (type === 'wifi') {
      const ssid = $('wifiSsid').value;
      if (!ssid) return '';
      const sec = $('wifiSec').value;
      return `WIFI:T:${sec};S:${wifiEsc(ssid)};${sec !== 'nopass' ? `P:${wifiEsc($('wifiPass').value)};` : ''}${$('wifiHidden').checked ? 'H:true;' : ''};`;
    }
    if (type === 'email') {
      const to = $('emailTo').value.trim();
      if (!to) return '';
      const q = [];
      if ($('emailSubject').value) q.push('subject=' + encodeURIComponent($('emailSubject').value));
      if ($('emailBody').value) q.push('body=' + encodeURIComponent($('emailBody').value));
      return `mailto:${to}${q.length ? '?' + q.join('&') : ''}`;
    }
    if (type === 'phone') {
      const num = $('phoneNumber').value.replace(/[^\d+]/g, '');
      return num ? `tel:${num}` : '';
    }
    return els.text.value;
  }

  function fillFields(type, text) {
    if (type === 'wifi') {
      const field = (k) => {
        const m = text.match(new RegExp(`[:;]${k}:((?:\\\\.|[^;])*)`));
        return m ? wifiUnesc(m[1]) : '';
      };
      $('wifiSsid').value = field('S');
      $('wifiPass').value = field('P');
      $('wifiSec').value = ['WPA', 'WEP', 'nopass'].includes(field('T')) ? field('T') : 'WPA';
      $('wifiHidden').checked = field('H') === 'true';
    } else if (type === 'email') {
      const m = text.match(/^mailto:([^?]*)\??(.*)$/i);
      const params = new URLSearchParams(m ? m[2] : '');
      $('emailTo').value = m ? decodeURIComponent(m[1]) : '';
      $('emailSubject').value = params.get('subject') || '';
      $('emailBody').value = params.get('body') || '';
    } else if (type === 'phone') {
      $('phoneNumber').value = text.replace(/^tel:/i, '');
    }
  }

  function setText(text) {
    clearTimeout(textTimer);
    els.text.value = text;
    state.text = text;
    els.charCount.textContent = text.length;
    syncLinkHint();
    scheduleRender();
  }

  function syncTypeUI() {
    const type = state.contentType;
    syncSegmented('#contentType', 'type', type);
    Object.values(TYPE_PANELS).forEach((id) => { $(id).hidden = true; });
    $(TYPE_PANELS[type]).hidden = false;
    $('textLabel').textContent = type === 'text' ? 'Message' : 'Link';
    els.text.placeholder = type === 'text' ? 'A note, a poem, a greeting…' : 'https://your-site.com';
    syncLinkHint();
  }

  function selectType(type, { keepText = false } = {}) {
    const prev = state.contentType;
    if (prev === 'link' || prev === 'text') drafts[prev] = els.text.value;
    state.contentType = type;
    syncTypeUI();
    if (keepText) return;
    if (type === 'link' || type === 'text') {
      const current = els.text.value;
      const reuse = (prev === 'link' || prev === 'text') ? current : drafts[type];
      setText(reuse ?? '');
      els.text.focus();
    } else {
      fillFields(type, detectType(els.text.value) === type ? els.text.value : '');
      setText(buildText(type));
      $(TYPE_PANELS[type]).querySelector('input')?.focus();
    }
  }

  function syncLinkHint() {
    const t = els.text.value.trim();
    const show = state.contentType === 'link' && t && !/^[a-z][a-z0-9+.-]*:/i.test(t) && looksLikeDomain(t);
    $('linkHint').hidden = !show;
  }

  $$('#contentType button').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.type !== state.contentType) selectType(b.dataset.type);
  }));
  els.text.addEventListener('input', syncLinkHint);
  $('linkFix').addEventListener('click', () => setText('https://' + els.text.value.trim()));
  ['wifiSsid', 'wifiPass', 'wifiSec', 'wifiHidden', 'emailTo', 'emailSubject', 'emailBody', 'phoneNumber'].forEach((id) => {
    $(id).addEventListener($(id).tagName === 'SELECT' || $(id).type === 'checkbox' ? 'change' : 'input', () => setText(buildText(state.contentType)));
  });
  $('clearText').addEventListener('click', () => {
    if (state.contentType !== 'link' && state.contentType !== 'text') {
      fillFields(state.contentType, '');
      setText('');
    }
    syncLinkHint();
  });

  function syncCapacity(info) {
    const v = info ? info.version : 0;
    $('capacityFill').style.width = `${Math.min(100, Math.max(4, (v / 15) * 100))}%`;
    const cap = $('capacity');
    cap.dataset.level = !info ? 'none' : v <= 6 ? 'light' : v <= 10 ? 'medium' : 'dense';
    $('capacityLabel').textContent = !info ? (state.text.trim() ? 'Too long for one code' : 'Nothing to encode yet')
      : v <= 6 ? 'Light and quick to scan'
        : v <= 10 ? 'Comfortable density'
          : 'Dense. Shorten it for easier scanning';
  }

  /* ---------------- readability check ---------------- */

  let checkTimer = 0;
  let checkRun = 0;
  let lastCheck = null;

  function scheduleCheck(info) {
    clearTimeout(checkTimer);
    const box = $('scanCheck');
    if (!info) {
      lastCheck = null;
      box.dataset.level = 'idle';
      $('scanTitle').textContent = 'Waiting for content';
      $('scanDetail').textContent = 'Add a link or message and the code is checked automatically.';
      $('scanFix').hidden = true;
      return;
    }
    box.dataset.level = 'pending';
    checkTimer = setTimeout(runCheck, 260);
  }

  async function runCheck() {
    const run = ++checkRun;
    const text = state.text.trim();
    if (!text || !state.hasResult) return;
    const result = PhotoQRCheck.analyse(els.canvas, state, getMatrix(text), SIZE);
    lastCheck = result;
    paintCheck(result, null);
    const decoded = await PhotoQRCheck.decode(els.canvas, text);
    if (run !== checkRun) return;
    paintCheck(result, decoded);
  }

  function paintCheck(r, decoded) {
    let level = r.level;
    if (decoded === false && level === 'good') level = 'fair';
    if (decoded === true && level === 'fair' && r.issues.every((i) => i.key === 'dense' || i.key === 'noise')) level = 'good';
    $('scanCheck').dataset.level = level;
    const pct = (x) => Math.round(x * 100);
    $('scanTitle').textContent = level === 'good' ? 'Scans reliably' : level === 'fair' ? 'Should scan, worth a check' : 'Likely hard to scan';
    let detail = level === 'good'
      ? `Strong contrast (${pct(r.contrast)}%) and a clean pattern.`
      : (r.issues[0]?.text || 'Some dots are hard to tell apart.');
    if (decoded === true) detail += ' Decoded successfully in this browser.';
    else if (decoded === false) detail += ' This browser’s scanner could not read it.';
    $('scanDetail').textContent = detail;
    $('scanFix').hidden = level === 'good';
  }

  function improveReadability() {
    const r = lastCheck;
    if (!r) return;
    const keys = new Set(r.issues.map((i) => i.key));
    const deepen = (hex, k = 0.55) => '#' + hexToRgb(hex).map((v) => Math.round(v * (1 - k)).toString(16).padStart(2, '0')).join('');
    if (keys.has('logo')) state.logoInset = Math.min(state.logoInset, 18);
    if (state.mode === 'watermark') {
      state.overlay = Math.max(state.overlay, 62);
      state.dark.alpha = Math.max(state.dark.alpha, 0.92);
      state.light.alpha = Math.max(state.light.alpha, 0.8);
      state.dotScale = Math.max(state.dotScale, 0.44);
      if (keys.has('inverted') || keys.has('contrast')) state.dark.hex = deepen(state.dark.hex);
    } else if (keys.has('inverted') || keys.has('contrast') || keys.has('noise')) {
      state.dark.hex = deepen(state.dark.hex);
      if (state.colorType !== 'solid') state.gradEnd = deepen(state.gradEnd, 0.4);
      state.finder = deepen(state.finder, 0.4);
      state.paper = '#ffffff';
      if (state.mode === 'halftone') state.threshold = Math.min(0.9, state.threshold + 0.1);
    }
    if (keys.has('dense')) toast('Shorter content gives a simpler, easier code');
    syncUI();
    scheduleRender();
    toast('Adjusted for scanning. Undo anytime.');
  }
  $('scanFix').addEventListener('click', improveReadability);

  /* ---------------- undo / redo ---------------- */

  const SNAP_KEYS = ['text', 'contentType', 'mode', 'dotScale', 'dotStyle', 'colorType', 'gradAngle', 'gradEnd', 'logoInset',
    'logoShape', 'threshold', 'dark', 'light', 'finder', 'overlay', 'paper', 'frame', 'frameText', 'zoom', 'panX', 'panY'];
  const history = [];
  let cursor = -1;
  let commitTimer = 0;

  const snapshot = () => JSON.stringify(Object.fromEntries(SNAP_KEYS.map((k) => [k, state[k]])));

  function commit() {
    const snap = snapshot();
    if (history[cursor] === snap) return;
    history.splice(cursor + 1);
    history.push(snap);
    if (history.length > 100) history.shift();
    cursor = history.length - 1;
    syncHistoryUI();
  }

  function restore(snap) {
    const data = JSON.parse(snap);
    clearTimeout(textTimer);
    Object.assign(state, data, { dark: { ...data.dark }, light: { ...data.light } });
    els.text.value = state.text;
    if (state.contentType !== 'link' && state.contentType !== 'text') fillFields(state.contentType, state.text);
    syncTypeUI();
    syncUI();
    scheduleRender();
  }

  function step(dir) {
    clearTimeout(commitTimer);
    commit();
    const next = cursor + dir;
    if (next < 0 || next >= history.length) return;
    cursor = next;
    restore(history[cursor]);
    syncHistoryUI();
  }

  function syncHistoryUI() {
    $('undoBtn').disabled = cursor <= 0;
    $('redoBtn').disabled = cursor >= history.length - 1;
  }

  $('undoBtn').addEventListener('click', () => step(-1));
  $('redoBtn').addEventListener('click', () => step(1));
  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key !== 'z' && key !== 'y') return;
    const t = e.target;
    const typing = t.isContentEditable || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' ||
      (t.tagName === 'INPUT' && !['range', 'color', 'checkbox', 'radio', 'button'].includes(t.type));
    if (typing || document.querySelector('dialog[open]')) return;
    e.preventDefault();
    step(key === 'y' || e.shiftKey ? 1 : -1);
  });

  /* ---------------- mobile mini preview ---------------- */

  const mini = $('miniPreview');
  const miniCtx = $('miniCanvas').getContext('2d');
  let studioVisible = false;
  let plateVisible = true;

  function syncMini() {
    mini.hidden = !(studioVisible && !plateVisible && state.hasResult && innerWidth <= 900);
  }
  function paintMini() {
    const c = $('miniCanvas');
    const ratio = els.canvas.height / els.canvas.width;
    c.height = Math.round(c.width * ratio);
    miniCtx.drawImage(els.canvas, 0, 0, c.width, c.height);
  }
  new IntersectionObserver(([e]) => { studioVisible = e.isIntersecting; syncMini(); }).observe($('studio'));
  new IntersectionObserver(([e]) => { plateVisible = e.isIntersecting; syncMini(); }, { threshold: 0.25 }).observe($('previewCard'));
  addEventListener('resize', syncMini, { passive: true });
  mini.addEventListener('click', () => {
    $('previewCard').scrollIntoView({ behavior: motionPreference.matches ? 'auto' : 'smooth', block: 'center' });
  });

  /* ---------------- render subscription ---------------- */

  renderHooks.push((info) => {
    syncCapacity(info);
    scheduleCheck(info);
    if (info) paintMini();
    syncMini();
    clearTimeout(commitTimer);
    commitTimer = setTimeout(commit, 380);
  });

  /* ---------------- templates ---------------- */

  const TEMPLATES = [
    { id: 'clear', name: 'Clear Photo', note: 'Full-colour photo, solid dots', sampleId: 'landscape', mode: 'watermark', dotStyle: 'circle', dotScale: 0.36,
      dark: { hex: '#1e293b', alpha: 1 }, light: { hex: '#ffffff', alpha: 1 }, finder: '#334155', overlay: 0 },
    { id: 'alpine', ...PRESETS.alpine, mode: 'watermark', note: 'Photo, soft rounded dots' },
    { id: 'drive', ...PRESETS.drive, mode: 'watermark', note: 'Photo, crisp circles' },
    { id: 'press', name: 'Halftone Press', note: 'The photo becomes the dots', sampleId: 'abstract', mode: 'halftone', dotStyle: 'circle', dotScale: 0.4, threshold: 0.55,
      dark: { hex: '#111827', alpha: 1 }, light: { hex: '#ffffff', alpha: 0.75 }, finder: '#111827', overlay: 55 },
    { id: 'ink', name: 'Classic Ink', note: 'Clean, bold, prints anywhere', mode: 'geometric', dotStyle: 'rounded', dotScale: 0.6,
      dark: { hex: '#141a17', alpha: 1 }, light: { hex: '#ffffff', alpha: 0.75 }, finder: '#141a17', overlay: 55, paper: '#ffffff' },
    { id: 'citrus', name: 'Citrus Grove', note: 'Gradient ink with a label', mode: 'geometric', dotStyle: 'circle', dotScale: 0.6,
      colorType: 'linear', gradAngle: 45, gradEnd: '#9a3412', dark: { hex: '#1f3d2b', alpha: 1 }, light: { hex: '#ffffff', alpha: 0.75 },
      finder: '#1f3d2b', overlay: 55, paper: '#fbf8f1', frame: 'light', frameText: 'Scan me' },
    { id: 'brand', name: 'Brand Card', note: 'Your logo at the centre', mode: 'logo', dotStyle: 'rounded', dotScale: 0.56, logoShape: 'rounded', logoInset: 20,
      dark: { hex: '#1e293b', alpha: 1 }, light: { hex: '#ffffff', alpha: 0.75 }, finder: '#0f172a', overlay: 55, frame: 'dark', frameText: 'Scan to visit' },
    { id: 'lines', name: 'Harbour Lines', note: 'Connected strokes', mode: 'geometric', dotStyle: 'lines', dotScale: 0.56,
      dark: { hex: '#0b3b5a', alpha: 1 }, light: { hex: '#ffffff', alpha: 0.75 }, finder: '#0b3b5a', overlay: 55, paper: '#f3f7fa' },
    { id: 'flux', ...PRESETS.flux, mode: 'watermark', note: 'Photo, high contrast' },
  ];

  async function renderTemplates() {
    const grid = $('templateGrid');
    grid.innerHTML = '';
    const samples = Object.fromEntries(await Promise.all(SAMPLES.map(async (s) => [s.id, await decodeImage(s.src).catch(() => null)])));
    TEMPLATES.forEach((t) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'template-card';
      btn.dataset.template = t.id;
      const cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      btn.append(cv);
      const label = document.createElement('span');
      label.className = 'template-name';
      label.textContent = t.name;
      const note = document.createElement('span');
      note.className = 'template-note';
      note.textContent = t.note;
      btn.append(label, note);
      grid.append(btn);
      try {
        renderQR(cv, { ...DEFAULTS, ...t, text: DEFAULTS.text, image: t.sampleId ? samples[t.sampleId] : null, logo: null, credit: false }, 240);
      } catch { /* thumbnail is decorative */ }
      btn.addEventListener('click', () => applyTemplate(t));
    });
    matrixText = undefined; // thumbnails used the demo text; force the main code to rebuild
  }

  function applyTemplate(t) {
    clearTimeout(textTimer);
    const text = els.text.value;
    const type = state.contentType;
    applyConfig({ ...DEFAULTS, ...t, text });
    state.contentType = type;
    syncTypeUI();
    if (t.sampleId) loadSample(t.sampleId, true);
    toast(`Template “${t.name}” applied`);
  }

  /* ---------------- saved designs ---------------- */

  const STORE_KEY = 'photoqr-designs';
  const dialog = $('designDialog');
  let dialogMode = null;

  function readStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || []; } catch { return []; }
  }
  function writeStore(list) {
    localStorage.setItem(STORE_KEY, JSON.stringify(list));
  }

  function rasterURL(img, max, type = 'image/jpeg', q = 0.85) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.min(1, max / Math.max(iw, ih));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(iw * s));
    c.height = Math.max(1, Math.round(ih * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL(type, q);
  }

  function defaultName() {
    const t = state.text.trim();
    try { if (/^https?:\/\//i.test(t)) return new URL(t).hostname.replace(/^www\./, ''); } catch { /* fallthrough */ }
    if (state.contentType === 'wifi') return `Wi-Fi · ${$('wifiSsid').value || 'network'}`;
    if (state.contentType === 'email') return `Email · ${$('emailTo').value}`;
    if (state.contentType === 'phone') return `Call · ${$('phoneNumber').value}`;
    return t.slice(0, 28) || `Design ${readStore().length + 1}`;
  }

  function buildEntry(name) {
    let bg = null;
    if (state.sampleId) bg = { sampleId: state.sampleId };
    else if (state.image) bg = { dataUrl: rasterURL(state.image, 1200) };
    const thumb = document.createElement('canvas');
    thumb.width = 160; thumb.height = 160;
    thumb.getContext('2d').drawImage(els.canvas, 0, 0, SIZE, SIZE, 0, 0, 160, 160);
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      updated: Date.now(),
      cfg: JSON.parse(snapshot()),
      bg,
      logo: state.logo ? rasterURL(state.logo, 512, 'image/png') : null,
      thumb: thumb.toDataURL('image/jpeg', 0.8),
    };
  }

  function persist(list, okMsg) {
    try {
      writeStore(list);
      renderSaved();
      if (okMsg) toast(okMsg);
      return true;
    } catch {
      toast('This browser’s storage is full. Delete a saved design and try again.', true);
      return false;
    }
  }

  function openDialog(mode, entry) {
    dialogMode = { mode, id: entry?.id };
    $('designDialogTitle').textContent = mode === 'rename' ? 'Rename design' : 'Save design';
    $('designSubmit').textContent = mode === 'rename' ? 'Rename' : 'Save';
    $('designName').value = entry ? entry.name : defaultName();
    dialog.showModal();
    $('designName').select();
  }

  function saveCurrent() {
    clearTimeout(textTimer);
    state.text = els.text.value;
    if (!state.text.trim() || !state.hasResult) { toast('Add some content before saving', true); return; }
    openDialog('save');
  }

  $('saveDesignBtn').addEventListener('click', saveCurrent);
  $('saveDesignInline').addEventListener('click', saveCurrent);
  $('designCancel').addEventListener('click', () => dialog.close());
  $('designForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('designName').value.trim();
    if (!name) return;
    const list = readStore();
    if (dialogMode?.mode === 'rename') {
      const item = list.find((d) => d.id === dialogMode.id);
      if (item) { item.name = name; persist(list, 'Design renamed'); }
    } else {
      const entry = buildEntry(name);
      if (state.animation) toast('Saved with the first frame of your GIF');
      persist([entry, ...list], `Saved “${name}”`);
      selectEditorTab('designs');
    }
    dialog.close();
  });

  async function openDesign(entry) {
    const cfg = entry.cfg;
    applyConfig({ ...DEFAULTS, ...cfg });
    state.contentType = cfg.contentType || detectType(cfg.text);
    if (state.contentType !== 'link' && state.contentType !== 'text') fillFields(state.contentType, cfg.text);
    syncTypeUI();
    try {
      if (entry.bg?.sampleId) await loadSample(entry.bg.sampleId, true);
      else if (entry.bg?.dataUrl) {
        const img = await decodeImage(entry.bg.dataUrl);
        setImage(img, entry.name, 'Saved background', entry.bg.dataUrl, null);
      } else removeImage();
      if (entry.logo) {
        const logo = await decodeImage(entry.logo);
        state.logo = logo;
        els.logoThumb.src = entry.logo;
        els.logoName.textContent = `${entry.name} logo`;
        els.logoSize.textContent = 'Saved logo';
        els.logoPreview.hidden = false;
        els.logoDrop.hidden = true;
      } else removeLogo(true);
    } catch {
      toast('Part of this design could not be restored', true);
    }
    state.zoom = cfg.zoom ?? 1;
    state.panX = cfg.panX ?? 0;
    state.panY = cfg.panY ?? 0;
    syncUI();
    scheduleRender();
    toast(`Opened “${entry.name}”`);
  }

  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICONS = {
    duplicate: icon('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    rename: icon('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
    remove: icon('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  };

  function renderSaved() {
    const list = readStore();
    const root = $('savedList');
    root.innerHTML = '';
    $('savedEmpty').hidden = list.length > 0;
    const fmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    list.forEach((entry) => {
      const row = document.createElement('div');
      row.className = 'saved-item';
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'saved-open';
      open.setAttribute('aria-label', `Open ${entry.name}`);
      const img = document.createElement('img');
      img.src = entry.thumb;
      img.alt = '';
      const meta = document.createElement('span');
      meta.className = 'saved-meta';
      const nm = document.createElement('span');
      nm.className = 'saved-name';
      nm.textContent = entry.name;
      const when = document.createElement('span');
      when.className = 'saved-date';
      when.textContent = fmt.format(entry.updated);
      meta.append(nm, when);
      open.append(img, meta);
      open.addEventListener('click', () => openDesign(entry));

      const actions = document.createElement('div');
      actions.className = 'saved-actions';
      const mk = (name, label, fn) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tool-btn';
        b.title = label;
        b.setAttribute('aria-label', `${label} ${entry.name}`);
        b.innerHTML = ICONS[name];
        b.addEventListener('click', fn);
        actions.append(b);
        return b;
      };
      mk('duplicate', 'Duplicate', () => {
        const all = readStore();
        const i = all.findIndex((d) => d.id === entry.id);
        const copy = { ...entry, id: Date.now().toString(36), name: `${entry.name} copy`, updated: Date.now() };
        all.splice(i + 1, 0, copy);
        persist(all, 'Design duplicated');
      });
      mk('rename', 'Rename', () => openDialog('rename', entry));
      const del = mk('remove', 'Delete', () => {
        if (!del.classList.contains('confirm')) {
          del.classList.add('confirm');
          del.title = 'Click again to delete';
          setTimeout(() => del.classList.remove('confirm'), 3000);
          toast('Click the bin again to delete');
          return;
        }
        persist(readStore().filter((d) => d.id !== entry.id), 'Design deleted');
      });
      row.append(open, actions);
      root.append(row);
    });
  }

  /* ---------------- boot ---------------- */

  state.contentType = detectType(els.text.value);
  syncTypeUI();
  renderSaved();
  renderTemplates();
})();
