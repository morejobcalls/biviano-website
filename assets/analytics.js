/* ═══════════════════════════════════════════════════════════════════════════
   Biviano General Contracting — analytics + ad attribution   (2026-08-07)

   WHY THIS EXISTS
   The live Framer site at bivianocontracting.com has NO GA4, NO GTM and NO
   pixel — only Framer's built-in `events.framer.com` beacon, which dies the
   moment the domain cuts over to this static rebuild. Without this file Mike
   goes blind on day one: no sessions, no traffic sources, no lead events, and
   no way to tell which Google/Meta click produced which GHL contact.

   This is the BGC sibling of `../Modular/js/bmb-attribution.js` (the proven,
   end-to-end-verified module on bivianomodularbuilders.com). Same capture
   logic, same 90-day localStorage window, same defensive posture — retargeted
   at BGC's webhook and BGC's GHL fields.

   WHAT IT DOES
     1. Loads gtag (GA4 + the Biviano GC Google Ads tag).
     2. Fires `generate_lead` on the SUCCESS path of a lead form — never on
        submit, so a failed POST never counts as a lead.
     3. Fires `click_to_call` on every `tel:` link (~136 across the site).
     4. Captures gclid / gbraid / wbraid / fbclid / utm_* into localStorage for
        90 days and hands them to `assets/forms.js` for the GHL payload.

   CONTRACT WITH assets/forms.js
     forms.js calls  window.bgcAttr()                 -> flat payload keys
     forms.js emits  document 'bgc:lead-success'      -> {detail: payload}
     Both sides are optional-guarded: if either file is missing or blocked the
     other still works, and neither can block a form submission.

   DEBUG
     bgcAttrDebug()  in the console shows what was captured and what is stored.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';

  /* ═════════════════════════════════════════════════════════════════════════
     CONFIG — the only block you should ever need to edit
     ═════════════════════════════════════════════════════════════════════════ */

  /* GA4: property "Biviano Contracting" (a373538036p511231986), web stream
     "BIVC-Website" (stream id 12507899892, url https://bivianocontracting.com).
     Verified in the GA4 admin UI 2026-08-07 — enhanced measurement is ON.
     NOTE: G-GW5Z0VVDEC (Biviano Modular Builders) is deliberately NOT used
     here — it is the property linked to Google Ads for the BMB PPC campaigns,
     and mixing a second domain in would pollute what they optimise against. */
  var GA4_PLACEHOLDER = 'G-XXXXXXXXXX';
  var GA4_ID          = 'G-6R2ZNV4MNK';

  /* Google Ads tag for account "Biviano GC" 303-997-7029 — the PARENT company's
     Ads account, i.e. this site's own account. Loading it here enables gclid
     auto-tagging + remarketing for bivianocontracting.com.
     NO conversion label is fired: the only labels on this account today are
     Modular-specific ("Modular — LP Lead" etc.), and firing one from the GC
     site would corrupt BMB campaign optimisation. When a BGC-specific
     conversion action exists, paste its label below and leads will start
     reporting to Ads automatically. Set AW_ID to '' to disable the tag. */
  var AW_ID        = 'AW-16742219835';
  var AW_LEAD_LABEL = '';                 // e.g. 'AW-16742219835/abcDEF123ghi'

  var STORE_KEY = 'bgc_attr';
  var TTL_DAYS  = 90;

  var CLICK_IDS = ['gclid', 'gbraid', 'wbraid', 'fbclid'];
  var UTMS      = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var ALL       = CLICK_IDS.concat(UTMS);

  var ga4Live = !!GA4_ID && GA4_ID !== GA4_PLACEHOLDER;

  /* ═════════════════════════════════════════════════════════════════════════
     gtag bootstrap — defensive
     `gtag` is defined unconditionally so every call site downstream is safe
     even when an ad blocker kills googletagmanager.com. In that case events
     just accumulate in the in-memory dataLayer and go nowhere. Nothing throws.
     ═════════════════════════════════════════════════════════════════════════ */
  w.dataLayer = w.dataLayer || [];
  function gtag() { w.dataLayer.push(arguments); }
  if (typeof w.gtag !== 'function') { w.gtag = gtag; }

  (function loadTag() {
    var ids = [];
    if (ga4Live) { ids.push(GA4_ID); }
    if (AW_ID)   { ids.push(AW_ID); }
    if (!ids.length) { return; }

    try {
      var s = d.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ids[0]);
      var first = d.getElementsByTagName('script')[0];
      if (first && first.parentNode) { first.parentNode.insertBefore(s, first); }
      else { (d.head || d.documentElement).appendChild(s); }
    } catch (e) { /* blocked or no DOM — the configs below are still harmless */ }

    try {
      w.gtag('js', new Date());
      for (var i = 0; i < ids.length; i++) { w.gtag('config', ids[i]); }
    } catch (e) {}
  })();

  /* ═════════════════════════════════════════════════════════════════════════
     ATTRIBUTION CAPTURE
     Ported from ../Modular/js/bmb-attribution.js (verified end-to-end
     2026-07-31), plus fbclid — Mike runs Meta as well as Google, and
     contact.fbclid already exists in the GHL location.

     A fresh click ID in the URL always wins; otherwise fall back to whatever
     was stored. The click ID only ever appears in the FIRST url of a session —
     a visitor clicks an ad, browses three pages, then converts on a fourth.
     ═════════════════════════════════════════════════════════════════════════ */
  function readStore() {
    try {
      var raw = w.localStorage.getItem(STORE_KEY);
      if (!raw) { return null; }
      var o = JSON.parse(raw);
      if (!o || !o.t) { return null; }
      if (Date.now() - o.t > TTL_DAYS * 864e5) { w.localStorage.removeItem(STORE_KEY); return null; }
      return o.v || null;
    } catch (e) { return null; }
  }

  function writeStore(v) {
    try { w.localStorage.setItem(STORE_KEY, JSON.stringify({ t: Date.now(), v: v })); } catch (e) {}
  }

  var captured = (function () {
    var qs = {}, stored = readStore() || {}, out = {}, sawClickId = false;

    try {
      new w.URLSearchParams(w.location.search).forEach(function (v, k) { qs[k.toLowerCase()] = v; });
    } catch (e) {}

    CLICK_IDS.forEach(function (k) { if (qs[k]) { sawClickId = true; } });

    ALL.forEach(function (k) {
      /* On a fresh ad click take the whole URL set — don't blend a new click
         with a stale session's utms. */
      out[k] = sawClickId ? (qs[k] || '') : (qs[k] || stored[k] || '');
    });

    /* First-touch context, preserved across the visit. */
    var extRef = '';
    try {
      if (d.referrer && d.referrer.indexOf(w.location.host) === -1) { extRef = d.referrer; }
    } catch (e) {}
    out.referrer     = sawClickId ? extRef : (stored.referrer || extRef || '');
    out.landing_page = sawClickId ? w.location.href : (stored.landing_page || w.location.href);

    var hasSignal = ALL.some(function (k) { return out[k]; });
    if (hasSignal && (sawClickId || Object.keys(stored).length === 0)) { writeStore(out); }

    return out;
  })();

  /* Flat top-level keys for the GHL payload. FLAT IS MANDATORY — the webhook
     POST is x-www-form-urlencoded (GHL rejects text/plain and application/json
     from the browser) and urlencoded cannot express nesting. Never return an
     object with nested values from here.
     Empty strings are dropped so we don't blank out a field that a previous
     touch already populated on the contact. */
  w.bgcAttr = function () {
    var o = {};
    ALL.forEach(function (k) { if (captured[k]) { o[k] = captured[k]; } });
    if (captured.referrer)     { o.referrer     = captured.referrer; }
    if (captured.landing_page) { o.landing_page = captured.landing_page; }
    return o;
  };

  w.bgcAttrDebug = function () { return { captured: captured, stored: readStore() }; };

  /* ═════════════════════════════════════════════════════════════════════════
     EVENTS
     ═════════════════════════════════════════════════════════════════════════ */
  function track(name, params) {
    try {
      if (typeof w.gtag !== 'function') { return; }
      w.gtag('event', name, params || {});
    } catch (e) {}
  }

  /* ── generate_lead ───────────────────────────────────────────────────────
     Bound to the SUCCESS path, not the submit event: assets/forms.js dispatches
     `bgc:lead-success` only after the webhook fetch resolves, so a failed POST
     (or a validation bounce) never inflates the lead count. Deduped per page
     view. Everything here is inside try/catch — an analytics failure must never
     surface to the visitor, who has already been shown the thank-you state. */
  d.addEventListener('bgc:lead-success', function (ev) {
    if (w.__bgcLeadFired) { return; }
    w.__bgcLeadFired = true;

    var det = (ev && ev.detail) || {};

    /* Enhanced conversions — lifts match rate when cookies are missing. */
    try {
      if (det.email || det.phone) {
        w.gtag('set', 'user_data', {
          email: det.email || undefined,
          phone_number: det.phone || undefined
        });
      }
    } catch (e) {}

    /* No `value` is sent: BGC has no agreed per-lead value, and inventing one
       would put fake revenue in Mike's reports. Add currency+value here the
       day a real number exists. */
    track('generate_lead', {
      form_location: det.page_url || d.location.href,
      project_type:  det.project_type || '',
      town:          det.town || '',
      lead_source:   det.lead_source || ''
    });

    if (AW_LEAD_LABEL) {
      var conv = { send_to: AW_LEAD_LABEL };
      if (captured.gclid) { conv.transaction_id = captured.gclid; }
      track('conversion', conv);
    }
  });

  /* ── click_to_call ───────────────────────────────────────────────────────
     Delegated + capture-phase so it survives any handler that stops
     propagation, and so it covers tel: links injected after load (sticky call
     bars, the form's own success state). Never calls preventDefault — the dial
     must always happen. */
  d.addEventListener('click', function (ev) {
    try {
      var el = ev.target;
      if (el && el.nodeType !== 1) { el = el.parentElement; }
      if (!el || typeof el.closest !== 'function') { return; }

      var a = el.closest('a[href^="tel:"]');
      if (!a) { return; }

      track('click_to_call', {
        phone_number: (a.getAttribute('href') || '').replace(/^tel:/i, ''),
        link_text:    (a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100),
        page_path:    d.location.pathname
      });
    } catch (e) {}
  }, true);

})(window, document);
