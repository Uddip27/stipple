/* PhotoQR — vector export.
   Mirrors renderQR() in app.js shape-for-shape, so the SVG matches the preview.
   Modules, finder eyes, gradients and the CTA label are true vectors; a background
   photograph or uploaded logo is embedded as an image inside the SVG. */
'use strict';

const PhotoQRSVG = (() => {
  const f = (v) => +v.toFixed(2);

  function circlePath(cx, cy, d) {
    const h = d / 2;
    return `M${f(cx - h)} ${f(cy)}a${f(h)} ${f(h)} 0 1 0 ${f(d)} 0a${f(h)} ${f(h)} 0 1 0 ${f(-d)} 0z`;
  }

  function roundRectD(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    if (r <= 0) return `M${f(x)} ${f(y)}h${f(w)}v${f(h)}h${f(-w)}z`;
    return `M${f(x + r)} ${f(y)}h${f(w - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(r)}` +
      `v${f(h - 2 * r)}a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(r)}h${f(-(w - 2 * r))}` +
      `a${f(r)} ${f(r)} 0 0 1 ${f(-r)} ${f(-r)}v${f(-(h - 2 * r))}a${f(r)} ${f(r)} 0 0 1 ${f(r)} ${f(-r)}z`;
  }

  function dotPath(cx, cy, d, style) {
    const h = d / 2;
    if (style === 'circle') return circlePath(cx, cy, d);
    if (style === 'rounded') return roundRectD(cx - h, cy - h, d, d, d * 0.3);
    if (style === 'diamond') return `M${f(cx)} ${f(cy - h)}L${f(cx + h)} ${f(cy)}L${f(cx)} ${f(cy + h)}L${f(cx - h)} ${f(cy)}z`;
    return `M${f(cx - h)} ${f(cy - h)}h${f(d)}v${f(d)}h${f(-d)}z`;
  }

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function solid(hex, alpha = 1) {
    return alpha >= 1 ? `fill="${hex}"` : `fill="${hex}" fill-opacity="${f(alpha)}"`;
  }

  /* Raster helpers for the parts that are photographs, not geometry. */
  function backgroundDataURL(cfg, px) {
    const size = Math.min(px, 1600);
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    drawCover(c.getContext('2d'), cfg.image, size, cfg);
    return c.toDataURL('image/jpeg', 0.9);
  }

  function logoDataURL(img) {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const s = Math.min(1, 640 / Math.max(iw, ih));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(iw * s));
    c.height = Math.max(1, Math.round(ih * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  }

  function build(cfg, px) {
    const qr = getMatrix(cfg.text);
    const n = qr.getModuleCount();
    const paper = cfg.paper || '#ffffff';
    const credit = creditHeight(px, cfg);
    const band = frameHeight(px, cfg);
    const H = px + band + credit;
    const mode = cfg.mode || 'watermark';
    const isWatermark = mode === 'watermark';
    const cell = px / (n + MARGIN * 2);
    const quiet = MARGIN * cell;
    const defs = [];
    const out = [];

    // background
    if (isWatermark && cfg.image) {
      out.push(`<image href="${backgroundDataURL(cfg, px)}" x="0" y="0" width="${px}" height="${px}" preserveAspectRatio="none"/>`);
      if (cfg.overlay !== 0) {
        const a = Math.min(Math.abs(cfg.overlay) / 100, 1);
        out.push(`<rect width="${px}" height="${px}" ${solid(cfg.overlay > 0 ? '#ffffff' : '#020617', a)}/>`);
      }
    } else if (isWatermark && paper.toLowerCase() === '#ffffff') {
      defs.push(`<linearGradient id="pq-bg" x1="0" y1="0" x2="${px}" y2="${px}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d7e0ec"/></linearGradient>`);
      out.push(`<rect width="${px}" height="${px}" fill="url(#pq-bg)"/>`);
    } else {
      out.push(`<rect width="${px}" height="${px}" fill="${paper}"/>`);
    }

    // quiet zone as one ring (outer minus inner square) — no seams between strips
    out.push(`<path fill="${paper}" fill-rule="evenodd" d="M0 0h${px}v${px}H0zM${f(quiet)} ${f(quiet)}v${f(px - 2 * quiet)}h${f(px - 2 * quiet)}v${f(-(px - 2 * quiet))}z"/>`);

    // ink
    const inkAlpha = isWatermark && cfg.colorType === 'solid' ? cfg.dark.alpha : 1;
    let ink;
    if (cfg.colorType === 'linear') {
      const rad = (cfg.gradAngle * Math.PI) / 180;
      const half = px / 2;
      const dx = Math.cos(rad) * half, dy = Math.sin(rad) * half;
      defs.push(`<linearGradient id="pq-ink" x1="${f(half - dx)}" y1="${f(half - dy)}" x2="${f(half + dx)}" y2="${f(half + dy)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${cfg.dark.hex}"/><stop offset="1" stop-color="${cfg.gradEnd}"/></linearGradient>`);
      ink = 'fill="url(#pq-ink)"';
    } else if (cfg.colorType === 'radial') {
      defs.push(`<radialGradient id="pq-ink" cx="${px / 2}" cy="${px / 2}" r="${f(px * 0.72)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${cfg.dark.hex}"/><stop offset="1" stop-color="${cfg.gradEnd}"/></radialGradient>`);
      ink = 'fill="url(#pq-ink)"';
    } else {
      ink = solid(cfg.dark.hex, inkAlpha);
    }

    const lum = mode === 'halftone' && cfg.image ? sampleLuminance(cfg.image, n, cfg) : null;
    const d = cell * cfg.dotScale;
    const inFinder = (r, c) => (r < 8 && c < 8) || (r < 8 && c >= n - 8) || (r >= n - 8 && c < 8);
    // the 7×7 eye itself; the light separator ring around it is drawn like any light module
    const inEye = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
    const cxOf = (c) => (MARGIN + c + 0.5) * cell;
    const cyOf = (r) => (MARGIN + r + 0.5) * cell;
    let darkD = '';
    let lightD = '';

    if (cfg.dotStyle === 'lines' && mode !== 'halftone') {
      const dark = new Uint8Array(n * n);
      const used = new Uint8Array(n * n);
      const h = d / 2;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!inFinder(r, c) && qr.isDark(r, c)) dark[r * n + c] = 1;
      for (let r = 0; r < n; r++) {
        let c = 0;
        while (c < n) {
          if (!dark[r * n + c] || used[r * n + c]) { c++; continue; }
          let e = c; while (e + 1 < n && dark[r * n + e + 1] && !used[r * n + e + 1]) e++;
          if (e > c) { darkD += roundRectD(cxOf(c) - h, cyOf(r) - h, cxOf(e) - cxOf(c) + d, d, h); for (let k = c; k <= e; k++) used[r * n + k] = 1; }
          c = e + 1;
        }
      }
      for (let c = 0; c < n; c++) {
        let r = 0;
        while (r < n) {
          if (!dark[r * n + c] || used[r * n + c]) { r++; continue; }
          let e = r; while (e + 1 < n && dark[(e + 1) * n + c] && !used[(e + 1) * n + c]) e++;
          if (e > r) { darkD += roundRectD(cxOf(c) - h, cyOf(r) - h, d, cyOf(e) - cyOf(r) + d, h); for (let k = r; k <= e; k++) used[k * n + c] = 1; }
          r = e + 1;
        }
      }
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark[r * n + c] && !used[r * n + c]) darkD += circlePath(cxOf(c), cyOf(r), d);
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
              const k = Math.min(Math.max((t - lum[r * n + c]) / t, 0), 1);
              dd = cell * (0.5 + 0.5 * k);
            }
            darkD += dotPath(cxOf(c), cyOf(r), dd, shape);
          } else if (isWatermark) {
            if (isDark) darkD += dotPath(cxOf(c), cyOf(r), d, shape);
            else lightD += dotPath(cxOf(c), cyOf(r), d, shape);
          } else if (isDark) {
            darkD += dotPath(cxOf(c), cyOf(r), d, shape);
          }
        }
      }
    }
    if (lightD) out.push(`<path ${solid(cfg.light.hex, cfg.light.alpha)} d="${lightD}"/>`);
    if (darkD) out.push(`<path ${ink} d="${darkD}"/>`);

    // finder eyes
    const eye = (x, y) => {
      const s = 7 * cell;
      out.push(`<path fill="${cfg.finder}" d="${roundRectD(x, y, s, s, cell * 1.4)}"/>`);
      out.push(`<path fill="${paper}" d="${roundRectD(x + cell, y + cell, s - 2 * cell, s - 2 * cell, cell * 0.9)}"/>`);
      out.push(`<path fill="${cfg.finder}" d="${roundRectD(x + 2 * cell, y + 2 * cell, 3 * cell, 3 * cell, cell * 0.75)}"/>`);
    };
    eye(quiet, quiet);
    eye((MARGIN + n - 7) * cell, quiet);
    eye(quiet, (MARGIN + n - 7) * cell);

    // logo card
    if (mode === 'logo') {
      const size = px * (cfg.logoInset / 100);
      const x = (px - size) / 2, y = (px - size) / 2;
      const radius = cfg.logoShape === 'circle' ? size / 2 : size * 0.22;
      const card = roundRectD(x, y, size, size, radius);
      defs.push(`<clipPath id="pq-card"><path d="${card}"/></clipPath>`);
      out.push(`<path d="${card}" fill="#ffffff" stroke="#1a1712" stroke-opacity="0.12" stroke-width="${f(Math.max(1, px * 0.002))}"/>`);
      if (cfg.logo) {
        const pad = size * 0.14;
        const inner = size - pad * 2;
        const iw = cfg.logo.naturalWidth || cfg.logo.width || 1;
        const ih = cfg.logo.naturalHeight || cfg.logo.height || 1;
        const s = Math.max(inner / iw, inner / ih);
        const w = iw * s, h = ih * s;
        out.push(`<image clip-path="url(#pq-card)" href="${logoDataURL(cfg.logo)}" x="${f(x + pad + (inner - w) / 2)}" y="${f(y + pad + (inner - h) / 2)}" width="${f(w)}" height="${f(h)}" preserveAspectRatio="none"/>`);
      } else {
        const m = size * 0.3, mx = px / 2, my = px / 2;
        out.push(`<path d="${roundRectD(mx - m, my - m, m * 1.35, m * 1.35, m * 0.36)}" fill="none" stroke="#e8431f" stroke-width="${f(size * 0.055)}"/>`);
        out.push(`<path fill="#e8431f" d="${circlePath(mx + m * 0.62, my + m * 0.62, m * 0.6)}"/>`);
      }
    }

    // CTA label band
    if (band) {
      const { band: bg, text } = frameColors(cfg);
      const label = frameLabel(cfg);
      const fs = Math.round(band * 0.36);
      const icon = band * 0.36;
      const cy = px + band * 0.47;
      out.push(`<rect x="0" y="${px}" width="${px}" height="${band}" fill="${bg}"/>`);
      out.push(`<g fill="${text}" font-family="Switzer, system-ui, -apple-system, Segoe UI, sans-serif" font-weight="600" font-size="${fs}">` +
        `<text x="${f(px / 2 + (icon + band * 0.2) / 2)}" y="${f(cy)}" text-anchor="middle" dominant-baseline="central">${esc(label)}</text></g>`);
      // chevron sits left of the label; its x is approximated from the label length
      const approx = Math.min(px * 0.84, label.length * fs * 0.56);
      const x0 = (px - (icon + band * 0.2 + approx)) / 2;
      out.push(`<path d="M${f(x0)} ${f(cy + icon * 0.22)}L${f(x0 + icon / 2)} ${f(cy - icon * 0.28)}L${f(x0 + icon)} ${f(cy + icon * 0.22)}" fill="none" stroke="${text}" stroke-width="${f(Math.max(1.5, icon * 0.14))}" stroke-linecap="round" stroke-linejoin="round"/>`);
    }

    if (credit) {
      const top = px + band;
      out.push(`<rect x="0" y="${top}" width="${px}" height="${credit}" fill="#ffffff"/>`);
      out.push(`<rect x="0" y="${top}" width="${px}" height="${Math.max(1, Math.round(credit * 0.02))}" fill="#e2e8e3"/>`);
      out.push(`<text x="${px / 2}" y="${f(top + credit / 2)}" text-anchor="middle" dominant-baseline="central" font-family="Switzer, system-ui, sans-serif" font-weight="600" font-size="${Math.round(credit * 0.4)}" fill="#1c2622">PhotoQR</text>`);
    }

    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${px} ${H}" width="${px}" height="${H}">` +
      `<title>QR code — ${esc(cfg.text.slice(0, 80))}</title>` +
      (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
      out.join('') + `</svg>`;
  }

  return { build };
})();
