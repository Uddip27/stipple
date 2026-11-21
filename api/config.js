'use strict';
const { json } = require('../lib/api');
const { enabledProviders } = require('../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'method' });
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  json(res, 200, {
    providers: enabledProviders(),
    unlockAvailable: !!process.env.LICENSE_SECRET,
    razorpayMode: enabledProviders().includes('razorpay') ? (keyId.startsWith('rzp_live_') ? 'live' : 'test') : null,
  });
};