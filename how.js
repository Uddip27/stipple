/* PhotoQR — "See how it works" walkthrough.
   A self-playing demo of the studio. It uses the real render engine and the
   real readability check, so every frame shows what the product actually does.
   Plays only while on screen, pauses on request, and never auto-plays for
   people who prefer reduced motion. */
'use strict';

(() => {
  const root = document.getElementById('demo');
  if (!root) return;
  const q = (sel) => root.querySelector(sel);
  const qa = (sel) => Array.from(root.querySelectorAll(sel));

  const win = q('#demoWindow');
  const canvas = q('#demoCanvas');
  const cursor = q('#demoCursor');
  const steps = qa('.demo-step');
  const PX = 520;
  const DEMO_TEXT = 'https://bloom.cafe/menu';

  const BASE = {
    ...DEFAULTS, text: '', credit: false, unlocked: true, logo: null, image: null,
    mode: 'geometric', dotStyle: 'rounded', dotScale: 0.56, colorType: 'solid',
    dark: { hex: '#1e293b', alpha: 1 }, light: { hex: '#ffffff', alpha: 1 },
    finder: '#1e293b', paper: '#ffffff', overlay: 0, frame: 'none', frameText: 'Scan me',
    zoom: 1, panX: 0, panY: 0,
  };

  let photo = null;
  const photoReady = decodeImage(SAMPLES.find((s) => s.id === 'landscape').src).then((img) => { photo = img; });

  /* Final state after each step, so any step can be shown instantly. */
  const AFTER = [
    (c) => ({ ...c, text: DEMO_TEXT }),
    (c) => ({ ...c, mode: 'watermark', image: photo, dotStyle: 'circle', dotScale: 0.36, finder: '#334155' }),
    (c) => ({ ...c, dotStyle: 'rounded', finder: '#7c2d12' }),
    (c) => ({ ...c, frame: 'dark' }),
    (c) => c,
    (c) => c,
  ];
  const CAPTIONS = [
    'Type or paste where the code should lead. Wi-Fi, email and phone have their own simple forms.',
    'Add a photo. It stays sharp and full-colour behind the dots.',
    'Try dot shapes and colours. The preview updates the moment you change something.',
    'Add a label so people know what to do when they see it.',
    'PhotoQR checks every dot the way a phone camera sees it, so you know it will scan.',
    'Download a PNG for anywhere, an SVG for print, or a looping GIF for screens.',
  ];

  const configBefore = (i) => AFTER.slice(0, i).reduce((c, f) => f(c), { ...BASE });
  let cfg = { ...BASE };

  function draw(next) {
    cfg = next;
    if (!cfg.text) {
      const ctx = canvas.getContext('2d');
      canvas.width = PX; canvas.height = PX;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, PX, PX);
      ctx.strokeStyle = '#dde5df';
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, PX - 80, PX - 80);
      return;
    }
    renderQR(canvas, cfg, PX);
  }

  /* ---------------- UI state ---------------- */

  function setActiveRow(i) {
    qa('.demo-row').forEach((r) => r.classList.toggle('is-active', Number(r.dataset.row) === i));
  }
  function setOn(sel, attr, value) {
    qa(sel).forEach((el) => el.classList.toggle('on', el.dataset[attr] === value));
  }
  function paintControls(c, step) {
    q('#demoText').textContent = c.text;
    setOn('[data-demo-photo]', 'demoPhoto', c.image ? 'landscape' : '');
    setOn('[data-demo-dot]', 'demoDot', c.mode === 'watermark' ? c.dotStyle : '');
    setOn('[data-demo-frame]', 'demoFrame', c.frame);
    setOn('[data-demo-format]', 'demoFormat', step >= 5 ? 'PNG' : '');
    q('#demoBadge').classList.toggle('show', step >= 4);
  }
  function markStep(i) {
    steps.forEach((s, k) => {
      s.classList.toggle('active', k === i);
      s.classList.toggle('done', k < i);
      s.setAttribute('aria-current', k === i ? 'step' : 'false');
    });
    q('#demoCaption').textContent = CAPTIONS[i];
    setActiveRow(i);
  }
  function runBar(i, ms) {
    steps.forEach((s, k) => {
      const bar = s.querySelector('.demo-bar i');
      bar.style.transition = 'none';
      bar.style.width = k < i ? '100%' : '0%';
    });
    const bar = steps[i].querySelector('.demo-bar i');
    void bar.offsetWidth;
    if (ms) {
      bar.style.transition = `width ${ms}ms linear`;
      bar.style.width = '100%';
    } else {
      bar.style.width = '100%';
    }
  }

  /* ---------------- motion helpers ---------------- */

  let token = 0;
  const CANCEL = Symbol('cancel');
  const wait = (ms, my) => new Promise((resolve, reject) => {
    setTimeout(() => (my === token ? resolve() : reject(CANCEL)), ms);
  });

  function cursorTo(el, my, ms = 650) {
    const w = win.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const x = r.left - w.left + r.width * 0.55;
    const y = r.top - w.top + r.height * 0.6;
    cursor.style.transitionDuration = `${ms}ms`;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.classList.add('show');
    return wait(ms + 60, my);
  }
  async function press(el, my) {
    cursor.classList.add('press');
    el?.classList.add('pressed');
    await wait(180, my);
    cursor.classList.remove('press');
    el?.classList.remove('pressed');
  }

  /* ---------------- the six steps ---------------- */

  const DURATION = [5200, 3600, 5000, 3200, 3800, 4600];

  const RUN = [
    async (my) => {
      const input = q('#demoInput');
      await cursorTo(input, my);
      await press(input, my);
      input.classList.add('typing');
      for (let k = 1; k <= DEMO_TEXT.length; k++) {
        const text = DEMO_TEXT.slice(0, k);
        q('#demoText').textContent = text;
        draw({ ...cfg, text });
        await wait(k < 9 ? 45 : 95, my);
      }
      input.classList.remove('typing');
    },
    async (my) => {
      await photoReady;
      await cursorTo(q('[data-demo-photo="car"]'), my, 550);
      await cursorTo(q('[data-demo-photo="landscape"]'), my, 350);
      await press(q('[data-demo-photo="landscape"]'), my);
      const next = AFTER[1](cfg);
      paintControls(next, 1);
      canvas.classList.add('swap');
      draw(next);
      await wait(400, my);
      canvas.classList.remove('swap');
    },
    async (my) => {
      for (const dot of ['diamond', 'rounded']) {
        const pill = q(`[data-demo-dot="${dot}"]`);
        await cursorTo(pill, my, 520);
        await press(pill, my);
        const next = { ...cfg, dotStyle: dot, finder: dot === 'rounded' ? '#7c2d12' : cfg.finder };
        paintControls(next, 2);
        draw(next);
        await wait(900, my);
      }
    },
    async (my) => {
      const pill = q('[data-demo-frame="dark"]');
      await cursorTo(pill, my);
      await press(pill, my);
      const next = AFTER[3](cfg);
      paintControls(next, 3);
      draw(next);
    },
    async (my) => {
      cursor.classList.remove('show');
      const plate = q('.demo-plate');
      plate.classList.add('scanning');
      await wait(1500, my);
      plate.classList.remove('scanning');
      const result = PhotoQRCheck.analyse(canvas, cfg, getMatrix(cfg.text), PX);
      q('#demoBadgeText').textContent = result.level === 'good' ? 'Scans reliably' : result.level === 'fair' ? 'Should scan' : 'Hard to scan';
      q('#demoBadge').dataset.level = result.level;
      q('#demoBadge').classList.add('show');
    },
    async (my) => {
      const png = q('[data-demo-format="PNG"]');
      await cursorTo(q('[data-demo-format="SVG"]'), my, 600);
      await cursorTo(png, my, 300);
      await press(png, my);
      setOn('[data-demo-format]', 'demoFormat', 'PNG');
      const dl = q('#demoDownload');
      await cursorTo(dl, my, 500);
      await press(dl, my);
      q('#demoToast').classList.add('show');
      await wait(1600, my);
      q('#demoToast').classList.remove('show');
    },
  ];

  /* ---------------- player ---------------- */

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let current = 0;
  let playing = !reduced.matches;
  let visible = false;
  let running = false;

  function settle(i) {
    const c = AFTER[i](configBefore(i));
    paintControls(c, i);
    draw(c);
    markStep(i);
    runBar(i, 0);
    if (i >= 4) {
      const r = c.text ? PhotoQRCheck.analyse(canvas, c, getMatrix(c.text), PX) : null;
      q('#demoBadgeText').textContent = r && r.level !== 'good' ? 'Should scan' : 'Scans reliably';
    }
  }

  function prepare(i) {
    const c = configBefore(i);
    paintControls(c, i);
    draw(c);
    markStep(i);
    q('#demoToast').classList.remove('show');
  }

  async function loop() {
    if (running) return;
    running = true;
    const my = ++token;
    try {
      while (playing && visible) {
        prepare(current);
        runBar(current, DURATION[current]);
        const started = performance.now();
        await RUN[current](my);
        const rest = DURATION[current] - (performance.now() - started);
        await wait(Math.max(700, rest), my);
        if (current === RUN.length - 1) {
          await wait(1200, my);
          current = 0;
        } else {
          current++;
        }
      }
    } catch (e) {
      if (e !== CANCEL) throw e;
    } finally {
      if (my === token) running = false;
    }
  }

  function stop() {
    token++;
    running = false;
    cursor.classList.remove('show', 'press');
    q('.demo-plate').classList.remove('scanning');
    q('#demoInput').classList.remove('typing');
    settle(current);
  }

  function syncPlayButton() {
    const btn = q('#demoPlay');
    btn.setAttribute('aria-pressed', String(playing));
    btn.classList.toggle('is-paused', !playing);
    q('#demoPlayLabel').textContent = playing ? 'Pause' : 'Play';
  }

  q('#demoPlay').addEventListener('click', () => {
    playing = !playing;
    syncPlayButton();
    if (playing) loop(); else stop();
  });

  steps.forEach((btn) => btn.addEventListener('click', () => {
    current = Number(btn.dataset.step);
    stop();
    if (playing) {
      setTimeout(loop, 0);
    } else {
      settle(current);
    }
  }));

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && playing) loop();
    else if (!visible && running) stop();
  }, { threshold: 0.35 }).observe(root);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && running) stop();
    else if (!document.hidden && visible && playing) loop();
  });

  syncPlayButton();
  photoReady.finally(() => { if (!running) settle(current); });
  settle(0);
})();
