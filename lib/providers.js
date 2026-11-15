'use strict';
const crypto = require('crypto');
const { priceFor, PLAN_NAMES } = require('../pricing-config');

const env = process.env;

function enabledProviders() {
  const list = [];
  if (env.LEMONSQUEEZY_API_KEY && env.LEMONSQUEEZY_STORE_ID) list.push('lemonsqueezy');
  if (env.STRIPE_SECRET_KEY) list.push('stripe');
  if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) list.push('razorpay');
  if (env.DODO_API_KEY) list.push('dodo');
  return list;
}

function baseUrl(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '127.0.0.1:4173';
  const proto = req.headers['x-forwarded-proto'] || (/^(127\.0\.0\.1|localhost)(:|$)/.test(host) ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.error?.message || data.error_description || data.error?.description || data.message || `provider responded ${res.status}`;
    const err = new Error(detail);
    err.status = res.status;
    throw err;
  }
  return data;
}

/* ---------------- Stripe ---------------- */

async function createStripe(price, origin) {
  const params = new URLSearchParams();
  params.set('mode', price.cycle === 'one-time' ? 'payment' : 'subscription');
  params.set('line_items[0][price_data][currency]', price.currency.toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(price.minor));
  params.set('line_items[0][price_data][product_data][name]', `PhotoQR ${PLAN_NAMES[price.planId]}`);
  if (price.cycle !== 'one-time') params.set('line_items[0][price_data][recurring][interval]', price.cycle);
  params.set('line_items[0][quantity]', '1');
  params.set('success_url', `${origin}/unlock.html?provider=stripe&session_id={CHECKOUT_SESSION_ID}`);
  params.set('cancel_url', `${origin}/pricing.html`);
  params.set('metadata[plan]', price.planId);
  const data = await fetchJson('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  return data.url;
}

async function claimStripe(params) {
  const id = params.get('session_id');
  if (!id) return { ok: false, reason: 'missing-session' };
  const data = await fetchJson(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  if (data.payment_status !== 'paid' && data.status !== 'complete') return { ok: false, reason: 'unpaid' };
  return { ok: true, plan: data.metadata?.plan || 'pro' };
}

/* ---------------- Lemon Squeezy ---------------- */

function lsVariant(planId, cycle) {
  const key = planId === 'lifetime' ? 'LIFETIME' : `${planId.toUpperCase()}_${cycle === 'year' ? 'YEARLY' : 'MONTHLY'}`;
  return env[`LEMONSQUEEZY_VARIANT_${key}`];
}

async function createLemonSqueezy(price, origin) {
  const variant = lsVariant(price.planId, price.cycle);
  if (!variant) throw new Error(`Lemon Squeezy variant not configured for ${price.planId} (${price.cycle})`);
  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        custom_price: price.minor,
        product_options: {
          name: `PhotoQR ${PLAN_NAMES[price.planId]}`,
          redirect_url: `${origin}/unlock.html?provider=lemonsqueezy`,
        },
        checkout_data: { custom: { plan: price.planId, cycle: price.cycle } },
      },
      relationships: {
        store: { data: { type: 'stores', id: String(env.LEMONSQUEEZY_STORE_ID) } },
        variant: { data: { type: 'variants', id: String(variant) } },
      },
    },
  };
  const data = await fetchJson('https://api.lemonsqueezy.com/v1/checkouts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json',
    },
    body: JSON.stringify(body),
  });
  return data.data?.attributes?.url;
}

async function claimLemonSqueezy(params) {
  const id = params.get('checkout_id');
  if (!id) return { ok: false, reason: 'missing-checkout' };
  const data = await fetchJson(`https://api.lemonsqueezy.com/v1/checkouts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}`, Accept: 'application/vnd.api+json' },
  });
  const attrs = data.data?.attributes || {};
  if (attrs.status !== 'paid') return { ok: false, reason: 'unpaid' };
  return { ok: true, plan: attrs.checkout_data?.custom?.plan || 'pro' };
}

/* ---------------- Razorpay (INR / UPI) ---------------- */

function razorpayAuth() {
  return `Basic ${Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64')}`;
}

async function createRazorpay(price, origin) {
  if (price.currency !== 'INR') throw new Error('Razorpay checkout is available for INR only');
  const data = await fetchJson('https://api.razorpay.com/v1/payment_links', {
    method: 'POST',
    headers: { Authorization: razorpayAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: price.minor,
      currency: 'INR',
      description: `PhotoQR ${PLAN_NAMES[price.planId]}`,
      callback_url: `${origin}/unlock.html?provider=razorpay`,
      callback_method: 'get',
      notes: { plan: price.planId, cycle: price.cycle },
    }),
  });
  return data.short_url;
}

async function claimRazorpay(params) {
  const linkId = params.get('razorpay_payment_link_id');
  const refId = params.get('razorpay_payment_link_reference_id') || '';
  const status = params.get('razorpay_payment_link_status');
  const paymentId = params.get('razorpay_payment_id');
  const signature = params.get('razorpay_signature');
  if (!linkId || !paymentId || !signature) return { ok: false, reason: 'missing-params' };
  const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${linkId}|${refId}|${status}|${paymentId}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: 'bad-signature' };
  if (status !== 'paid') return { ok: false, reason: 'unpaid' };
  const data = await fetchJson(`https://api.razorpay.com/v1/payment_links/${encodeURIComponent(linkId)}`, {
    headers: { Authorization: razorpayAuth() },
  });
  if (data.status !== 'paid') return { ok: false, reason: 'unpaid' };
  return { ok: true, plan: data.notes?.plan || 'pro' };
}

/* ---------------- Dodo Payments ---------------- */

function dodoBase() {
  return (env.DODO_API_BASE || 'https://live.dodopayments.com').replace(/\/$/, '');
}

async function createDodo(price, origin) {
  const product = env[`DODO_PRODUCT_${price.planId.toUpperCase()}`];
  if (!product) throw new Error(`Dodo product not configured for ${price.planId}`);
  const item = { product_id: product, quantity: 1 };
  /* Exact regional amounts require a pay-what-you-want one-time product;
     subscription products charge their stored price. */
  if (price.cycle === 'one-time') item.amount = price.minor;
  const data = await fetchJson(`${dodoBase()}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.DODO_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_cart: [item],
      billing_currency: price.currency,
      return_url: `${origin}/unlock.html?provider=dodo`,
      cancel_url: `${origin}/pricing.html`,
      metadata: { plan: price.planId, cycle: price.cycle },
      feature_flags: { allow_currency_selection: false },
    }),
  });
  return data.checkout_url;
}

async function claimDodo(params) {
  const id = params.get('session_id');
  if (!id) return { ok: false, reason: 'missing-session' };
  const data = await fetchJson(`${dodoBase()}/checkouts/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${env.DODO_API_KEY}` },
  });
  if (data.status !== 'succeeded') return { ok: false, reason: 'unpaid' };
  return { ok: true, plan: data.metadata?.plan || 'pro' };
}

/* ---------------- dispatch ---------------- */

const CREATORS = { stripe: createStripe, lemonsqueezy: createLemonSqueezy, razorpay: createRazorpay, dodo: createDodo };
const CLAIMERS = { stripe: claimStripe, lemonsqueezy: claimLemonSqueezy, razorpay: claimRazorpay, dodo: claimDodo };

async function createCheckout(provider, price, origin) {
  const create = CREATORS[provider];
  if (!create) throw new Error('unknown provider');
  const url = await create(price, origin);
  if (!url) throw new Error('provider did not return a checkout URL');
  return url;
}

async function claimPayment(provider, params) {
  const claim = CLAIMERS[provider];
  if (!claim) return { ok: false, reason: 'unknown-provider' };
  return claim(params);
}

module.exports = { enabledProviders, baseUrl, priceFor, createCheckout, claimPayment };