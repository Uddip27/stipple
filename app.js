/* PhotoQR — artistic QR engine + UI */
'use strict';

qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];

const SIZE = 1200;
const MARGIN = 4;
const SAMPLES = window.PHOTOQR_SAMPLES;
const TAU = Math.PI * 2;
const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
const FRAME_DELAY = 100;

const DEFAULTS = {
  text: 'https://photoqr.io',
  mode: 'watermark',
  dotScale: 0.36,
  dotStyle: 'circle',
  colorType: 'solid',
  gradAngle: 45,
  gradEnd: '#e8431f',
  logoInset: 22,
  logoShape: 'circle',
  threshold: 0.5,
  dark: { hex: '#1e293b', alpha: 1 },
  light: { hex: '#ffffff', alpha: 1 },
  finder: '#334155',
  overlay: 0,
  paper: '#ffffff',
  frame: 'none',
  frameText: 'Scan me',
  sampleId: 'landscape',
};

const PRESETS = {
  drive: {
    name: 'Midnight Drive', sampleId: 'car', text: DEFAULTS.text,
    dotScale: 0.42, dotStyle: 'circle',
    dark: { hex: '#0f172a', alpha: 0.88 }, light: { hex: '#ffffff', alpha: 0.7 },
    finder: '#0f172a', overlay: 55,
  },
  alpine: {
    name: 'Alpine Gold', sampleId: 'landscape', text: DEFAULTS.text,
    dotScale: 0.4, dotStyle: 'rounded',
    dark: { hex: '#1e293b', alpha: 0.85 }, light: { hex: '#ffffff', alpha: 0.75 },
    finder: '#334155', overlay: 52,
  },
  flux: {
    name: 'Neon Flux', sampleId: 'abstract', text: DEFAULTS.text,
    dotScale: 0.44, dotStyle: 'circle',
    dark: { hex: '#020617', alpha: 0.9 }, light: { hex: '#ffffff', alpha: 0.8 },
    finder: '#0f172a', overlay: 62,
  },
};

const state = {
  ...structuredClone(DEFAULTS),
  image: null,
  logo: null,
  animation: null,
  motion: 'still',
  duration: 3,
  format: 'png',
  gifSize: 600,
  exportSize: 1200,
  contentType: 'link',
  playing: false,
  hasResult: false,
  unlocked: false,
  plan: null,
  zoom: 1,
  panX: 0,
  panY: 0,
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  canvas: $('qrCanvas'),
  text: $('textInput'),
  charCount: $('charCount'),
  dropzone: $('dropzone'),
  fileInput: $('fileInput'),
  imgPreview: $('imgPreview'),
  previewThumb: $('previewThumb'),
  imgName: $('imgName'),
  imgSize: $('imgSize'),
  dotScale: $('dotScale'),
  dotScaleValue: $('dotScaleValue'),
  dotStyle: $('dotStyle'),
  darkHex: $('darkHex'), darkAlpha: $('darkAlpha'), darkValue: $('darkValue'), darkSwatch: $('darkSwatch'),
  lightHex: $('lightHex'), lightAlpha: $('lightAlpha'), lightValue: $('lightValue'), lightSwatch: $('lightSwatch'),
  finderHex: $('finderHex'), finderValue: $('finderValue'), finderSwatch: $('finderSwatch'),
  overlay: $('overlay'), overlayValue: $('overlayValue'),
  statusPill: $('statusPill'), statusText: $('statusText'),
  canvasOverlay: $('canvasOverlay'), overlayMsg: $('overlayMsg'),
  qrMeta: $('qrMeta'),
  downloadBtn: $('downloadBtn'), downloadLabel: $('downloadLabel'),
  copyBtn: $('copyBtn'),
  modeNote: $('modeNote'),
  gradAngleBlock: $('gradAngleBlock'), gradAngle: $('gradAngle'), gradAngleValue: $('gradAngleValue'),
  gradEndRow: $('gradEndRow'), gradEndHex: $('gradEndHex'), gradEndValue: $('gradEndValue'), gradEndSwatch: $('gradEndSwatch'),
  logoControls: $('logoControls'), logoInset: $('logoInset'), logoInsetValue: $('logoInsetValue'),
  logoDrop: $('logoDrop'), logoInput: $('logoInput'), logoPreview: $('logoPreview'),
  logoThumb: $('logoThumb'), logoName: $('logoName'), logoSize: $('logoSize'),
  thresholdBlock: $('thresholdBlock'), threshold: $('threshold'), thresholdValue: $('thresholdValue'),
  bgGroup: $('bgGroup'), overlayBlock: $('overlayBlock'), lightRow: $('lightRow'),
  framingBlock: $('framingBlock'), zoomRange: $('zoomRange'), zoomValue: $('zoomValue'),
  panXRange: $('panXRange'), panXValue: $('panXValue'), panYRange: $('panYRange'), panYValue: $('panYValue'),
  dotScaleLabel: $('dotScaleLabel'), dotScaleEnds: $('dotScaleEnds'),
  toast: $('toast'), toastMsg: $('toastMsg'),
};

/* ---------------- render engine ---------------- */

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function coverRect(img, px, frame) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(px / iw, px / ih) * (frame?.zoom || 1);
  const w = iw * scale;
  const h = ih * scale;
  const ox = Math.max(0, (w - px) / 2);
  const oy = Math.max(0, (h - px) / 2);
  return {
    x: (px - w) / 2 + (frame?.panX || 0) * ox,
    y: (px - h) / 2 + (frame?.panY || 0) * oy,
    w, h, ox, oy,
  };
}

function drawCover(ctx, img, px, frame) {
  const r = coverRect(img, px, frame);
  if (r.w < px - 0.5 || r.h < px - 0.5) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
  }
  ctx.drawImage(img, r.x, r.y, r.w, r.h);
}

function drawDot(ctx, cx, cy, d, style) {
  const h = d / 2;
  ctx.beginPath();
  if (style === 'circle') {
    ctx.arc(cx, cy, h, 0, TAU);
  } else if (style === 'rounded') {
    roundRectPath(ctx, cx - h, cy - h, d, d, d * 0.3);
  } else if (style === 'diamond') {
    ctx.moveTo(cx, cy - h);
    ctx.lineTo(cx + h, cy);
    ctx.lineTo(cx, cy + h);
    ctx.lineTo(cx - h, cy);
    ctx.closePath();
  } else {
    ctx.rect(cx - h, cy - h, d, d);
  }
  ctx.fill();
}

function drawTrack(ctx, x0, y0, x1, y1, d) {
  const h = d / 2;
  ctx.beginPath();
  if (x0 === x1) roundRectPath(ctx, x0 - h, y0 - h, d, (y1 - y0) + d, h);
  else roundRectPath(ctx, x0 - h, y0 - h, (x1 - x0) + d, d, h);
  ctx.fill();
}

function sampleLuminance(img, n, frame) {
  const dim = n + MARGIN * 2;
  const off = document.createElement('canvas');
  off.width = dim; off.height = dim;
  const octx = off.getContext('2d', { willReadFrequently: true });
  drawCover(octx, img, dim, frame);
  const data = octx.getImageData(0, 0, dim, dim).data;
  const lum = new Float32Array(n * n);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = ((MARGIN + r) * dim + (MARGIN + c)) * 4;
      lum[r * n + c] = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    }
  }
  return lum;
}

function makeInk(ctx, cfg, px, alpha) {
  if (cfg.colorType === 'linear') {
    const rad = (cfg.gradAngle * Math.PI) / 180;
    const cx = px / 2, cy = px / 2, half = px / 2;
    const dx = Math.cos(rad) * half, dy = Math.sin(rad) * half;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, rgba(cfg.dark.hex, alpha));
    g.addColorStop(1, rgba(cfg.gradEnd, alpha));
    return g;
  }
  if (cfg.colorType === 'radial') {
    const g = ctx.createRadialGradient(px / 2, px / 2, 0, px / 2, px / 2, px * 0.72);
    g.addColorStop(0, rgba(cfg.dark.hex, alpha));
    g.addColorStop(1, rgba(cfg.gradEnd, alpha));
    return g;
  }
  return rgba(cfg.dark.hex, alpha);
}

function drawLogoCard(ctx, cfg, px) {
  const size = px * (cfg.logoInset / 100);
  const x = (px - size) / 2, y = (px - size) / 2;
  const radius = cfg.logoShape === 'circle' ? size / 2 : size * 0.22;
  ctx.save();
  ctx.beginPath();
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = Math.max(1, px * 0.002);
  ctx.strokeStyle = 'rgba(26, 23, 18, 0.12)';
  ctx.stroke();
  ctx.clip();
  if (cfg.logo) {
    const pad = size * 0.14;
    const inner = size - pad * 2;
    const iw = cfg.logo.naturalWidth || cfg.logo.width || 1;
    const ih = cfg.logo.naturalHeight || cfg.logo.height || 1;
    const s = Math.max(inner / iw, inner / ih);
    const w = iw * s, h = ih * s;
    ctx.drawImage(cfg.logo, x + pad + (inner - w) / 2, y + pad + (inner - h) / 2, w, h);
  } else {
    const m = size * 0.3;
    const mx = px / 2, my = px / 2;
    ctx.strokeStyle = '#e8431f';
    ctx.lineWidth = size * 0.055;
    ctx.beginPath();
    roundRectPath(ctx, mx - m, my - m, m * 1.35, m * 1.35, m * 0.36);
    ctx.stroke();
    ctx.fillStyle = '#e8431f';
    ctx.beginPath();
    ctx.arc(mx + m * 0.62, my + m * 0.62, m * 0.3, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function drawEye(ctx, x, y, cell, color, paper = '#ffffff') {
  const s = 7 * cell;
  ctx.fillStyle = color;
  ctx.beginPath();
  roundRectPath(ctx, x, y, s, s, cell * 1.4);
  ctx.fill();
  ctx.fillStyle = paper;
  ctx.beginPath();
  roundRectPath(ctx, x + cell, y + cell, s - 2 * cell, s - 2 * cell, cell * 0.9);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  roundRectPath(ctx, x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.75);
  ctx.fill();
}

let matrixText;
let matrix;

const CREDIT_RATIO = 0.055;
const FRAME_RATIO = 0.14;
const FRAME_MAX = 28;
function creditHeight(px, cfg) {
  return cfg.credit === false || cfg.unlocked ? 0 : Math.round(px * CREDIT_RATIO);
}

function frameHeight(px, cfg) {
  return cfg.frame === 'light' || cfg.frame === 'dark' ? Math.round(px * FRAME_RATIO) : 0;
}

/* CTA label band under the code, e.g. "Scan me". Never covers modules. */
function frameColors(cfg) {
  return cfg.frame === 'dark'
    ? { band: cfg.finder, text: '#ffffff' }
    : { band: cfg.paper || '#ffffff', text: cfg.finder };
}

function frameLabel(cfg) {
  return (cfg.frameText || '').trim().slice(0, FRAME_MAX) || 'Scan me';
}

function drawFrameBand(ctx, px, y, h, cfg) {
  const { band, text } = frameColors(cfg);
  ctx.fillStyle = band;
  ctx.fillRect(0, y, px, h);
  const label = frameLabel(cfg);
  let fs = Math.round(h * 0.36);
  ctx.font = `600 ${fs}px Switzer, system-ui, sans-serif`;
  const icon = h * 0.36;
  const gap = h * 0.2;
  while (fs > 8 && ctx.measureText(label).width + icon + gap > px * 0.84) {
    fs -= 1;
    ctx.font = `600 ${fs}px Switzer, system-ui, sans-serif`;
  }
  const tw = ctx.measureText(label).width;
  const x0 = (px - (icon + gap + tw)) / 2;
  const cy = y + h * 0.47;
  // small upward chevron pointing at the code
  ctx.strokeStyle = text;
  ctx.lineWidth = Math.max(1.5, icon * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, cy + icon * 0.22);
  ctx.lineTo(x0 + icon / 2, cy - icon * 0.28);
  ctx.lineTo(x0 + icon, cy + icon * 0.22);
  ctx.stroke();
  ctx.fillStyle = text;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x0 + icon + gap, cy);
}

function drawCreditStrip(ctx, px, h, top = px) {
  ctx.save();
  ctx.translate(0, top - px);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, px, px, h);
  ctx.fillStyle = '#e2e8e3';
  ctx.fillRect(0, px, px, Math.max(1, Math.round(h * 0.02)));
  const fs = Math.round(h * 0.4);
  ctx.font = `600 ${fs}px Switzer, system-ui, sans-serif`;
  ctx.textBaseline = 'middle';
  const label = 'PhotoQR';
  const tw = ctx.measureText(label).width;
  const g = Math.round(h * 0.46);
  const gap = Math.round(h * 0.24);
  const x0 = (px - (g + gap + tw)) / 2;
  const cy = px + h / 2 + h * 0.02;
  ctx.strokeStyle = '#3c684b';
  ctx.lineWidth = Math.max(1.5, g * 0.14);
  ctx.beginPath();
  roundRectPath(ctx, x0, cy - g / 2, g, g, g * 0.26);
  ctx.stroke();
  ctx.fillStyle = '#3c684b';
  ctx.beginPath();
  roundRectPath(ctx, x0 + g * 0.3, cy - g * 0.2, g * 0.4, g * 0.4, g * 0.12);
  ctx.fill();
  ctx.fillStyle = '#1c2622';
  ctx.fillText(label, x0 + g + gap, cy);
  ctx.restore();
}

function getMatrix(text) {
  if (matrixText !== text) {
    const next = qrcode(0, 'H');
    next.addData(text);
    next.make();
    matrix = next;
    matrixText = text;
  }
  return matrix;
}

function renderQR(canvas, cfg, px) {
  const qr = getMatrix(cfg.text);
  const n = qr.getModuleCount();
  const paper = cfg.paper || '#ffffff';

  const ctx = canvas.getContext('2d');
  const credit = creditHeight(px, cfg);
  const band = frameHeight(px, cfg);
  canvas.width = px;
  canvas.height = px + band + credit;

  const mode = cfg.mode || 'watermark';
  const isWatermark = mode === 'watermark';
  const cell = px / (n + MARGIN * 2);

  if (isWatermark && cfg.image) {
    drawCover(ctx, cfg.image, px, cfg);
    if (cfg.overlay !== 0) {
      const a = Math.min(Math.abs(cfg.overlay) / 100, 1);
      ctx.fillStyle = cfg.overlay > 0 ? `rgba(255, 255, 255, ${a})` : `rgba(2, 6, 23, ${a})`;
      ctx.fillRect(0, 0, px, px);
    }
  } else if (isWatermark && paper.toLowerCase() === '#ffffff') {
    const g = ctx.createLinearGradient(0, 0, px, px);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#d7e0ec');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, px, px);
  } else {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, px, px);
  }

  const quiet = MARGIN * cell;
  // quiet zone: one ring-shaped path (outer square minus inner square), so there
  // are no anti-aliased seams where separate strips would meet
  ctx.fillStyle = paper;
  ctx.beginPath();
  ctx.rect(0, 0, px, px);
  ctx.rect(quiet, quiet, px - quiet * 2, px - quiet * 2);
  ctx.fill('evenodd');

  const lum = mode === 'halftone' && cfg.image ? sampleLuminance(cfg.image, n, cfg) : null;
  const ink = makeInk(ctx, cfg, px, isWatermark && cfg.colorType === 'solid' ? cfg.dark.alpha : 1);
  const light = rgba(cfg.light.hex, cfg.light.alpha);
  const d = cell * cfg.dotScale;
  const inFinder = (r, c) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
  // the 7×7 eye itself; the light separator ring around it is drawn like any light module
  const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const cxOf = (c) => (MARGIN + c + 0.5) * cell;
  const cyOf = (r) => (MARGIN + r + 0.5) * cell;

  if (cfg.dotStyle === 'lines' && mode !== 'halftone') {
    const dark = new Uint8Array(n * n);
    const used = new Uint8Array(n * n);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!inFinder(r, c) && qr.isDark(r, c)) dark[r * n + c] = 1;
    ctx.fillStyle = ink;
    for (let r = 0; r < n; r++) {
      let c = 0;
      while (c < n) {
        if (!dark[r * n + c] || used[r * n + c]) { c++; continue; }
        let e = c; while (e + 1 < n && dark[r * n + e + 1] && !used[r * n + e + 1]) e++;
        if (e > c) { drawTrack(ctx, cxOf(c), cyOf(r), cxOf(e), cyOf(r), d); for (let k = c; k <= e; k++) used[r * n + k] = 1; }
        c = e + 1;
      }
    }
    for (let c = 0; c < n; c++) {
      let r = 0;
      while (r < n) {
        if (!dark[r * n + c] || used[r * n + c]) { r++; continue; }
        let e = r; while (e + 1 < n && dark[(e + 1) * n + c] && !used[(e + 1) * n + c]) e++;
        if (e > r) { drawTrack(ctx, cxOf(c), cyOf(r), cxOf(c), cyOf(e), d); for (let k = r; k <= e; k++) used[k * n + c] = 1; }
        r = e + 1;
      }
    }
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark[r * n + c] && !used[r * n + c]) drawDot(ctx, cxOf(c), cyOf(r), d, 'circle');
  } else {
    const shape = cfg.dotStyle === 'lines' ? 'rounded' : cfg.dotStyle;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (inEye(r, c)) continue;
        const isDark = qr.isDark(r, c);
        if (mode === 'halftone') {
          if (!isDark) continue;
          let dd = d;
          if (lum) {
            const t = Math.max(cfg.threshold, 0.05);
            const f = Math.min(Math.max((t - lum[r * n + c]) / t, 0), 1);
            dd = cell * (0.5 + 0.5 * f);
          }
          ctx.fillStyle = ink;
          drawDot(ctx, cxOf(c), cyOf(r), dd, shape);
        } else if (isWatermark) {
          ctx.fillStyle = isDark ? ink : light;
          drawDot(ctx, cxOf(c), cyOf(r), d, shape);
        } else {
          if (!isDark) continue;
          ctx.fillStyle = ink;
          drawDot(ctx, cxOf(c), cyOf(r), d, shape);
        }
      }
    }
  }

  drawEye(ctx, MARGIN * cell, MARGIN * cell, cell, cfg.finder, paper);
  drawEye(ctx, (MARGIN + n - 7) * cell, MARGIN * cell, cell, cfg.finder, paper);
  drawEye(ctx, MARGIN * cell, (MARGIN + n - 7) * cell, cell, cfg.finder, paper);

  if (mode === 'logo') drawLogoCard(ctx, cfg, px);
  if (band) drawFrameBand(ctx, px, px, band, cfg);
  if (credit) drawCreditStrip(ctx, px, credit, px + band);

  return { modules: n, version: (n - 17) / 4 };
}

function canMove(cfg = state) {
  return !!cfg.image && (cfg.mode === 'watermark' || cfg.mode === 'halftone');
}

function hasMotion(cfg = state) {
  return canMove(cfg) && cfg.motion !== 'still' &&
    (cfg.motion !== 'source' || cfg.animation?.frames.length > 1);
}

function loopDuration(cfg = state) {
  return cfg.motion === 'source' && cfg.animation ? cfg.animation.duration : cfg.duration * 1000;
}

function motionImage(cfg, time, surface, px) {
  if (!hasMotion(cfg)) return cfg.image;
  const phase = (time % loopDuration(cfg)) / loopDuration(cfg);
  if (cfg.motion === 'source') {
    let position = phase * cfg.animation.duration;
    for (const frame of cfg.animation.frames) {
      if (position < frame.delay) return frame.image;
      position -= frame.delay;
    }
    return cfg.animation.frames[0].image;
  }
  surface.width = px;
  surface.height = px;
  const ctx = surface.getContext('2d');
  const zoom = cfg.motion === 'breathe' ? 1 + 0.08 * (1 - Math.cos(phase * TAU)) / 2 : 1.1;
  const shift = cfg.motion === 'drift' ? Math.sin(phase * TAU) * px * 0.04 : 0;
  ctx.translate(px / 2 + shift, px / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-px / 2, -px / 2);
  drawCover(ctx, cfg.image, px, cfg);
  return surface;
}

const previewSurface = document.createElement('canvas');
let playhead = 0;
let playStarted = 0;
let playbackRaf = 0;
let previewVisible = false;
let exportController = null;

function previewTime() {
  return playhead + (playbackRaf ? performance.now() - playStarted : 0);
}

function updatePlayback() {
  if (playbackRaf) {
    playhead = previewTime();
    cancelAnimationFrame(playbackRaf);
    playbackRaf = 0;
  }
  if (!state.playing || !hasMotion() || !state.hasResult || !previewVisible || document.hidden || exportController) return;
  playStarted = performance.now();
  let previous = -FRAME_DELAY;
  const tick = (now) => {
    if (now - previous >= FRAME_DELAY) {
      const image = motionImage(state, playhead + now - playStarted, previewSurface, SIZE);
      renderQR(els.canvas, { ...state, text: state.text.trim(), image }, SIZE);
      previous = now;
    }
    playbackRaf = requestAnimationFrame(tick);
  };
  playbackRaf = requestAnimationFrame(tick);
}

function resetPlayback(autoplay = false) {
  state.playing = false;
  updatePlayback();
  playhead = 0;
  state.playing = autoplay && !motionPreference.matches;
}

function syncMotionUI() {
  const available = canMove();
  const animated = hasMotion();
  syncSegmented('#motionType', 'motion', state.motion);
  syncSegmented('#exportFormat', 'format', state.format);
  $$('#motionType button').forEach((button) => {
    button.disabled = button.dataset.motion !== 'still' && (!available ||
      (button.dataset.motion === 'source' && !(state.animation?.frames.length > 1)));
  });
  $('sourceMotionInfo').textContent = state.animation ?
    `${state.animation.frames.length} frames · ${(state.animation.duration / 1000).toFixed(1)} seconds` : 'Upload a GIF in Content';
  $('motionAvailability').hidden = available;
  $('durationBlock').hidden = !available || state.motion === 'still' || state.motion === 'source';
  $('motionDuration').value = state.duration;
  $('motionDurationValue').textContent = `${state.duration} seconds`;
  fillRange($('motionDuration'));
  $('playbackRow').hidden = !animated;
  $('playPauseBtn').textContent = state.playing ? 'Pause animation' : 'Play animation';
  $('playPauseBtn').setAttribute('aria-pressed', String(state.playing));
  $('playbackInfo').textContent = `${Number((loopDuration() / 1000).toFixed(2))} second loop`;
  $('gifSizeRow').hidden = state.format !== 'gif';
  $('gifSize').value = String(state.gifSize);
  $('pngSizeRow').hidden = state.format !== 'png';
  $$('#pngSize option').forEach((o) => { o.disabled = !sizeAllowed(Number(o.value)); });
  if (!sizeAllowed(state.exportSize)) state.exportSize = 1200;
  $('pngSize').value = String(state.exportSize);
  const locked = formatLocked();
  $('exportHint').textContent = state.format === 'png'
    ? (state.unlocked ? 'A high-resolution still. Ready for print.' : 'A 1200 px still with a small PhotoQR credit. Unlock for 2048 px and clean exports.')
    : state.format === 'svg'
      ? (locked ? 'Infinitely sharp vector for print and signage. Included with any paid plan.' : 'Infinitely sharp vector. Photos and logos are embedded inside the file.')
      : !available ? 'Choose Watermark or Halftone in Style and add a background in Content.'
        : !animated ? 'Choose Breathe, Drift, or Your GIF in the Motion tab first.'
          : 'A looping GIF at 10 frames per second. Made for screens.';
  els.downloadLabel.textContent = exportController ? 'Making your GIF…'
    : state.format === 'gif' ? `Download ${state.gifSize} × ${state.gifSize} GIF`
      : state.format === 'svg' ? (locked ? 'Unlock SVG export' : 'Download SVG')
        : 'Download PNG';
  els.downloadBtn.disabled = !!exportController || !state.hasResult || (state.format === 'gif' && !animated);
  els.downloadBtn.classList.toggle('disabled', els.downloadBtn.disabled);
  els.downloadBtn.setAttribute('aria-disabled', String(els.downloadBtn.disabled));
  els.copyBtn.disabled = !!exportController || !state.hasResult;
}

/* ---------------- main preview ---------------- */

let rafId = 0;
function scheduleRender() {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    rafId = 0;
    renderMain();
  });
}

function setStatus(mode, label) {
  els.statusPill.className = 'status-pill' + (mode === 'live' ? '' : ` ${mode}`);
  els.statusText.textContent = label;
}

function showOverlay(msg) {
  els.overlayMsg.textContent = msg;
  els.canvasOverlay.hidden = false;
  els.downloadBtn.classList.add('disabled');
  els.downloadBtn.setAttribute('aria-disabled', 'true');
  state.hasResult = false;
}

function hideOverlay() {
  els.canvasOverlay.hidden = true;
  els.downloadBtn.classList.remove('disabled');
  els.downloadBtn.removeAttribute('aria-disabled');
  state.hasResult = true;
}

function renderMain() {
  syncFramingUI();
  const text = state.text.trim();
  if (!text) {
    showOverlay('Add a link or message to begin');
    setStatus('error', 'Empty');
    els.qrMeta.textContent = '— modules · EC H (30%)';
    renderHooks.forEach((hook) => hook(null));
    syncMotionUI();
    updatePlayback();
    return;
  }
  setStatus('rendering', 'Weaving…');
  try {
    const image = motionImage(state, previewTime(), previewSurface, SIZE);
    const info = renderQR(els.canvas, { ...state, text, image }, SIZE);
    els.qrMeta.textContent = `v${info.version} · ${info.modules}×${info.modules} modules · EC H (30%)`;
    els.canvas.parentElement.classList.toggle('credited', !state.unlocked);
    $('exportDims').textContent = `${els.canvas.width} × ${els.canvas.height}`;
    hideOverlay();
    setStatus('live', 'Live');
    renderHooks.forEach((hook) => hook(info));
  } catch (err) {
    showOverlay('This text is too long for one QR code. Shorten it and try again.');
    setStatus('error', 'Too long');
    renderHooks.forEach((hook) => hook(null));
  }
  syncMotionUI();
  updatePlayback();
}

/* Other modules (studio.js) subscribe here: readability check, history, mini preview. */
const renderHooks = [];

/* ---------------- image handling ---------------- */

let imageRequest = 0;
let imageController = null;
let logoRequest = 0;

const imageCache = new Map();

function decodeImage(src) {
  if (imageCache.has(src)) return imageCache.get(src);
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image'));
    img.src = src;
  });
  imageCache.set(src, p);
  return p;
}

function fmtSize(bytes) {
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

function setImage(img, label, sizeText, thumbSrc, sampleId, animation = null) {
  resetPlayback(!!animation || (state.motion !== 'still' && state.motion !== 'source'));
  state.image = img;
  resetFraming();
  state.animation = animation;
  if (animation?.frames.length > 1) {
    state.motion = 'source';
    state.format = 'gif';
  } else if (state.motion === 'source') {
    state.motion = 'still';
  }
  state.sampleId = sampleId;
  els.previewThumb.src = thumbSrc;
  els.imgName.textContent = label;
  els.imgSize.textContent = sizeText;
  els.imgPreview.hidden = false;
  $$('.sample-tile').forEach((t) => t.classList.toggle('active', t.dataset.sample === sampleId));
  scheduleRender();
}

async function loadSample(id, silent) {
  const s = SAMPLES.find((x) => x.id === id);
  if (!s) return;
  imageController?.abort();
  const request = ++imageRequest;
  try {
    const img = await decodeImage(s.src);
    if (request !== imageRequest) return;
    setImage(img, `${s.name} — sample`, 'Built-in photo', s.src, id);
    if (!silent) toast(`Background: ${s.name}`);
  } catch {
    toast('Could not load the sample photo', true);
  }
}

async function handleFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
    toast('Choose a PNG, JPG, WebP or GIF image', true);
    return;
  }
  if (file.size > 25 * 1048576) {
    toast('Image is larger than 25 MB', true);
    return;
  }
  imageController?.abort();
  const controller = new AbortController();
  imageController = controller;
  const request = ++imageRequest;
  try {
    if (file.type === 'image/gif') {
      toast('Opening GIF on your device…');
      const animation = await PhotoQRGIF.decode(file, { signal: controller.signal });
      if (request !== imageRequest) return;
      const image = animation.frames[0].image;
      setImage(image, file.name, `${fmtSize(file.size)} · ${animation.frames.length} frames`, image.toDataURL(), null, animation);
      toast(animation.frames.length > 1 ? 'GIF ready — explore it in Motion' : 'Still GIF loaded — add motion to animate it');
    } else {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read that image file'));
        reader.readAsDataURL(file);
      });
      const img = await decodeImage(dataUrl);
      imageCache.delete(dataUrl);
      if (request !== imageRequest) return;
      setImage(img, file.name, fmtSize(file.size), dataUrl, null);
      toast('Background photo loaded');
    }
  } catch (error) {
    if (request === imageRequest) toast(error.message || 'Could not read that image file', true);
  } finally {
    if (request === imageRequest) {
      imageController = null;
      els.fileInput.value = '';
    }
  }
}

function removeImage() {
  imageController?.abort();
  imageController = null;
  imageRequest++;
  resetPlayback();
  state.animation = null;
  state.motion = 'still';
  state.image = null;
  resetFraming();
  els.previewThumb.removeAttribute('src');
  state.sampleId = null;
  els.imgPreview.hidden = true;
  els.fileInput.value = '';
  $$('.sample-tile').forEach((t) => t.classList.toggle('active', t.dataset.sample === 'none'));
  scheduleRender();
}

async function handleLogoFile(file) {
  if (!file) return;
  if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
    toast('Only PNG, JPG, WebP or SVG logos are supported', true);
    return;
  }
  if (file.size > 10 * 1048576) {
    toast('Logo is larger than 10 MB', true);
    return;
  }
  const request = ++logoRequest;
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('read failed'));
      reader.readAsDataURL(file);
    });
    const img = await decodeImage(dataUrl);
    imageCache.delete(dataUrl);
    if (request !== logoRequest) return;
    state.logo = img;
    els.logoThumb.src = dataUrl;
    els.logoName.textContent = file.name;
    els.logoSize.textContent = fmtSize(file.size);
    els.logoPreview.hidden = false;
    els.logoDrop.hidden = true;
    scheduleRender();
    toast('Center logo loaded');
  } catch {
    toast('Could not read that logo file', true);
  }
}

function removeLogo(silent) {
  logoRequest++;
  state.logo = null;
  els.logoThumb.removeAttribute('src');
  els.logoPreview.hidden = true;
  els.logoDrop.hidden = false;
  els.logoInput.value = '';
  if (!silent) {
    scheduleRender();
    toast('Logo removed — PhotoQR seal restored');
  }
}

/* ---------------- background framing ---------------- */

function framingAvailable() {
  return !!state.image && (state.mode === 'watermark' || state.mode === 'halftone');
}

function fitZoom() {
  if (!state.image) return 1;
  const iw = state.image.naturalWidth || state.image.width;
  const ih = state.image.naturalHeight || state.image.height;
  return Math.min(iw, ih) / Math.max(iw, ih);
}

function clampZoom(z) {
  return Math.min(3, Math.max(fitZoom(), z));
}

function resetFraming() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
}

function syncFramingUI() {
  const available = framingAvailable();
  els.framingBlock.hidden = !available;
  els.canvas.parentElement.classList.toggle('framing-on', available);
  if (!available) return;
  els.zoomRange.min = String(Math.round(fitZoom() * 100));
  els.zoomRange.value = String(Math.round(state.zoom * 100));
  els.zoomValue.textContent = Math.round(state.zoom * 100) + '%';
  fillRange(els.zoomRange);
  const r = coverRect(state.image, SIZE, state);
  els.panXRange.disabled = r.ox < 1;
  els.panYRange.disabled = r.oy < 1;
  els.panXRange.value = String(Math.round(state.panX * 100));
  els.panYRange.value = String(Math.round(state.panY * 100));
  els.panXValue.textContent = Math.round(state.panX * 100) + '%';
  els.panYValue.textContent = Math.round(state.panY * 100) + '%';
  fillRange(els.panXRange);
  fillRange(els.panYRange);
}

function setZoom(z) {
  state.zoom = clampZoom(z);
  syncFramingUI();
  scheduleRender();
}

function setPan(axis, v) {
  state[axis] = Math.min(1, Math.max(-1, v));
  syncFramingUI();
  scheduleRender();
}

/* ---------------- control sync ---------------- */

function fillRange(input) {
  const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty('--fill', pct + '%');
}

function syncSwatch(swatch, hex, alpha) {
  const c = rgba(hex, alpha === undefined ? 1 : alpha);
  swatch.style.background = `linear-gradient(${c}, ${c}), repeating-conic-gradient(#d8d2c2 0% 25%, #f4f0e6 0% 50%) 0 0 / 12px 12px`;
}

function syncColorUI() {
  const solidInk = state.mode !== 'watermark' || state.colorType !== 'solid';
  els.darkHex.value = state.dark.hex;
  els.darkAlpha.value = Math.round(state.dark.alpha * 100);
  els.darkValue.textContent = solidInk ? state.dark.hex : rgba(state.dark.hex, state.dark.alpha);
  syncSwatch(els.darkSwatch, state.dark.hex, solidInk ? 1 : state.dark.alpha);
  fillRange(els.darkAlpha);

  els.lightHex.value = state.light.hex;
  els.lightAlpha.value = Math.round(state.light.alpha * 100);
  els.lightValue.textContent = rgba(state.light.hex, state.light.alpha);
  syncSwatch(els.lightSwatch, state.light.hex, state.light.alpha);
  fillRange(els.lightAlpha);

  els.finderHex.value = state.finder;
  els.finderValue.textContent = state.finder;
  syncSwatch(els.finderSwatch, state.finder);

  $('paperHex').value = state.paper;
  $('paperValue').textContent = state.paper;
  syncSwatch($('paperSwatch'), state.paper);
  syncLookUI();
}

/* Watermark "looks". Clear: no wash, solid dots — the photo stays vivid and the
   solid centre of every dot is what the scanner reads. Soft: the classic white wash. */
const PHOTO_LOOKS = {
  clear: { overlay: 0, darkAlpha: 1, lightAlpha: 1, minDot: 0.34 },
  soft: { overlay: 55, darkAlpha: 0.85, lightAlpha: 0.75, minDot: 0 },
};

function currentLook() {
  if (state.overlay === 0 && state.dark.alpha === 1 && state.light.alpha === 1) return 'clear';
  if (state.overlay >= 40) return 'soft';
  return null;
}

function syncLookUI() {
  $('photoLookBlock').hidden = state.mode !== 'watermark';
  syncSegmented('#photoLook', 'look', currentLook());
}

$$('#photoLook button').forEach((btn) => {
  btn.addEventListener('click', () => {
    const look = PHOTO_LOOKS[btn.dataset.look];
    state.overlay = look.overlay;
    state.dark.alpha = look.darkAlpha;
    state.light.alpha = look.lightAlpha;
    state.dotScale = Math.max(state.dotScale, look.minDot);
    syncUI();
    scheduleRender();
  });
});

function syncFrameUI() {
  syncSegmented('#frameStyle', 'frame', state.frame);
  $('frameTextBlock').hidden = state.frame === 'none';
  if (document.activeElement !== $('frameText')) $('frameText').value = state.frameText;
}

function overlayLabel(v) {
  if (v === 0) return '0% · none';
  return `${v > 0 ? '+' : '−'}${Math.abs(v)}% ${v > 0 ? 'white' : 'dark'}`;
}

const MODE_NOTES = {
  watermark: 'Your photograph sits behind a grid of small dots. Scanners only read the centre of each dot, so the picture can stay clear.',
  logo: 'Solid ink on clean paper, your mark on a white card at the center. Level H covers the gap.',
  halftone: 'Each dot swells with the photo’s darkness — the image emerges from the matrix itself.',
  geometric: 'Pure geometry on white — crisp shapes, solid ink, maximum contrast.',
};

function syncSegmented(container, attr, value) {
  $$(container + ' button').forEach((b) => {
    const on = b.dataset[attr] === value;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

function syncUI() {
  els.text.value = state.text;
  els.charCount.textContent = state.text.length;

  els.dotScale.value = state.dotScale;
  els.dotScaleValue.textContent = state.dotScale.toFixed(2);
  fillRange(els.dotScale);

  syncSegmented('#dotStyle', 'style', state.dotStyle);
  syncSegmented('#modeSelect', 'mode', state.mode);
  els.modeNote.textContent = MODE_NOTES[state.mode];

  syncSegmented('#colorType', 'color', state.colorType);
  els.gradAngleBlock.hidden = state.colorType !== 'linear';
  els.gradAngle.value = state.gradAngle;
  els.gradAngleValue.textContent = state.gradAngle + '°';
  fillRange(els.gradAngle);
  els.gradEndRow.hidden = state.colorType === 'solid';
  els.gradEndHex.value = state.gradEnd;
  els.gradEndValue.textContent = state.gradEnd;
  syncSwatch(els.gradEndSwatch, state.gradEnd);

  els.logoControls.hidden = state.mode !== 'logo';
  els.logoInset.value = state.logoInset;
  els.logoInsetValue.textContent = state.logoInset + '%';
  fillRange(els.logoInset);
  syncSegmented('#logoShape', 'shape', state.logoShape);

  els.thresholdBlock.hidden = state.mode !== 'halftone';
  els.threshold.value = state.threshold;
  els.thresholdValue.textContent = state.threshold.toFixed(2);
  fillRange(els.threshold);

  const isWatermark = state.mode === 'watermark';
  els.bgGroup.hidden = state.mode === 'logo' || state.mode === 'geometric';
  els.overlayBlock.hidden = !isWatermark;
  els.lightRow.hidden = !isWatermark;
  els.darkAlpha.hidden = !isWatermark || state.colorType !== 'solid';
  els.dotScaleLabel.textContent = isWatermark ? 'Dot size / image visibility' : 'Dot size / module scale';
  els.dotScaleEnds.children[0].textContent = isWatermark ? 'More photo' : 'Finer';
  els.dotScaleEnds.children[1].textContent = isWatermark ? 'Bolder code' : 'Bolder';

  syncColorUI();
  syncFrameUI();
  syncLookUI();

  els.overlay.value = state.overlay;
  els.overlayValue.textContent = overlayLabel(state.overlay);
  fillRange(els.overlay);
  syncFramingUI();
  syncMotionUI();
}

function applyConfig(cfg) {
  clearTimeout(textTimer);
  if (exportController) exportController.abort();
  resetPlayback();
  state.animation = null;
  state.motion = 'still';
  resetFraming();
  state.duration = 3;
  state.format = 'png';
  state.gifSize = 600;
  state.text = cfg.text;
  state.mode = cfg.mode || DEFAULTS.mode;
  state.dotScale = cfg.dotScale;
  state.dotStyle = cfg.dotStyle;
  state.colorType = cfg.colorType || DEFAULTS.colorType;
  state.gradAngle = cfg.gradAngle ?? DEFAULTS.gradAngle;
  state.gradEnd = cfg.gradEnd || DEFAULTS.gradEnd;
  state.logoInset = cfg.logoInset ?? DEFAULTS.logoInset;
  state.logoShape = cfg.logoShape || DEFAULTS.logoShape;
  state.threshold = cfg.threshold ?? DEFAULTS.threshold;
  state.dark = { ...cfg.dark };
  state.light = { ...cfg.light };
  state.finder = cfg.finder;
  state.overlay = cfg.overlay;
  state.paper = cfg.paper || DEFAULTS.paper;
  state.frame = cfg.frame || DEFAULTS.frame;
  state.frameText = cfg.frameText || DEFAULTS.frameText;
  syncUI();
  scheduleRender();
}

/* ---------------- toast ---------------- */

let toastTimer = 0;
function toast(msg, isError) {
  els.toastMsg.textContent = msg;
  els.toast.classList.toggle('error', !!isError);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
}

/* ---------------- events ---------------- */

let textTimer = 0;
els.text.addEventListener('input', () => {
  els.charCount.textContent = els.text.value.length;
  clearTimeout(textTimer);
  textTimer = setTimeout(() => {
    state.text = els.text.value;
    scheduleRender();
  }, 160);
});

$('clearText').addEventListener('click', () => {
  els.text.value = '';
  els.charCount.textContent = '0';
  state.text = '';
  els.text.focus();
  scheduleRender();
});

$$('.chip[data-text]').forEach((chip) => {
  chip.addEventListener('click', () => {
    els.text.value = chip.dataset.text;
    els.charCount.textContent = chip.dataset.text.length;
    state.text = chip.dataset.text;
    scheduleRender();
  });
});

els.dotScale.addEventListener('input', () => {
  state.dotScale = parseFloat(els.dotScale.value);
  els.dotScaleValue.textContent = state.dotScale.toFixed(2);
  fillRange(els.dotScale);
  scheduleRender();
});

function bindSegmented(container, attr, key, after) {
  $$(container + ' button').forEach((btn) => {
    btn.addEventListener('click', () => {
      state[key] = btn.dataset[attr];
      syncSegmented(container, attr, state[key]);
      if (after) after();
      scheduleRender();
    });
  });
}
bindSegmented('#dotStyle', 'style', 'dotStyle');
bindSegmented('#colorType', 'color', 'colorType', () => {
  els.gradAngleBlock.hidden = state.colorType !== 'linear';
  els.gradEndRow.hidden = state.colorType === 'solid';
  els.darkAlpha.hidden = state.mode !== 'watermark' || state.colorType !== 'solid';
  syncColorUI();
});
bindSegmented('#logoShape', 'shape', 'logoShape');

$$('#modeSelect .mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (state.mode === btn.dataset.mode) return;
    clearTimeout(textTimer);
    state.text = els.text.value;
    state.mode = btn.dataset.mode;
    syncUI();
    scheduleRender();
  });
});

els.gradAngle.addEventListener('input', () => {
  state.gradAngle = parseInt(els.gradAngle.value, 10);
  els.gradAngleValue.textContent = state.gradAngle + '°';
  fillRange(els.gradAngle);
  scheduleRender();
});

els.gradEndHex.addEventListener('input', () => {
  state.gradEnd = els.gradEndHex.value;
  els.gradEndValue.textContent = state.gradEnd;
  syncSwatch(els.gradEndSwatch, state.gradEnd);
  scheduleRender();
});

els.logoInset.addEventListener('input', () => {
  state.logoInset = parseInt(els.logoInset.value, 10);
  els.logoInsetValue.textContent = state.logoInset + '%';
  fillRange(els.logoInset);
  scheduleRender();
});

els.threshold.addEventListener('input', () => {
  state.threshold = parseFloat(els.threshold.value);
  els.thresholdValue.textContent = state.threshold.toFixed(2);
  fillRange(els.threshold);
  scheduleRender();
});

els.darkHex.addEventListener('input', () => { state.dark.hex = els.darkHex.value; syncColorUI(); scheduleRender(); });
els.darkAlpha.addEventListener('input', () => { state.dark.alpha = els.darkAlpha.value / 100; syncColorUI(); scheduleRender(); });
els.lightHex.addEventListener('input', () => { state.light.hex = els.lightHex.value; syncColorUI(); scheduleRender(); });
els.lightAlpha.addEventListener('input', () => { state.light.alpha = els.lightAlpha.value / 100; syncColorUI(); scheduleRender(); });
els.finderHex.addEventListener('input', () => { state.finder = els.finderHex.value; syncColorUI(); scheduleRender(); });
$('paperHex').addEventListener('input', () => { state.paper = $('paperHex').value; syncColorUI(); scheduleRender(); });

bindSegmented('#frameStyle', 'frame', 'frame', syncFrameUI);
$('frameText').addEventListener('input', () => {
  state.frameText = $('frameText').value;
  scheduleRender();
});
$$('[data-frame-text]').forEach((chip) => {
  chip.addEventListener('click', () => {
    state.frameText = chip.dataset.frameText;
    $('frameText').value = state.frameText;
    scheduleRender();
  });
});

els.overlay.addEventListener('input', () => {
  state.overlay = parseInt(els.overlay.value, 10);
  syncLookUI();
  els.overlayValue.textContent = overlayLabel(state.overlay);
  fillRange(els.overlay);
  scheduleRender();
});

$('resetBtn').addEventListener('click', () => {
  applyConfig(DEFAULTS);
  removeLogo(true);
  loadSample(DEFAULTS.sampleId, true);
  toast('Reset to defaults');
});

els.dropzone.addEventListener('click', () => els.fileInput.click());
els.dropzone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput.click(); }
});
els.fileInput.addEventListener('change', () => handleFile(els.fileInput.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.add('dragging'); })
);
['dragleave', 'drop'].forEach((ev) =>
  els.dropzone.addEventListener(ev, (e) => { e.preventDefault(); els.dropzone.classList.remove('dragging'); })
);
els.dropzone.addEventListener('drop', (e) => handleFile(e.dataTransfer.files[0]));

$('removeImage').addEventListener('click', removeImage);

els.zoomRange.addEventListener('input', () => setZoom(Number(els.zoomRange.value) / 100));
$('zoomIn').addEventListener('click', () => setZoom(state.zoom + 0.1));
$('zoomOut').addEventListener('click', () => setZoom(state.zoom - 0.1));
els.panXRange.addEventListener('input', () => setPan('panX', Number(els.panXRange.value) / 100));
els.panYRange.addEventListener('input', () => setPan('panY', Number(els.panYRange.value) / 100));
$('frameFit').addEventListener('click', () => {
  state.zoom = fitZoom();
  state.panX = 0;
  state.panY = 0;
  syncFramingUI();
  scheduleRender();
});
$('frameFill').addEventListener('click', () => {
  resetFraming();
  syncFramingUI();
  scheduleRender();
});

let dragState = null;
els.canvas.addEventListener('pointerdown', (e) => {
  if (!framingAvailable() || exportController) return;
  const r = coverRect(state.image, SIZE, state);
  const touch = e.pointerType === 'touch';
  if (touch ? r.ox < 1 : r.ox < 1 && r.oy < 1) return;
  dragState = { id: e.pointerId, x: e.clientX, y: e.clientY, panX: state.panX, panY: state.panY, ox: r.ox, oy: r.oy, touch };
  els.canvas.setPointerCapture(e.pointerId);
  els.canvas.parentElement.classList.add('dragging');
  e.preventDefault();
});
els.canvas.addEventListener('pointermove', (e) => {
  if (!dragState || e.pointerId !== dragState.id) return;
  const k = SIZE / els.canvas.getBoundingClientRect().width;
  if (dragState.ox >= 1) state.panX = Math.min(1, Math.max(-1, dragState.panX + (e.clientX - dragState.x) * k / dragState.ox));
  if (!dragState.touch && dragState.oy >= 1) state.panY = Math.min(1, Math.max(-1, dragState.panY + (e.clientY - dragState.y) * k / dragState.oy));
  syncFramingUI();
  scheduleRender();
});
const endDrag = (e) => {
  if (!dragState || e.pointerId !== dragState.id) return;
  dragState = null;
  els.canvas.parentElement.classList.remove('dragging');
};
els.canvas.addEventListener('pointerup', endDrag);
els.canvas.addEventListener('pointercancel', endDrag);
els.canvas.addEventListener('wheel', (e) => {
  if (!framingAvailable() || exportController || !(e.ctrlKey || e.metaKey)) return;
  e.preventDefault();
  setZoom(state.zoom * Math.exp(-e.deltaY * 0.002));
}, { passive: false });

els.logoDrop.addEventListener('click', () => els.logoInput.click());
els.logoDrop.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.logoInput.click(); }
});
els.logoInput.addEventListener('change', () => handleLogoFile(els.logoInput.files[0]));

['dragenter', 'dragover'].forEach((ev) =>
  els.logoDrop.addEventListener(ev, (e) => { e.preventDefault(); els.logoDrop.classList.add('dragging'); })
);
['dragleave', 'drop'].forEach((ev) =>
  els.logoDrop.addEventListener(ev, (e) => { e.preventDefault(); els.logoDrop.classList.remove('dragging'); })
);
els.logoDrop.addEventListener('drop', (e) => handleLogoFile(e.dataTransfer.files[0]));

$('removeLogo').addEventListener('click', () => removeLogo(false));

$$('.sample-tile').forEach((tile) => {
  tile.addEventListener('click', () => {
    const id = tile.dataset.sample;
    if (id === 'none') {
      removeImage();
      toast('Background removed — plain canvas');
    } else {
      loadSample(id);
    }
  });
});

/* Export entitlements, matching the pricing page:
   free 1200 px PNG · any paid plan 2048 px + SVG · Business 4096 px. */
function sizeAllowed(px) {
  if (px <= 1200) return true;
  if (!state.unlocked) return false;
  return px <= 2048 || state.plan === 'business';
}

function formatLocked() {
  return state.format === 'svg' && !state.unlocked;
}

function exportName() {
  const t = state.text.trim();
  let base = 'photoqr';
  try {
    if (/^https?:\/\//i.test(t)) base = new URL(t).hostname.replace(/^www\./, '');
  } catch { /* not a URL */ }
  return base.replace(/[^a-z0-9.-]+/gi, '-').slice(0, 40) || 'photoqr';
}

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = name;
  link.href = url;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

els.downloadBtn.addEventListener('click', async () => {
  if (exportController) return;
  clearTimeout(textTimer);
  state.text = els.text.value;
  renderMain();
  if (!state.hasResult || (state.format === 'gif' && !hasMotion())) return;
  if (state.format === 'svg') {
    if (formatLocked()) { openUnlock('SVG export is included with every paid plan.'); return; }
    try {
      const image = motionImage(state, previewTime(), previewSurface, SIZE);
      const svg = PhotoQRSVG.build({ ...state, text: state.text.trim(), image }, SIZE);
      saveBlob(new Blob([svg], { type: 'image/svg+xml' }), `${exportName()}.svg`);
      toast('Vector SVG downloaded');
    } catch {
      toast('Could not build the SVG. Try PNG instead.', true);
    }
    return;
  }
  if (state.format === 'png') {
    const px = sizeAllowed(state.exportSize) ? state.exportSize : 1200;
    let target = els.canvas;
    if (px !== SIZE) {
      target = document.createElement('canvas');
      const image = motionImage(state, previewTime(), document.createElement('canvas'), px);
      renderQR(target, { ...state, text: state.text.trim(), image }, px);
    }
    target.toBlob((blob) => {
      if (blob) {
        saveBlob(blob, `${exportName()}-${px}.png`);
        toast(`${target.width} × ${target.height} PNG downloaded`);
      } else toast('Could not export this image. Try another background.', true);
    }, 'image/png');
    return;
  }
  const cfg = { ...state, text: state.text.trim(), dark: { ...state.dark }, light: { ...state.light } };
  const px = cfg.gifSize;
  const gifHeight = px + creditHeight(px, cfg);
  const duration = loopDuration(cfg);
  const frameCount = Math.max(2, Math.ceil(duration / FRAME_DELAY));
  const delay = Math.max(20, Math.round(duration / frameCount / 10) * 10);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const surface = document.createElement('canvas');
  const controller = new AbortController();
  exportController = controller;
  updatePlayback();
  syncMotionUI();
  $('exportProgress').hidden = false;
  $('exportProgressBar').value = 0;
  $('exportProgressText').textContent = 'Preparing animation…';
  try {
    const blob = await PhotoQRGIF.encode({
      width: px, height: gifHeight, frameCount, delay, signal: controller.signal,
      onFrame(index) {
        const image = motionImage(cfg, index * duration / frameCount, surface, px);
        renderQR(canvas, { ...cfg, image }, px);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      },
      onProgress(completed, total) {
        $('exportProgressBar').value = completed / total * 100;
        $('exportProgressText').textContent = `Making your GIF · ${completed} / ${total} frames`;
      },
    });
    saveBlob(blob, `${exportName()}-${px}.gif`);
    toast(`Looping GIF downloaded · ${fmtSize(blob.size)}`);
  } catch (error) {
    toast(error.name === 'AbortError' ? 'GIF export cancelled' : error.message || 'Could not export GIF', error.name !== 'AbortError');
  } finally {
    exportController = null;
    $('exportProgress').hidden = true;
    syncMotionUI();
    updatePlayback();
  }
});

$('cancelExport').addEventListener('click', () => exportController?.abort());

$$('#motionType button').forEach((button) => {
  button.addEventListener('click', () => {
    state.motion = button.dataset.motion;
    resetPlayback(state.motion !== 'still');
    if (state.motion !== 'still') state.format = 'gif';
    syncMotionUI();
    scheduleRender();
  });
});
$('motionDuration').addEventListener('input', () => {
  state.duration = Number($('motionDuration').value);
  resetPlayback(state.playing);
  syncMotionUI();
  scheduleRender();
});
$('playPauseBtn').addEventListener('click', () => {
  state.playing = !state.playing;
  updatePlayback();
  syncMotionUI();
});
$$('#exportFormat button').forEach((button) => {
  button.addEventListener('click', () => {
    state.format = button.dataset.format;
    syncMotionUI();
    if (state.format === 'gif' && !hasMotion()) selectEditorTab('motion');
  });
});
$('pngSize').addEventListener('change', () => {
  state.exportSize = Number($('pngSize').value);
  syncMotionUI();
});
$('gifSize').addEventListener('change', () => {
  state.gifSize = Number($('gifSize').value);
  syncMotionUI();
});
document.addEventListener('visibilitychange', updatePlayback);
motionPreference.addEventListener('change', () => {
  if (motionPreference.matches) {
    state.playing = false;
    updatePlayback();
    syncMotionUI();
  }
});
new IntersectionObserver(([entry]) => {
  previewVisible = entry.isIntersecting;
  updatePlayback();
}).observe(els.canvas);

els.copyBtn.addEventListener('click', () => {
  if (exportController) return;
  clearTimeout(textTimer);
  state.text = els.text.value;
  renderMain();
  if (!state.hasResult) return;
  els.canvas.toBlob(async (blob) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      toast('PNG copied to clipboard');
    } catch {
      toast('Clipboard is not available in this browser', true);
    }
  }, 'image/png');
});

$$('[data-use-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const p = PRESETS[btn.dataset.usePreset];
    clearTimeout(textTimer);
    applyConfig({ ...p, text: els.text.value.trim() ? els.text.value : p.text });
    loadSample(p.sampleId, true);
    document.getElementById('studio').scrollIntoView({ behavior: motionPreference.matches ? 'auto' : 'smooth' });
    toast(`Preset “${p.name}” applied`);
  });
});

/* ---------------- theme ---------------- */

const rootEl = document.documentElement;
function setTheme(theme) {
  rootEl.dataset.theme = theme;
  try { localStorage.setItem('photoqr-theme', theme); } catch {}
}
try {
  setTheme(localStorage.getItem('photoqr-theme') || 'paper');
} catch {
  setTheme('paper');
}
$('themeToggle').addEventListener('click', () => {
  setTheme(rootEl.dataset.theme === 'ink' ? 'paper' : 'ink');
});

/* ---------------- nav / scroll ---------------- */

const navLinks = $('navLinks');
const menuBtn = $('menuBtn');

menuBtn.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuBtn.setAttribute('aria-expanded', String(open));
});
navLinks.addEventListener('click', (e) => {
  if (e.target.tagName === 'A') {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && navLinks.classList.contains('open')) {
    navLinks.classList.remove('open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.focus();
  }
});

function selectEditorTab(name, focus = false) {
  $$('[data-editor-tab]').forEach((tab) => {
    const selected = tab.dataset.editorTab === name;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !selected;
    if (selected && focus) tab.focus();
  });
}

const editorTabs = $$('[data-editor-tab]');
editorTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectEditorTab(tab.dataset.editorTab));
  tab.addEventListener('keydown', (event) => {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % editorTabs.length;
    else if (event.key === 'ArrowLeft') next = (index + editorTabs.length - 1) % editorTabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = editorTabs.length - 1;
    else return;
    event.preventDefault();
    selectEditorTab(editorTabs[next].dataset.editorTab, true);
  });
});
$$('[data-editor-next]').forEach((button) => {
  button.addEventListener('click', () => selectEditorTab(button.dataset.editorNext, true));
});
$$('[data-open-motion]').forEach((link) => {
  link.addEventListener('click', () => selectEditorTab('motion'));
});

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) {
      $$('.nav-links a').forEach((a) => a.classList.toggle('active', a.dataset.section === en.target.id));
    }
  });
}, { rootMargin: '-30% 0px -55% 0px' });
['studio', 'gallery', 'how', 'story'].forEach((id) => sectionObserver.observe(document.getElementById(id)));


/* ---------------- showcases ---------------- */

async function renderShowcases() {
  try {
    await Promise.all(SAMPLES.map((s) => decodeImage(s.src)));
    $$('canvas[data-preset]').forEach((cv) => {
      const p = PRESETS[cv.dataset.preset];
      const sample = SAMPLES.find((s) => s.id === p.sampleId);
      decodeImage(sample.src).then((img) => {
        renderQR(cv, { ...DEFAULTS, ...p, image: img, credit: false }, parseInt(cv.dataset.size, 10) || 420);
      });
    });
  } catch { /* hero cards stay empty only if samples fail */ }
}

/* ---------------- license / unlock ---------------- */

const LICENSE_KEY = 'photoqr-license';
const PLAN_LABELS = { pro: 'Creator Pro', business: 'Business & Agency', lifetime: 'Lifetime Pass' };

function syncLicenseUI() {
  $('licenseNote').textContent = state.unlocked
    ? `${PLAN_LABELS[state.plan] || 'Pro'} · clean exports, no credit`
    : 'Free plan · exports carry a PhotoQR credit';
  $('unlockBtn').hidden = state.unlocked;
}

function applyLicense(plan) {
  state.unlocked = true;
  state.plan = plan || 'pro';
  syncLicenseUI();
  renderMain();
}

async function verifyLicense(code) {
  const res = await fetch('/api/license/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error('verify unavailable');
  return res.json();
}

function storeLicense(code, plan) {
  try { localStorage.setItem(LICENSE_KEY, JSON.stringify({ code, plan })); } catch { /* private mode */ }
}

function readLicense() {
  try { return JSON.parse(localStorage.getItem(LICENSE_KEY)); } catch { return null; }
}

function clearLicense() {
  try { localStorage.removeItem(LICENSE_KEY); } catch { /* private mode */ }
  state.unlocked = false;
  state.plan = null;
  syncLicenseUI();
  renderMain();
}

const unlockDialog = $('unlockDialog');
const unlockLede = $('unlockDialog').querySelector('.unlock-lede').textContent;
function openUnlock(reason) {
  $('unlockMsg').hidden = true;
  $('licenseCode').value = '';
  unlockDialog.querySelector('.unlock-lede').textContent = reason ? `${reason} ${unlockLede}` : unlockLede;
  unlockDialog.showModal();
  $('licenseCode').focus();
}
$('unlockBtn').addEventListener('click', () => openUnlock());
$('unlockCancel').addEventListener('click', () => unlockDialog.close());
$('unlockForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const code = $('licenseCode').value.trim();
  if (!code) return;
  const btn = $('unlockSubmit');
  const msg = $('unlockMsg');
  btn.disabled = true;
  btn.textContent = 'Checking…';
  try {
    const result = await verifyLicense(code);
    if (result.ok) {
      storeLicense(code, result.plan);
      applyLicense(result.plan);
      unlockDialog.close();
      toast('Unlocked — your exports are now clean');
    } else {
      msg.textContent = result.reason === 'not-configured'
        ? 'Unlocking is not live yet. Checkout opens soon.'
        : 'That code is not valid. Check your receipt and try again.';
      msg.hidden = false;
    }
  } catch {
    msg.textContent = 'Could not reach the verification service. Try again.';
    msg.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Unlock';
  }
});

/* ---------------- boot ---------------- */

$$('.sample-tile img').forEach((img) => {
  const tile = img.closest('.sample-tile');
  const s = SAMPLES.find((x) => x.id === tile.dataset.sample);
  if (s) img.src = s.src;
});

$$('[data-photo]').forEach((img) => {
  const sample = SAMPLES.find((item) => item.id === img.dataset.photo);
  if (sample) img.src = sample.src;
});

syncLicenseUI();
const storedLicense = readLicense();
if (storedLicense && storedLicense.code) {
  verifyLicense(storedLicense.code)
    .then((r) => {
      if (r.ok || r.reason === 'not-configured') applyLicense(storedLicense.plan);
      else clearLicense();
    })
    .catch(() => applyLicense(storedLicense.plan));
}

syncUI();
loadSample(DEFAULTS.sampleId, true).then(renderMain);
renderShowcases();
// the CTA label and credit strip use Switzer; repaint once the webfont is ready
document.fonts?.ready.then(() => scheduleRender());