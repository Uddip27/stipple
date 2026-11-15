'use strict';
const crypto = require('crypto');

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 65536) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('invalid JSON')); }
    });
    req.on('error', reject);
  });
}

function signCode(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyCode(code, secret) {
  if (typeof code !== 'string' || code.length > 2048) return { ok: false, reason: 'invalid' };
  const dot = code.lastIndexOf('.');
  if (dot < 1) return { ok: false, reason: 'invalid' };
  const body = code.slice(0, dot);
  const sig = Buffer.from(code.slice(dot + 1));
  const expected = Buffer.from(crypto.createHmac('sha256', secret).update(body).digest('base64url'));
  if (sig.length !== expected.length || !crypto.timingSafeEqual(sig, expected)) return { ok: false, reason: 'invalid' };
  let payload;
  try { payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); }
  catch { return { ok: false, reason: 'invalid' }; }
  if (!payload || typeof payload.plan !== 'string') return { ok: false, reason: 'invalid' };
  return { ok: true, plan: payload.plan };
}

module.exports = { json, readBody, signCode, verifyCode };