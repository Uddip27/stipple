'use strict';
const { json, readBody } = require('../lib/api');
const { enabledProviders, baseUrl, priceFor, createCheckout } = require('../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { error: 'method' });
  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { error: 'Invalid request.' }); }
  const { provider, planId, cycle, country } = body || {};
  if (!enabledProviders().includes(provider)) return json(res, 400, { error: 'That payment method is not available yet.' });
  const price = priceFor(country, planId, cycle);
  if (!price) return json(res, 400, { error: 'Unknown plan.' });
  try {
    const url = await createCheckout(provider, price, baseUrl(req));
    json(res, 200, { url });
  } catch (err) {
    console.error('checkout failed:', provider, err.message);
    json(res, 502, { error: 'Checkout could not be opened. Try another method.' });
  }
};