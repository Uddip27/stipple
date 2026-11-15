'use strict';
const { json, readBody, verifyCode } = require('../../lib/api');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, reason: 'method' });
  const secret = process.env.LICENSE_SECRET;
  if (!secret) return json(res, 200, { ok: false, reason: 'not-configured' });
  let body;
  try { body = await readBody(req); }
  catch { return json(res, 400, { ok: false, reason: 'invalid' }); }
  const result = verifyCode(body.code, secret);
  json(res, 200, result.ok ? { ok: true, plan: result.plan } : { ok: false, reason: 'invalid' });
};