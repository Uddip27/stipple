/* PhotoQR — scan readability check.
   Looks at the rendered pixels the way a phone scanner does: blur the code a
   little, sample the centre of every module, binarise with one threshold, and
   count modules that land on the wrong side. Modules hidden under a centre logo
   are counted separately, because level-H error correction is designed to absorb
   that one clustered hole. Where the browser ships a native QR decoder
   (BarcodeDetector), the result is also confirmed by actually decoding it. */
'use strict';

const PhotoQRCheck = (() => {
  const PX_PER_MODULE = 3;
  const probe = document.createElement('canvas');
  let detector;
  let detectorReady;

  function getDetector() {
    if (detectorReady) return detectorReady;
    detectorReady = (async () => {
      try {
        if (!('BarcodeDetector' in window)) return null;
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (!formats.includes('qr_code')) return null;
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        return detector;
      } catch { return null; }
    })();
    return detectorReady;
  }

  /* source: the rendered canvas; px: size of the square code area (excludes CTA band and credit). */
  function analyse(source, cfg, qr, px) {
    const n = qr.getModuleCount();
    const dim = n + MARGIN * 2;
    const size = dim * PX_PER_MODULE;
    probe.width = size;
    probe.height = size;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(source, 0, 0, px, px, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    const lumAt = (r, c) => {
      const x = (MARGIN + c) * PX_PER_MODULE + 1;
      const y = (MARGIN + r) * PX_PER_MODULE + 1;
      const i = (y * size + x) * 4;
      return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
    };

    // modules under the logo card are a known, clustered hole
    let covered = null;
    if (cfg.mode === 'logo') {
      const cell = px / dim;
      const s = px * (cfg.logoInset / 100);
      const lo = (px - s) / 2, hi = (px + s) / 2;
      covered = (r, c) => {
        const x = (MARGIN + c + 0.5) * cell, y = (MARGIN + r + 0.5) * cell;
        return x > lo && x < hi && y > lo && y < hi;
      };
    }

    const lum = new Float32Array(n * n);
    let darkSum = 0, darkN = 0, lightSum = 0, lightN = 0, hidden = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const v = lumAt(r, c);
        lum[r * n + c] = v;
        if (covered && covered(r, c)) { hidden++; continue; }
        if (qr.isDark(r, c)) { darkSum += v; darkN++; } else { lightSum += v; lightN++; }
      }
    }
    const darkMean = darkSum / Math.max(1, darkN);
    const lightMean = lightSum / Math.max(1, lightN);
    const contrast = lightMean - darkMean;
    const t = (darkMean + lightMean) / 2;
    let errors = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (covered && covered(r, c)) continue;
        const dark = qr.isDark(r, c);
        const v = lum[r * n + c];
        if (dark ? v >= t : v < t) errors++;
      }
    }
    const errorRate = errors / Math.max(1, n * n - hidden);
    const coverage = hidden / (n * n);

    let level = 'good';
    const issues = [];
    if (contrast <= 0) {
      level = 'poor';
      issues.push({ key: 'inverted', text: 'The dots are lighter than the background. Most scanners need dark dots on a light ground.' });
    } else {
      if (contrast < 0.18) { level = 'poor'; issues.push({ key: 'contrast', text: 'Very low contrast between dots and background.' }); }
      else if (contrast < 0.3) { level = 'fair'; issues.push({ key: 'contrast', text: 'Contrast is a little low. Cameras may struggle in dim light.' }); }
      if (errorRate > 0.06) { level = 'poor'; issues.push({ key: 'noise', text: 'Many dots blend into the photo underneath.' }); }
      else if (errorRate > 0.025) { if (level === 'good') level = 'fair'; issues.push({ key: 'noise', text: 'Some dots blend into the photo underneath.' }); }
    }
    if (coverage > 0.1) { level = 'poor'; issues.push({ key: 'logo', text: 'The logo hides too much of the code.' }); }
    if (n > 57 && level === 'good') { level = 'fair'; issues.push({ key: 'dense', text: 'Long content makes a dense code. Print it larger or shorten the link.' }); }

    return { level, contrast, errorRate, coverage, modules: n, issues };
  }

  /* Confirms with the platform decoder when there is one. Resolves true/false, or null when unavailable. */
  async function decode(source, expected) {
    const d = await getDetector();
    if (!d) return null;
    try {
      const found = await d.detect(source);
      return found.some((code) => code.rawValue === expected);
    } catch { return null; }
  }

  return { analyse, decode };
})();
