'use strict';
const { json } = require('../lib/api');
const { enabledProviders } = require('../lib/providers');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return json(res, 405, { error: 'method' });
  json(res, 200, { providers: enabledProviders(), unlockAvailable: !!process.env.LICENSE_SECRET });
};