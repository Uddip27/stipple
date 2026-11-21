'use strict';
const { json, readBody, signCode } = require('../lib/api');
const { verifyRazorpayPayment } = require('../lib/providers');

/* The pricing page reads `error` to show a message; keep `reason` for diagnostics. */
const MESSAGES = {
  'not-configured': 'Payment confirmation is not configured yet. Contact support.',
  'missing-params': 'Razorpay did not return all payment details. Try again.',
  'provider-error': 'We could not confirm the payment with Razorpay. Try again in a moment.',
  'bad-signature': 'Payment signature could not be verified. Contact support with your payment ID.',
  'order-mismatch': 'Payment does not match this order. Contact support with your payment ID.',
  unpaid: 'Payment was not captured yet. Try again in a moment.',
};
function fail(res, status, reason) {
  return json(res, status, { ok: false, reason, error: MESSAGES[reason] || 'Payment could not be confirmed.' });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return fail(res, 405, 'method');
  const secret = process.env.LICENSE_SECRET;
  if (!secret) return fail(res, 200, 'not-configured');
  let body;
  try { body = await readBody(req); }
  catch { return fail(res, 400, 'missing-params'); }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return fail(res, 400, 'missing-params');
  }
  let result;
  try { result = await verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature); }
  catch (err) {
    console.error('verify-payment failed:', err.message);
    return fail(res, 502, 'provider-error');
  }
  if (!result.ok) return fail(res, 400, result.reason);
  const code = signCode({ plan: result.plan, provider: 'razorpay', iat: Date.now() }, secret);
  json(res, 200, { ok: true, code, plan: result.plan });
};