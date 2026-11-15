'use strict';
const { json, readBody } = require('../lib/api');
const { enabledProviders, priceFor, createRazorpayOrder } = require('../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
  if (!enabledProviders().includes('razorpay')) return json(res, 400, { ok: false, error: 'Razorpay is not configured yet.' });
  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { ok: false, error: 'Invalid request.' }); }
  const { planId, cycle, country } = body || {};
  const price = priceFor(country, planId, cycle);
  if (!price) return json(res, 400, { ok: false, error: 'Unknown plan.' });
  if (price.currency !== 'INR') return json(res, 400, { ok: false, error: 'Razorpay is available for INR only.' });
  if (price.minor < 100) return json(res, 400, { ok: false, error: 'Amount below the Razorpay minimum of 100 paise.' });
  const receipt = `photoqr_${price.planId}_${price.cycle}_${Date.now()}`;
  try {
    const order = await createRazorpayOrder(price, receipt);
    json(res, 200, {
      ok: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID,
      plan: price.planId,
    });
  } catch (err) {
    console.error('create-order failed:', err.message);
    if (err.status === 401) return json(res, 401, { ok: false, error: 'Razorpay authentication failed. Check the API keys.' });
    json(res, 502, { ok: false, error: 'Could not create the order. Try again.' });
  }
};