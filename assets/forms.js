/* ============================================================
   Biviano General Contracting — website lead form wiring
   Posts every .js-lead-form on the site to the Biviano GHL
   inbound webhook (location zPo4vLlEjjXCflgDSXlI).
   Flat JSON payload: first_name, last_name, full_name, phone,
   email, project_type, message, lead_source, page_url.
   ============================================================ */
(function () {
  'use strict';

  var WEBHOOK = 'https://services.leadconnectorhq.com/hooks/zPo4vLlEjjXCflgDSXlI/webhook-trigger/58030e22-679b-4dc3-832d-9156d3515f26';
  var LEAD_SOURCE = 'Website - bivianocontracting.com';
  var PHONE = '617-678-6446';
  var TEL = '6176786446';

  function val(fd, key) {
    return (fd.get(key) || '').toString().trim();
  }

  function buildPayload(form) {
    var fd = new FormData(form);
    var first = val(fd, 'first_name');
    var last = val(fd, 'last_name');
    var full = (val(fd, 'full_name') || (first + ' ' + last)).trim();
    return {
      first_name: first,
      last_name: last,
      full_name: full,
      phone: val(fd, 'phone'),
      email: val(fd, 'email'),
      project_type: val(fd, 'project_type'),
      town: val(fd, 'town'),
      message: val(fd, 'message'),
      lead_source: LEAD_SOURCE,
      page_url: window.location.href
    };
  }

  // Inline error banner inside the form (created once, reused).
  function setError(form, msg) {
    var err = form.querySelector('.js-form-error');
    if (!msg) {
      if (err) { err.style.display = 'none'; }
      return;
    }
    if (!err) {
      err = document.createElement('div');
      err.className = 'js-form-error';
      err.setAttribute('role', 'alert');
      err.style.cssText = 'margin-bottom:10px;padding:10px 14px;border-radius:8px;' +
        'background:#fdecec;border:1px solid #f3c2c2;color:#9a2424;font-size:13px;line-height:1.5;';
      form.insertBefore(err, form.firstChild);
    }
    err.innerHTML = msg;
    err.style.display = 'block';
  }

  function showSuccess(form) {
    var done = document.createElement('div');
    done.setAttribute('role', 'status');
    done.style.cssText = 'text-align:center;padding:36px 22px;';
    done.innerHTML =
      '<div style="font-size:44px;line-height:1;margin-bottom:14px;color:#b8861e;">&#10003;</div>' +
      '<h3 style="font-family:\'Playfair Display\',Georgia,serif;font-size:24px;color:#111d2e;margin:0 0 8px;letter-spacing:-0.02em;">Thanks &mdash; we got it.</h3>' +
      '<p style="color:rgba(17,29,46,0.6);font-size:15px;margin:0;line-height:1.6;">We\'ll call you back within 24 hours. Need us sooner? Call ' +
      '<a href="tel:' + TEL + '" style="color:#b8861e;font-weight:600;text-decoration:none;">(617) 678-6446</a>.</p>';
    form.parentNode.replaceChild(done, form);
  }

  function wire(form) {
    if (form.dataset.bvWired) { return; }
    form.dataset.bvWired = '1';

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var payload = buildPayload(form);

      // Require name (first+last, or full) AND phone.
      var hasName = (payload.first_name && payload.last_name) || payload.full_name;
      if (!hasName || !payload.phone) {
        setError(form, 'Please enter your name and phone number so we can call you back.');
        return;
      }
      setError(form, '');

      var btn = form.querySelector('button[type="submit"]') || form.querySelector('button');
      var label = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = 'Sending…'; }

      // no-cors + urlencoded = a "simple" request: no CORS preflight, so the
      // POST reaches GHL's webhook (which sends no CORS headers). MUST be
      // x-www-form-urlencoded — GHL rejects text/plain bodies (verified
      // 2026-06-10), and no-cors forbids application/json. Response is
      // opaque, so we treat a resolved fetch as success.
      fetch(WEBHOOK, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(payload).toString()
      })
      .then(function () {
        showSuccess(form);
      })
      .catch(function (err) {
        console.error('Biviano form error:', err);
        if (btn) { btn.disabled = false; btn.innerHTML = label; }
        setError(form, 'Something went wrong &mdash; please call us at ' +
          '<a href="tel:' + TEL + '" style="color:#9a2424;font-weight:700;text-decoration:underline;">' + PHONE + '</a>.');
      });
    });
  }

  function init() {
    var forms = document.querySelectorAll('.js-lead-form');
    for (var i = 0; i < forms.length; i++) { wire(forms[i]); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
