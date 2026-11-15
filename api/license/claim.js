'use strict';
const { json, signCode } = require('../../lib/api');
const { claimPayment, enabledProviders } = require('../../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { ok: false, reason: 'method' });
  const secret = process.env.LICENSE_SECRET;
  if (!secret) return json(res, 200, { ok: false, reason: 'not-configured' });
  const params = new URL(req.url, 'http://localhost').searchParams;
  const provider = params.get('provider');
  if (!provider) return json(res, 400, { ok: false, reason: 'missing-provider' });
  if (!enabledProviders().includes(provider)) return json(res, 200, { ok: false, reason: 'provider-unavailable' });
  let result;
  try { result = await claimPayment(provider, params); }
  catch (err) {
    console.error('claim failed:', provider, err.message);
    return json(res, 502, { ok: false, reason: 'provider-error' });
  }
  if (!result.ok) return json(res, 200, result);
  const code = signCode({ plan: result.plan, provider, iat: Date.now() }, secret);
  json(res, 200, { ok: true, code, plan: result.plan });
};