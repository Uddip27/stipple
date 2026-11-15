/* PhotoQR unlock page — claims a provider payment or accepts a license code. */

const $ = (id) => document.getElementById(id);
const LICENSE_KEY = 'photoqr-license';
const PLAN_LABELS = { pro: 'Creator Pro', business: 'Business & Agency', lifetime: 'Lifetime Pass' };

try {
  document.documentElement.dataset.theme = localStorage.getItem('photoqr-theme') || 'paper';
} catch { document.documentElement.dataset.theme = 'paper'; }

function show(id) {
  for (const panel of ['claimWorking', 'claimSuccess', 'claimManual']) $(panel).hidden = panel !== id;
}

function storeLicense(code, plan) {
  try { localStorage.setItem(LICENSE_KEY, JSON.stringify({ code, plan })); } catch {}
}

function succeed(plan) {
  $('claimPlan').innerHTML = '';
  const strong = document.createElement('strong');
  strong.textContent = PLAN_LABELS[plan] || plan;
  $('claimPlan').append(strong, document.createTextNode(' is active on this device.'));
  show('claimSuccess');
}

function manual(message) {
  if (message) {
    $('manualLede').textContent = message;
  }
  show('claimManual');
  $('manualCode').focus();
}

async function claimPayment() {
  const params = new URLSearchParams(location.search);
  try {
    const res = await fetch('/api/license/claim?' + params.toString());
    const data = await res.json();
    if (data.ok && data.code) {
      storeLicense(data.code, data.plan);
      succeed(data.plan);
      return;
    }
    if (data.reason === 'not-configured') {
      manual('Checkout is not live yet. If you already have a license code, enter it below.');
    } else if (data.reason === 'provider-error') {
      manual('We could not confirm the payment with the provider. Try again in a moment, or enter your license code below.');
    } else {
      manual('This payment could not be confirmed. If you completed checkout, enter the license code from your receipt below.');
    }
  } catch {
    manual('We could not reach the verification service. Check your connection, or enter your license code below.');
  }
}

$('manualForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const code = $('manualCode').value.trim();
  if (!code) return;
  const msg = $('manualMsg');
  const btn = $('manualSubmit');
  msg.hidden = true;
  btn.disabled = true;
  btn.textContent = 'Checking…';
  try {
    const res = await fetch('/api/license/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (data.ok) {
      storeLicense(code, data.plan);
      succeed(data.plan);
      return;
    }
    msg.textContent = data.reason === 'not-configured'
      ? 'Unlocking is not live yet. Checkout opens soon.'
      : 'That code is not valid. Check your receipt and try again.';
    msg.hidden = false;
  } catch {
    msg.textContent = 'Could not reach the verification service. Try again.';
    msg.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Unlock';
  }
});

if (new URLSearchParams(location.search).get('provider')) {
  claimPayment();
} else {
  manual();
}