/* PhotoQR — live showcase marquee.
   Each card is rendered by the real engine in the visitor's browser and must
   pass the readability check before it is shown, so the claim under the
   heading ("each one passed the scan check") is literally true.
   Link codes point back to this site, so scanning a showcase card opens PhotoQR. */
'use strict';

(() => {
  const rowA = document.getElementById('showcaseA');
  const rowB = document.getElementById('showcaseB');
  if (!rowA || !rowB) return;

  const site = (tag) => `${location.origin}/?ref=${tag}`;
  const ink = (hex) => ({ hex, alpha: 1 });
  const WHITE = { hex: '#ffffff', alpha: 1 };

  const CARDS = [
    { title: 'Café menu', style: 'Rounded · warm ink', text: site('menu'), mode: 'geometric', dotStyle: 'rounded', dotScale: 0.6,
      dark: ink('#3b2414'), finder: '#7c2d12', paper: '#fbf6ef', frame: 'dark', frameText: 'See the menu' },
    { title: 'Wedding album', style: 'Clear photo', text: site('wedding'), mode: 'watermark', sample: 'landscape', dotScale: 0.36,
      dark: ink('#1e293b'), light: WHITE, finder: '#334155', overlay: 0, frame: 'light', frameText: 'Our photos' },
    { title: 'Guest Wi-Fi', style: 'Connected lines', text: 'WIFI:T:WPA;S:PhotoQR Guest;P:welcome;;', mode: 'geometric', dotStyle: 'lines', dotScale: 0.56,
      dark: ink('#0b3b5a'), finder: '#0b3b5a', paper: '#f3f7fa', frame: 'dark', frameText: 'Join our Wi-Fi' },
    { title: 'Portfolio', style: 'Halftone photo', text: site('portfolio'), mode: 'halftone', sample: 'abstract', dotStyle: 'circle', threshold: 0.55,
      dark: ink('#111827'), finder: '#111827' },
    { title: 'Event tickets', style: 'Gradient diamonds', text: site('tickets'), mode: 'geometric', dotStyle: 'diamond', dotScale: 0.6,
      colorType: 'linear', gradAngle: 45, dark: ink('#3b0764'), gradEnd: '#9d174d', finder: '#3b0764', frame: 'light', frameText: 'Get tickets' },
    { title: 'Road-trip playlist', style: 'Clear photo', text: site('playlist'), mode: 'watermark', sample: 'car', dotScale: 0.38,
      dark: ink('#0f172a'), light: WHITE, finder: '#0f172a', overlay: 0 },
    { title: 'Business card', style: 'Centre logo', text: site('card'), mode: 'logo', dotStyle: 'rounded', dotScale: 0.56, logoShape: 'rounded', logoInset: 20,
      dark: ink('#1e293b'), finder: '#0f172a', frame: 'dark', frameText: 'Save my contact' },
    { title: 'Product packaging', style: 'Radial ink', text: site('product'), mode: 'geometric', dotStyle: 'circle', dotScale: 0.6,
      colorType: 'radial', dark: ink('#14532d'), gradEnd: '#115e59', finder: '#14532d', paper: '#f6faf5' },
    { title: 'Home for sale', style: 'Soft wash', text: site('listing'), mode: 'watermark', sample: 'landscape', dotStyle: 'rounded', dotScale: 0.4,
      dark: { hex: '#1e293b', alpha: 0.85 }, light: { hex: '#ffffff', alpha: 0.75 }, finder: '#334155', overlay: 52, frame: 'light', frameText: 'Book a viewing' },
    { title: 'Leave a review', style: 'Classic ink', text: site('review'), mode: 'geometric', dotStyle: 'square', dotScale: 0.6,
      dark: ink('#141a17'), finder: '#141a17', frame: 'dark', frameText: 'Rate your visit' },
    { title: 'Product launch', style: 'Clear photo', text: site('launch'), mode: 'watermark', sample: 'abstract', dotScale: 0.4,
      dark: ink('#020617'), light: WHITE, finder: '#020617', overlay: 0, frame: 'dark', frameText: 'Join the waitlist' },
    { title: 'Table booking', style: 'Rounded · navy', text: site('booking'), mode: 'geometric', dotStyle: 'rounded', dotScale: 0.58,
      dark: ink('#1e3a5f'), finder: '#1e3a5f', paper: '#f4f7fb', frame: 'light', frameText: 'Reserve a table' },
  ];

  const PX = 360;

  function card(c, src) {
    const fig = document.createElement('figure');
    fig.className = 'showcase-card';
    const img = document.createElement('img');
    img.src = src;
    img.alt = `${c.title} QR code, ${c.style.toLowerCase()} style`;
    img.loading = 'lazy';
    img.decoding = 'async';
    const cap = document.createElement('figcaption');
    const t = document.createElement('strong');
    t.textContent = c.title;
    const s = document.createElement('span');
    s.textContent = c.style;
    cap.append(t, s);
    fig.append(img, cap);
    return fig;
  }

  async function build() {
    const images = {};
    await Promise.all(SAMPLES.map(async (s) => { images[s.id] = await decodeImage(s.src).catch(() => null); }));
    const made = [];
    const canvas = document.createElement('canvas');
    for (const c of CARDS) {
      const cfg = {
        ...DEFAULTS, light: WHITE, overlay: 0, paper: '#ffffff', colorType: 'solid', ...c,
        image: c.sample ? images[c.sample] : null, logo: null, credit: false, unlocked: true,
        zoom: 1, panX: 0, panY: 0,
      };
      if (c.sample && !cfg.image) continue;
      try {
        renderQR(canvas, cfg, PX);
        const check = PhotoQRCheck.analyse(canvas, cfg, getMatrix(cfg.text), PX);
        if (check.level !== 'good') continue; // only show codes we are confident scan
        made.push({ c, src: canvas.toDataURL('image/png') });
      } catch { /* skip this card */ }
    }
    matrixText = undefined; // the main studio rebuilds its own code on next render

    const half = Math.ceil(made.length / 2);
    [[rowA, made.slice(0, half)], [rowB, made.slice(half)]].forEach(([row, list]) => {
      list.forEach(({ c, src }) => row.append(card(c, src)));
      loopTrack(row, (el) => { el.querySelector('img').alt = ''; });
      row.classList.add('ready');
    });
  }

  /* Repeat a track's items until one half is wider than any screen, then
     double it: translateX(-50%) then loops with no visible gap. Copies are
     hidden from screen readers. Speed stays constant whatever the length. */
  function loopTrack(track, scrub = () => {}, pxPerSecond = 40) {
    // reduced motion: no animation, so no copies — the row simply scrolls by hand
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const originals = Array.from(track.children);
    const setWidth = track.scrollWidth || 1;
    const need = Math.max(screen.width || 0, innerWidth, 1600) + 200;
    const reps = Math.max(1, Math.ceil(need / setWidth));
    const copy = () => originals.forEach((el) => {
      const dup = el.cloneNode(true);
      dup.setAttribute('aria-hidden', 'true');
      scrub(dup);
      track.append(dup);
    });
    for (let i = 1; i < reps * 2; i++) copy();
    track.style.animationDuration = `${Math.round((setWidth * reps) / pxPerSecond)}s`;
  }

  // the "Made for" ticker loops the same way
  document.querySelectorAll('.usecase-track').forEach((track) => loopTrack(track, undefined, 32));

  const start = () => build();
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 200);
})();
