'use strict';
const { json, readBody, signCode } = require('../lib/api');
const { verifyRazorpayPayment } = require('../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, reason: 'method' });
  const secret = process.env.LICENSE_SECRET;
  if (!secret) return json(res, 200, { ok: false, reason: 'not-configured' });
  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { ok: false, reason: 'missing-params' }); }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return json(res, 400, { ok: false, reason: 'missing-params' });
  }
  let result;
  try { result = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature); }
  catch (err) {
    console.error('verify-payment failed:', err.message);
    return json(res, 502, { ok: false, reason: 'provider-error' });
  }
  if (!result.ok) return json(res, 400, result);
  const code = signCode({ plan: result.plan, provider: 'razorpay', iat: Date.now() }, secret);
  json(res, 200, { ok: true, code, plan: result.plan });
};