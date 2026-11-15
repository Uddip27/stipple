/* PhotoQR pricing — regional PPP tiers, detection and checkout hook. */

const $ = (id) => document.getElementById(id);
const rootEl = document.documentElement;

/* ---------------- pricing configuration ---------------- */

const { CURRENCIES, PRICE_SETS, COUNTRY_TIER, COUNTRY_SET, TIER_SET, TIER_OFF, PLAN_NAMES } = window.PHOTOQR_PRICING;

const COUNTRY_NAMES = {
  US: 'United States', CA: 'Canada', AU: 'Australia', NZ: 'New Zealand', SG: 'Singapore',
  AE: 'the UAE', SA: 'Saudi Arabia', QA: 'Qatar', CH: 'Switzerland', NO: 'Norway', SE: 'Sweden',
  DK: 'Denmark', IL: 'Israel', KR: 'South Korea', JP: 'Japan', GB: 'the UK', DE: 'Germany',
  FR: 'France', NL: 'the Netherlands', ES: 'Spain', IT: 'Italy', IE: 'Ireland', BE: 'Belgium',
  AT: 'Austria', FI: 'Finland', PT: 'Portugal', PL: 'Poland', CZ: 'Czechia', HU: 'Hungary',
  RO: 'Romania', GR: 'Greece', HR: 'Croatia', CL: 'Chile', UY: 'Uruguay', CR: 'Costa Rica',
  MY: 'Malaysia', CN: 'China', TW: 'Taiwan', HK: 'Hong Kong', BR: 'Brazil', MX: 'Mexico',
  TH: 'Thailand', TR: 'Turkey', ZA: 'South Africa', CO: 'Colombia', AR: 'Argentina', PE: 'Peru',
  IN: 'India', ID: 'Indonesia', PH: 'the Philippines', NG: 'Nigeria', PK: 'Pakistan',
  BD: 'Bangladesh', VN: 'Vietnam', EG: 'Egypt', KE: 'Kenya', GH: 'Ghana', NP: 'Nepal', LK: 'Sri Lanka',
};

const TIMEZONE_COUNTRY = {
  'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Jakarta': 'ID', 'Asia/Manila': 'PH',
  'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Singapore': 'SG', 'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA', 'Asia/Qatar': 'QA', 'Asia/Karachi': 'PK', 'Asia/Dhaka': 'BD',
  'Asia/Ho_Chi_Minh': 'VN', 'Asia/Bangkok': 'TH', 'Asia/Kathmandu': 'NP', 'Asia/Colombo': 'LK',
  'Asia/Kuala_Lumpur': 'MY', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
  'Asia/Jerusalem': 'IL', 'Europe/London': 'GB', 'Europe/Berlin': 'DE', 'Europe/Paris': 'FR',
  'Europe/Madrid': 'ES', 'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE',
  'Europe/Vienna': 'AT', 'Europe/Helsinki': 'FI', 'Europe/Lisbon': 'PT', 'Europe/Dublin': 'IE',
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR', 'Europe/Zagreb': 'HR', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Zurich': 'CH', 'America/Sao_Paulo': 'BR',
  'America/Mexico_City': 'MX', 'America/Bogota': 'CO', 'America/Argentina/Buenos_Aires': 'AR',
  'America/Lima': 'PE', 'America/Santiago': 'CL', 'America/Montevideo': 'UY',
  'America/Costa_Rica': 'CR', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
  'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
  'America/Los_Angeles': 'US', 'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU',
  'Pacific/Auckland': 'NZ', 'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA',
  'Africa/Nairobi': 'KE', 'Africa/Accra': 'GH', 'Africa/Cairo': 'EG',
};

const REGIONS = ['US', 'CA', 'AU', 'SG', 'GB', 'EU', 'JP', 'AE', 'IN', 'BR', 'MX', 'ID', 'PH', 'NG', 'ZA', 'GLOBAL'];

/* ---------------- state ---------------- */

const state = { cycle: 'yearly', pricing: null, source: null };

function flag(cc) {
  if (cc === 'EU') return '🇪🇺';
  if (cc === 'GLOBAL') return '🌍';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}

function fmt(n, currency) {
  const c = CURRENCIES[currency];
  const dec = Number.isInteger(n) ? 0 : 2;
  return c.symbol + (c.spaced ? ' ' : '') + n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
}

function pricingFor(key) {
  const cc = key === 'EU' ? 'DE' : key === 'GLOBAL' ? 'US' : key;
  const tier = COUNTRY_TIER[cc] || 1;
  const set = PRICE_SETS[COUNTRY_SET[cc] || TIER_SET[tier]];
  const name = key === 'EU' ? 'the Eurozone' : key === 'GLOBAL' ? 'Global' : (COUNTRY_NAMES[cc] || cc);
  return { key, cc, tier, off: TIER_OFF[tier], name, flag: flag(key), ...set };
}

/* ---------------- detection ---------------- */

function fallbackCountry() {
  try {
    const region = new Intl.Locale(navigator.language).region;
    if (region && COUNTRY_NAMES[region]) return region;
  } catch {}
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  return TIMEZONE_COUNTRY[tz] || 'US';
}

async function detectCountry() {
  try {
    const cached = sessionStorage.getItem('photoqr-geo');
    if (cached && COUNTRY_NAMES[cached]) return cached;
  } catch {}
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 2000);
  try {
    const res = await fetch('https://api.country.is/', { signal: ctrl.signal });
    const data = await res.json();
    if (data && /^[A-Z]{2}$/.test(data.country || '')) {
      try { sessionStorage.setItem('photoqr-geo', data.country); } catch {}
      return data.country;
    }
  } catch {} finally { clearTimeout(timer); }
  return fallbackCountry();
}

/* ---------------- rendering ---------------- */

function regionLabel(p) {
  return `${p.flag} ${p.name.replace(/^the /, '')} · ${p.currency}`;
}

function buildSelector() {
  const sel = $('regionSelect');
  sel.innerHTML = '';
  for (const key of REGIONS) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = regionLabel(pricingFor(key));
    sel.appendChild(opt);
  }
}

function ensureOption(key) {
  const sel = $('regionSelect');
  if (![...sel.options].some((o) => o.value === key)) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = regionLabel(pricingFor(key));
    sel.insertBefore(opt, sel.firstChild);
  }
  sel.value = key;
}

function updatePrices() {
  const p = state.pricing;
  if (!p) return;
  const yearly = state.cycle === 'yearly';
  const amount = (plan) => document.querySelector(`[data-amount="${plan}"]`);
  const bill = (plan) => document.querySelector(`[data-bill="${plan}"]`);
  amount('free').textContent = fmt(0, p.currency);
  for (const plan of ['pro', 'business']) {
    const monthly = yearly ? p[plan][1] : p[plan][0];
    amount(plan).textContent = fmt(monthly, p.currency);
    bill(plan).textContent = yearly ? `${fmt(p[plan][1] * 12, p.currency)} billed yearly` : 'billed monthly';
  }
  amount('lifetime').textContent = fmt(p.lifetime, p.currency);
  $('pricingNote').textContent = `Showing ${p.currency} prices for ${p.name.replace(/^the /, '')}. Yearly plans are billed once a year · cancel anytime.`;
}

function applyRegion(key, source) {
  state.pricing = pricingFor(key);
  state.source = source;
  ensureOption(key);
  $('regionSelect').disabled = false;
  document.querySelectorAll('.plan-price').forEach((el) => el.classList.remove('loading'));
  $('planGrid').setAttribute('aria-busy', 'false');
  updatePrices();
  const banner = $('pppBanner');
  if (state.pricing.off > 0) {
    banner.textContent = `${state.pricing.flag} Welcome from ${state.pricing.name}! Regional Purchasing Power Parity pricing (${state.pricing.off}% off) has been ${source === 'auto' ? 'automatically applied' : 'applied'}.`;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function markLoading() {
  document.querySelectorAll('.plan-price').forEach((el) => el.classList.add('loading'));
  $('planGrid').setAttribute('aria-busy', 'true');
}

function setCycle(cycle) {
  state.cycle = cycle;
  document.querySelectorAll('#billingToggle button').forEach((btn) => {
    const active = btn.dataset.cycle === cycle;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-pressed', String(active));
  });
  updatePrices();
}

/* ---------------- checkout ---------------- */

/* Connect a custom payment flow by assigning window.PhotoQRCheckout = (detail) => {…}. */

const PROVIDER_LABELS = {
  lemonsqueezy: { name: 'Lemon Squeezy', note: 'Card · PayPal' },
  stripe: { name: 'Stripe', note: 'Card · Apple Pay · Google Pay' },
  razorpay: { name: 'Razorpay', note: 'UPI · Cards · Netbanking' },
  dodo: { name: 'Dodo Payments', note: 'Card · local methods' },
};

let providerConfig = null;
async function loadProviderConfig() {
  if (providerConfig) return providerConfig;
  try {
    const res = await fetch('/api/config');
    providerConfig = res.ok ? await res.json() : { providers: [] };
  } catch { providerConfig = { providers: [] }; }
  return providerConfig;
}

function planPriceLabel(planId, currency, billingCycle) {
  const p = state.pricing;
  const price = planId === 'lifetime' ? fmt(p.lifetime, currency)
    : fmt(billingCycle === 'yearly' ? p[planId][1] : p[planId][0], currency);
  const suffix = planId === 'lifetime' ? ' one-time' : billingCycle === 'yearly' ? '/mo · billed yearly' : '/mo';
  return `${PLAN_NAMES[planId]} · ${price}${suffix}`;
}

async function onSelectPlan(planId, currency, billingCycle, countryCode) {
  const detail = { planId, currency, billingCycle, countryCode };
  window.dispatchEvent(new CustomEvent('photoqr:select-plan', { detail }));
  if (typeof window.PhotoQRCheckout === 'function') {
    window.PhotoQRCheckout(detail);
    return;
  }
  const cfg = await loadProviderConfig();
  const available = (cfg.providers || []).filter((id) => id !== 'razorpay' || currency === 'INR');
  if (!available.length) {
    toast(`${planPriceLabel(planId, currency, billingCycle)} — checkout opens soon.`);
    return;
  }
  openProviderDialog(detail, available);
}

function openProviderDialog(detail, providers) {
  $('providerSummary').textContent = planPriceLabel(detail.planId, detail.currency, detail.billingCycle);
  const list = $('providerList');
  list.innerHTML = '';
  $('providerMsg').hidden = true;
  for (const id of providers) {
    const meta = PROVIDER_LABELS[id];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'provider-option';
    const name = document.createElement('span');
    name.className = 'provider-name';
    name.textContent = meta.name;
    const note = document.createElement('span');
    note.className = 'provider-note';
    note.textContent = meta.note;
    btn.append(name, note);
    btn.addEventListener('click', () => (id === 'razorpay' ? startRazorpayCheckout(detail, btn) : startCheckout(id, detail, btn)));
    list.appendChild(btn);
  }
  $('providerDialog').showModal();
}

async function startCheckout(provider, detail, btn) {
  const msg = $('providerMsg');
  const name = btn.querySelector('.provider-name');
  const original = name.textContent;
  msg.hidden = true;
  btn.disabled = true;
  name.textContent = 'Opening checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, planId: detail.planId, cycle: detail.billingCycle, country: detail.countryCode }),
    });
    const data = await res.json();
    if (res.ok && data.url) {
      window.location.assign(data.url);
      return;
    }
    msg.textContent = data.error || 'Checkout could not be opened. Try another method.';
    msg.hidden = false;
  } catch {
    msg.textContent = 'Could not reach checkout. Try again.';
    msg.hidden = false;
  } finally {
    btn.disabled = false;
    name.textContent = original;
  }
}

function storeLicense(code, plan) {
  try { localStorage.setItem('photoqr-license', JSON.stringify({ code, plan })); } catch {}
}

async function startRazorpayCheckout(detail, btn) {
  const msg = $('providerMsg');
  const name = btn.querySelector('.provider-name');
  const original = name.textContent;
  const fail = (text) => { if (!$('providerDialog').open) $('providerDialog').showModal(); msg.textContent = text; msg.hidden = false; btn.disabled = false; name.textContent = original; };
  msg.hidden = true;
  btn.disabled = true;
  name.textContent = 'Opening checkout…';
  let order;
  try {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: detail.planId, cycle: detail.billingCycle, country: detail.countryCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.order_id) { fail(data.error || 'Could not create the order. Try again.'); return; }
    order = data;
  } catch { fail('Could not reach checkout. Try again.'); return; }
  if (typeof window.Razorpay !== 'function') { fail('The Razorpay checkout script did not load. Check your connection and try again.'); return; }
  const rzp = new window.Razorpay({
    key: order.key_id,
    amount: order.amount,
    currency: order.currency,
    name: 'PhotoQR',
    description: planPriceLabel(detail.planId, detail.currency, detail.billingCycle),
    order_id: order.order_id,
    theme: { color: '#3c684b' },
    handler: async (response) => {
      try {
        const res = await fetch('/api/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok && data.code) {
          storeLicense(data.code, data.plan);
          window.location.assign('index.html#studio');
          return;
        }
        fail(data.error || 'Payment could not be confirmed. Contact support with your payment ID.');
      } catch { fail('Could not confirm the payment. Try again.'); }
    },
    modal: { ondismiss: () => fail('Payment cancelled.') },
  });
  rzp.on('payment.failed', (event) => fail(event.error && event.error.description ? event.error.description : 'Payment failed. Try another method.'));
  $('providerDialog').close();
  rzp.open();
  btn.disabled = false;
  name.textContent = original;
}

$('providerCancel').addEventListener('click', () => $('providerDialog').close());

/* ---------------- chrome: theme, nav, toast ---------------- */

function setTheme(theme) {
  rootEl.dataset.theme = theme;
  try { localStorage.setItem('photoqr-theme', theme); } catch {}
}
try { setTheme(localStorage.getItem('photoqr-theme') || 'paper'); } catch { setTheme('paper'); }
$('themeToggle').addEventListener('click', () => {
  setTheme(rootEl.dataset.theme === 'ink' ? 'paper' : 'ink');
});

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

let toastTimer;
function toast(msg) {
  $('toastMsg').textContent = msg;
  $('toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3200);
}

/* ---------------- events + init ---------------- */

$('regionSelect').addEventListener('change', (e) => {
  try { localStorage.setItem('photoqr-region', e.target.value); } catch {}
  applyRegion(e.target.value, 'manual');
});

document.querySelectorAll('#billingToggle button').forEach((btn) => {
  btn.addEventListener('click', () => setCycle(btn.dataset.cycle));
});

document.querySelectorAll('[data-plan]').forEach((btn) => {
  btn.addEventListener('click', () => {
    if (!state.pricing) return;
    const cycle = btn.dataset.plan === 'lifetime' ? 'one-time' : state.cycle;
    onSelectPlan(btn.dataset.plan, state.pricing.currency, cycle, state.pricing.cc);
  });
});

buildSelector();
let manual = null;
try { manual = localStorage.getItem('photoqr-region'); } catch {}
if (manual && (REGIONS.includes(manual) || COUNTRY_NAMES[manual])) {
  applyRegion(manual, 'manual');
} else {
  markLoading();
  const started = performance.now();
  detectCountry().then((cc) => {
    const wait = Math.max(0, 220 - (performance.now() - started));
    setTimeout(() => applyRegion(cc, 'auto'), wait);
  });
}