/* PhotoQR.io — shared pricing configuration (browser + server). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PHOTOQR_PRICING = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CURRENCIES = {
    USD: { symbol: '$' }, GBP: { symbol: '£' }, EUR: { symbol: '€' }, JPY: { symbol: '¥' },
    AED: { symbol: 'AED', spaced: true }, INR: { symbol: '₹' }, BRL: { symbol: 'R$' },
    MXN: { symbol: 'MX$' }, IDR: { symbol: 'Rp', spaced: true }, PHP: { symbol: '₱' }, NGN: { symbol: '₦' },
  };

  /* [monthly, per-month-when-billed-yearly] */
  const PRICE_SETS = {
    usd1: { currency: 'USD', pro: [7, 5], business: [19, 14], lifetime: 49 },
    gbp1: { currency: 'GBP', pro: [5.5, 4], business: [15, 11], lifetime: 39 },
    eur1: { currency: 'EUR', pro: [6.5, 4.5], business: [18, 13], lifetime: 45 },
    jpy1: { currency: 'JPY', pro: [980, 700], business: [2800, 2000], lifetime: 6900 },
    aed1: { currency: 'AED', pro: [25, 18], business: [69, 49], lifetime: 179 },
    usd2: { currency: 'USD', pro: [4.5, 3.2], business: [12, 8.5], lifetime: 35 },
    brl3: { currency: 'BRL', pro: [15, 11], business: [39, 29], lifetime: 99 },
    mxn3: { currency: 'MXN', pro: [55, 39], business: [149, 109], lifetime: 399 },
    usd3: { currency: 'USD', pro: [3, 2.2], business: [8, 6], lifetime: 25 },
    inr4: { currency: 'INR', pro: [149, 99], business: [399, 299], lifetime: 999 },
    idr4: { currency: 'IDR', pro: [29000, 19000], business: [79000, 59000], lifetime: 199000 },
    php4: { currency: 'PHP', pro: [99, 69], business: [279, 199], lifetime: 699 },
    ngn4: { currency: 'NGN', pro: [2500, 1800], business: [6900, 4900], lifetime: 16900 },
    usd4: { currency: 'USD', pro: [1.99, 1.49], business: [4.99, 3.99], lifetime: 15 },
  };

  const TIER_COUNTRIES = {
    1: 'US CA AU NZ SG AE SA QA CH NO SE DK IL KR JP GB DE FR NL ES IT IE BE AT FI PT'.split(' '),
    2: 'PL CZ HU RO GR HR CL UY CR MY CN TW HK'.split(' '),
    3: 'BR MX TH TR ZA CO AR PE'.split(' '),
    4: 'IN ID PH NG PK BD VN EG KE GH NP LK'.split(' '),
  };
  const COUNTRY_TIER = {};
  for (const [tier, list] of Object.entries(TIER_COUNTRIES)) list.forEach((cc) => { COUNTRY_TIER[cc] = Number(tier); });

  const COUNTRY_SET = {
    GB: 'gbp1', DE: 'eur1', FR: 'eur1', NL: 'eur1', ES: 'eur1', IT: 'eur1', IE: 'eur1',
    BE: 'eur1', AT: 'eur1', FI: 'eur1', PT: 'eur1', JP: 'jpy1', AE: 'aed1',
    BR: 'brl3', MX: 'mxn3', IN: 'inr4', ID: 'idr4', PH: 'php4', NG: 'ngn4',
  };
  const TIER_SET = { 1: 'usd1', 2: 'usd2', 3: 'usd3', 4: 'usd4' };
  const TIER_OFF = { 1: 0, 2: 35, 3: 55, 4: 70 };

  const PLAN_NAMES = { free: 'Starter', pro: 'Creator Pro', business: 'Business & Agency', lifetime: 'Lifetime Pass' };

  const ZERO_DECIMAL = new Set(['JPY']);
  function minorUnits(amount, currency) {
    return ZERO_DECIMAL.has(currency) ? Math.round(amount) : Math.round(amount * 100);
  }

  function setFor(countryKey) {
    const cc = countryKey === 'EU' ? 'DE' : countryKey === 'GLOBAL' ? 'US' : countryKey;
    const tier = COUNTRY_TIER[cc] || 1;
    return { cc, tier, off: TIER_OFF[tier], set: PRICE_SETS[COUNTRY_SET[cc] || TIER_SET[tier]] };
  }

  function priceFor(countryKey, planId, cycle) {
    if (!['pro', 'business', 'lifetime'].includes(planId)) return null;
    const { cc, tier, off, set } = setFor(countryKey);
    let amount, interval;
    if (planId === 'lifetime') {
      amount = set.lifetime;
      interval = 'one-time';
    } else if (cycle === 'yearly') {
      amount = set[planId][1] * 12;
      interval = 'year';
    } else {
      amount = set[planId][0];
      interval = 'month';
    }
    return { planId, cycle: interval, amount, currency: set.currency, minor: minorUnits(amount, set.currency), cc, tier, off };
  }

  return { CURRENCIES, PRICE_SETS, COUNTRY_TIER, COUNTRY_SET, TIER_SET, TIER_OFF, PLAN_NAMES, minorUnits, setFor, priceFor };
});