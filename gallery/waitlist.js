/* Sends the waitlist form to the Catalyst function named in data-endpoint
   and says what happened. No other script, no third-party code. */
(function () {
  var form = document.getElementById('waitlistForm');
  if (!form) return;
  var status = document.getElementById('waitlistStatus');
  var button = form.querySelector('button[type="submit"]');
  function say(text, kind) { status.textContent = text; status.className = 'g-form-status' + (kind ? ' is-' + kind : ''); }
  function picked(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ''; }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { say('That email address does not look right.', 'error'); form.email.focus(); return; }
    if (!picked('price')) { say('Pick one of the prices.', 'error'); return; }
    if (!form.consent.checked) { say('Tick the box so we can email you if it opens.', 'error'); return; }
    var payload = { email: email, use_case: form.use_case.value, has_key: picked('has_key'), price: picked('price'), consent: true, website: form.website.value };
    button.disabled = true; say('Sending…');
    fetch(form.getAttribute('data-endpoint'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (out) {
        if (out && out.ok) { form.reset(); say(out.already ? 'You are already on the list. Thank you.' : 'You are on the list. We will email you once, if hosted AI opens.', 'ok'); }
        else say((out && out.error) || 'Could not save that just now. Try again later.', 'error');
      }, function () { say('Could not reach the waitlist just now. Try again later.', 'error'); })
      .then(function () { button.disabled = false; });
  });
})();
