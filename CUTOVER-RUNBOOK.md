---
title: bivianocontracting.com — Framer → GitHub Pages Cutover Runbook
client: Biviano General Contracting (Mike Biviano, Marshfield MA)
domain: bivianocontracting.com
registrar_dns: GoDaddy (ns73/ns74.domaincontrol.com)
target: GitHub Pages — morejobcalls/biviano-website (main / root)
canonical: www.bivianocontracting.com
status: ARMED — §0 blockers CLEAR, Pages domain claimed, www TTL lowered. Only the DNS flip remains.
verified: 2026-08-07
ttl_lowered: 2026-08-27 07:05 ET (www CNAME 3600 → 600, value untouched)
flip_scheduled: Tuesday 2026-09-01, 6:00 AM ET
---

# Cutover Runbook — bivianocontracting.com

Framer → GitHub Pages. Written to be executed top to bottom with zero guesswork.

**Golden rules for this cutover**
1. Never touch `go.bivianocontracting.com`. That CNAME is the GoHighLevel funnel and it is where **paid traffic lands**. Deleting or editing it takes down lead flow.
2. Never touch the apex `TXT` record. It is the Google Search Console verification token. Deleting it de-verifies Search Console.
3. Do not delete or unpublish the Framer site for at least 7 days. It is the rollback.

---

## 0. BLOCKERS — ✅ ALL CLEAR (re-verified 2026-08-27)

B1–B4 were cleared on 2026-08-07. `ui-updates-2026-06-03` is merged; `main` == `origin/main`
at `36a1bff`, no unmerged branches remain.

Re-verified 2026-08-27 against `origin/main` (NOT the preview URL — see the note below):

| Check | Result |
|---|---|
| 14 legacy redirect stubs (`service/*`, `blog/*`, `community-involvement`) | present on `main` |
| 6 mp4 + 6 poster jpg in `assets/videos/` | present on `main` |
| Homepage "Watch Our Work" band | present in `index.html` on `main` |
| `assets/analytics.js` GA4 id | `G-6R2ZNV4MNK` ✅ (BMB's `G-GW5Z0VVDEC` appears only in a warning comment) |
| `CNAME` file at repo root | `www.bivianocontracting.com` ✅ |
| GitHub Pages API | `status: built`, `cname: www.bivianocontracting.com`, `build_type: legacy`, `https_enforced: false` (expected until cert) |

⚠️ **The github.io preview URL is no longer usable for verification.** Because the custom
domain is already claimed, `https://morejobcalls.github.io/biviano-website/*` now **301-redirects
to `www.bivianocontracting.com`** — which today still resolves to Framer. The §0 curl commands
from the original runbook therefore return `301`, not `200`, and that is CORRECT, not a failure.
Verify content against `origin/main` with `git show origin/main:<path>` / `git ls-tree` instead.

**Step 1 of §4 (set the Pages custom domain) is ALREADY DONE** — it was completed 2026-08-07 and
the auto-committed `CNAME` file was pulled to local `main`. Do not redo it. Skip to §4 Step 2.

---

## 1. DNS changes — GoDaddy

GoDaddy → **My Products → bivianocontracting.com → DNS → Manage Zones**.

### 1a. The canonical-host decision

**Keep `www` canonical.** Reasons, all of them verified against the live site:
- Framer 308-redirects apex → `www` today, so every indexed URL, backlink, and GBP link already resolves to `www`.
- The live Framer sitemap lists all 33 URLs as `https://www.bivianocontracting.com/...`.
- The rebuild's own `sitemap.xml`, `robots.txt`, `og:url` tags, and redirect stubs are all already written against `https://www.bivianocontracting.com`.

Flipping to apex-canonical would invalidate all of that for zero benefit. **Set the GitHub Pages custom domain to `www.bivianocontracting.com`.** GitHub then automatically 301-redirects the apex → `www`, reproducing today's behavior.

### 1b. Before / after table

Verified against GitHub's official docs (*Managing a custom domain for your GitHub Pages site*) on 2026-08-07.

| Type | Name / Host | BEFORE (current, live) | AFTER (set this) | TTL | Action |
|------|-------------|------------------------|------------------|-----|--------|
| A | `@` | `31.43.160.6` | `185.199.108.153` | 600 | **EDIT** |
| A | `@` | `31.43.161.6` | `185.199.109.153` | 600 | **EDIT** |
| A | `@` | — | `185.199.110.153` | 600 | **ADD** |
| A | `@` | — | `185.199.111.153` | 600 | **ADD** |
| CNAME | `www` | `sites.framer.app` | `morejobcalls.github.io` | 600 | **EDIT** |
| CNAME | `go` | `sites.ludicrous.cloud` | `sites.ludicrous.cloud` | 3600 | ⛔ **DO NOT TOUCH** |
| TXT | `@` | `google-site-verification=S3zXBv72khXUD1LM8ZnpglQ_hTXgqRn1_L3IK-egn1A` | unchanged | 3600 | ⛔ **DO NOT TOUCH** |
| NS | `@` | `ns73` / `ns74.domaincontrol.com` | unchanged | 3600 | leave |
| MX | — | none exist | none | — | nothing to do — **no email risk on this domain** |
| CAA | `@` | none exist | none | — | leave. No CAA means nothing can block Let's Encrypt from issuing the cert. |

**Optional but recommended — IPv6.** GitHub also publishes AAAA records. Adding them is safe and improves reach on mobile carriers. If you add them, add all four:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| AAAA | `@` | `2606:50c0:8000::153` | 600 |
| AAAA | `@` | `2606:50c0:8001::153` | 600 |
| AAAA | `@` | `2606:50c0:8002::153` | 600 |
| AAAA | `@` | `2606:50c0:8003::153` | 600 |

### 1c. Two things people get wrong here — read before you type

**The `www` CNAME target is `morejobcalls.github.io` — with NO repository path.** Not `morejobcalls.github.io/biviano-website`. GitHub's docs state it explicitly: *"The CNAME record should always point to `<user>.github.io` or `<organization>.github.io`, excluding the repository name."* GitHub routes the request to the right repo by matching the `Host` header against the `CNAME` file in the repo — not by URL path. (DNS CNAME values cannot contain paths anyway; GoDaddy will reject one.)

**`https://morejobcalls.github.io/` returns 404 in a browser. That is expected and is not a problem.** The `morejobcalls` org has no org-level Pages site, so the bare host has nothing to serve. It still works perfectly as a CNAME target. Do not "fix" this.

---

## 2. TTL pre-lowering — do this 24h before cutover

Current authoritative TTLs (verified 2026-08-07 against `ns73.domaincontrol.com`):

| Record | Current TTL | Verdict |
|--------|-------------|---------|
| apex `A` | **600s (10 min)** | Already low. No action needed. |
| `www` CNAME | **3600s (1 hour)** | **Lower this to 600s at least 24h before cutover.** |
| `go` CNAME | 3600s | Leave alone — not being changed. |
| apex `TXT` | 3600s | Leave alone — not being changed. |

`www` is the canonical host, so a stale 1-hour TTL is exactly the record you do not want caching the old Framer target during rollback. Dropping it to 600s means a bad cutover is recoverable in ~10 minutes instead of ~60.

**T-24h action:** ✅ **DONE 2026-08-27 ~07:05 ET.** In GoDaddy the `www` CNAME TTL was changed
`1 Hora (3600)` → `Personalizado / 600`. Type, Nombre and Valor were left untouched
(`CNAME` / `www` / `sites.framer.app.`). GoDaddy confirmed "Éxito".

Verified authoritative immediately after:

```
www.bivianocontracting.com. 600  IN CNAME sites.framer.app.     ← TTL now 600 ✅
go.bivianocontracting.com.  3600 IN CNAME sites.ludicrous.cloud. ← untouched ✅
bivianocontracting.com.     A    31.43.160.6 / 31.43.161.6       ← untouched ✅
TXT google-site-verification=S3zXBv72kh...egn1A                  ← untouched ✅
https://www.bivianocontracting.com  → 200 (Framer, still live)   ✅
https://go.bivianocontracting.com/  → 200 (funnel, still live)   ✅
```

Re-confirm on flip morning before touching anything:

```bash
dig @ns73.domaincontrol.com www.bivianocontracting.com +noall +answer
# want: www.bivianocontracting.com. 600 IN CNAME sites.framer.app.
```

---

## 3. Recommended cutover window

**SCHEDULED: Tuesday 2026-09-01, 6:00 AM ET.** (Runbook window: Tuesday or Wednesday, 6:00–7:00 AM ET.)

Why this window:
- **Traffic trough.** A South Shore home-improvement site gets its traffic weekday daytime and weekday evening. 6 AM local is the quietest hour that is still a workday.
- **GitHub's TLS certificate is provisioned only *after* DNS resolves to GitHub**, and it takes anywhere from ~15 minutes to 24 hours. During that window the site is **soft**: `http://` works, but `https://` throws a certificate-name-mismatch warning until the cert lands. You want that window to be overnight-adjacent and low-traffic, not at 2 PM.
- **You get a full business day to monitor.** Cert almost always lands inside 30 minutes; if it hasn't landed by 9 AM you still have the whole day to work the problem or roll back.
- **Avoid Thursday and Friday.** Never start a migration you might have to babysit into a weekend.
- **Avoid Monday morning** — it is the busiest inbound-call window of the week for a contractor.

Do not start if: Mike is mid-campaign on something driving traffic to the site, or you can't be at a laptop for the following 3 hours.

---

## 4. Order of operations

Each step is ordered because of a real dependency. Do not reorder.

### T-24h — Lower the `www` TTL — ✅ DONE 2026-08-27
Per §2. **Why first:** TTL reductions themselves need to propagate. Lowering the TTL at cutover time does nothing — resolvers already cached the old record with the old 1-hour TTL. This must be done a full TTL cycle ahead to have any effect on rollback speed.

### T-1h — Clear the §0 blockers and freeze the repo — ✅ BLOCKERS ALREADY CLEAR
The merge is long since done (`main` == `origin/main` @ `36a1bff`). On flip morning just confirm
`git fetch && git status -sb` shows `main...origin/main` with no divergence, and that `CNAME`
still contains `www.bivianocontracting.com`. **Why before DNS:** if you point DNS at a `main` that is missing the redirect stubs, Google starts crawling 404s immediately. Content correctness must precede traffic.

Then tell the other agents/editors: **repo freeze**. No pushes to `main` from now until §6 completes.

### Step 1 — Set the GitHub Pages custom domain — ✅ DONE 2026-08-07 (SKIP)
GitHub → `morejobcalls/biviano-website` → **Settings → Pages → Custom domain** → enter `www.bivianocontracting.com` → **Save**.

**Why before DNS:** setting this writes a `CNAME` file into the repo root on `main` (there is no `CNAME` file today — verified). That file is what tells GitHub's edge which repo answers for `www.bivianocontracting.com`. If DNS arrives before the repo claims the hostname, visitors get GitHub's 404 page.

GitHub will show "DNS check unsuccessful" at this point. **That is expected** — DNS hasn't been changed yet. Ignore it.

⚠️ **After this step, immediately `git pull` locally.** GitHub just committed `CNAME` to `main`. If anyone later pushes a `main` that lacks that file, GitHub **unsets the custom domain and the site goes down**. This is the single most common way people break a Pages migration a week after cutover.

```bash
cd "/Volumes/T7/SPG/3. FULFILLMENT/Clients/BIVIANO/07 - Websites/biviano"
git checkout main && git pull
cat CNAME   # must print: www.bivianocontracting.com
```

### Step 2 — Change DNS at GoDaddy
Apply the §1b table: edit the two apex A records, add the other two, edit the `www` CNAME. Touch nothing else.

**Why now:** the repo already claims the hostname, so the moment DNS resolves, real content is served.

### Step 3 — Wait for DNS, then confirm GitHub sees it
```bash
watch -n 30 'dig +short bivianocontracting.com A; echo ---; dig +short www.bivianocontracting.com'
```
Wait until apex returns the four `185.199.*` addresses and `www` returns `morejobcalls.github.io`. With a 600s TTL this is typically 5–15 minutes.

Then back in **Settings → Pages**, confirm the DNS check has turned green.

### Step 4 — Wait for the TLS certificate
GitHub requests a Let's Encrypt cert only once the DNS check passes. **Why it must come last:** the certificate authority validates by resolving the hostname — the cert literally cannot be issued before DNS points at GitHub. This is why the whole sequence is DNS-gated.

Watch for the "Certificate is being provisioned" banner to become a green padlock. Typical: 15 minutes. Documented worst case: 24 hours.

```bash
until curl -sI https://www.bivianocontracting.com | head -1 | grep -q 200; do date; sleep 60; done; echo CERT LIVE
```

### Step 5 — Turn on Enforce HTTPS
**Settings → Pages → ✅ Enforce HTTPS.**

**Why last:** the checkbox is disabled by GitHub until a valid certificate exists. Ticking it earlier is impossible; ticking it after cert issuance upgrades every `http://` visitor to `https://`. (The repo already has `https_enforced: true` set from the preview era, but re-confirm it after the domain change — the setting is re-evaluated per-domain.)

### Step 6 — Run the full verification suite (§5). Then unfreeze the repo.

---

## 5. Post-cutover verification — copy-paste block

Run the whole block. Every line is annotated with what a pass looks like.

```bash
# ── 1. Apex → www redirect (GitHub should 301 apex to the canonical host)
curl -sI http://bivianocontracting.com  | head -1
curl -sI https://bivianocontracting.com | grep -iE '^(HTTP|location)'
#   PASS: 301 with  location: https://www.bivianocontracting.com/

# ── 2. HTTPS is live and the certificate is valid + covers the name
curl -sI https://www.bivianocontracting.com | head -1
#   PASS: HTTP/2 200
echo | openssl s_client -servername www.bivianocontracting.com \
  -connect www.bivianocontracting.com:443 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates
#   PASS: subject includes www.bivianocontracting.com, issuer = Let's Encrypt,
#         notAfter is ~90 days out. No "self signed" / "mismatch" errors.

# ── 3. HSTS / Enforce HTTPS is active
curl -sI https://www.bivianocontracting.com | grep -i strict-transport-security
#   PASS: strict-transport-security: max-age=31556952

# ── 4. Every page returns 200
for p in "" index.html about.html service.html service-decks.html service-adu.html \
         service-renovations.html service-kitchen.html service-elevation.html \
         service-small.html community.html testimonial.html contact.html blog.html \
         blog-post-1.html blog-post-2.html blog-post-3.html blog-post-4.html \
         roadmap.html finance.html; do
  printf "%s  /%s\n" "$(curl -s -o /dev/null -w '%{http_code}' https://www.bivianocontracting.com/$p)" "$p"
done
#   PASS: 200 on all 20.

# ── 5. 404 page actually serves the custom 404
curl -s -o /dev/null -w '%{http_code}\n' https://www.bivianocontracting.com/this-page-does-not-exist
curl -s https://www.bivianocontracting.com/this-page-does-not-exist | grep -o '<title>[^<]*</title>'
#   PASS: 404, and title = "Page Not Found | Biviano General Contracting"

# ── 6. Legacy Framer URLs — the redirect stubs must resolve (SEO-critical)
for p in service/ service/decks/ service/adu/ service/custom-modular-home/ \
         service/renovations-additons/ service/kitchen-baths/ \
         service/house-elevation/ service/small-projects/ \
         community-involvement/ blog/ \
         blog/high-quality-royal-kitchen-interior-with-us/ \
         blog/high-quality-royal-kitchen-interior-with-us-2/ \
         blog/high-quality-royal-kitchen-interior-with-us-3/ \
         blog/high-quality-royal-kitchen-interior-with-us-4/; do
  printf "%s  /%s\n" "$(curl -s -o /dev/null -w '%{http_code}' https://www.bivianocontracting.com/$p)" "$p"
done
#   PASS: 200 on all 14 (they are meta-refresh stubs, so 200 — not 301 — is correct).
curl -s https://www.bivianocontracting.com/service/decks/ | grep -i 'http-equiv="refresh"'
#   PASS: refresh points at https://www.bivianocontracting.com/service-decks.html

# ── 7. ⛔ The GoHighLevel funnel subdomain must be UNCHANGED — this is the paid-traffic path
dig +short go.bivianocontracting.com
curl -s -o /dev/null -w '%{http_code}\n' https://go.bivianocontracting.com/
#   PASS: resolves via sites.ludicrous.cloud, and returns 200/301/302 — NOT NXDOMAIN, NOT 404.

# ── 8. ⛔ Search Console TXT record must still be present
dig +short TXT bivianocontracting.com
#   PASS: "google-site-verification=S3zXBv72khXUD1LM8ZnpglQ_hTXgqRn1_L3IK-egn1A"

# ── 9. Sitemap + robots reachable at the real domain
curl -s -o /dev/null -w 'sitemap %{http_code}  %{content_type}\n' https://www.bivianocontracting.com/sitemap.xml
curl -s -o /dev/null -w 'robots  %{http_code}  %{content_type}\n' https://www.bivianocontracting.com/robots.txt
curl -s https://www.bivianocontracting.com/robots.txt
#   PASS: both 200. robots.txt names https://www.bivianocontracting.com/sitemap.xml

# ── 10. Media actually serves (the 58 MB video band)
for v in set-4-hours modular-deck-kent-st modular-update-scituate adu-duxbury \
         modular-builders-intro modular-set-cribbing; do
  printf "%s  %s.mp4\n" "$(curl -s -o /dev/null -w '%{http_code}' https://www.bivianocontracting.com/assets/videos/$v.mp4)" "$v"
done
curl -s -o /dev/null -w 'og-image %{http_code}\n' https://www.bivianocontracting.com/assets/brand/og-image.png
#   PASS: 200 on all seven.

# ── 11. Forms still post to GoHighLevel (do this manually, once)
#   Submit the contact form with a junk name + your own phone.
#   Confirm the contact lands in the Biviano GHL sub-account within ~60s.
#   The form posts urlencoded (fixed in commit 41f2b5b) — a silent failure here
#   looks like a successful submit with no contact created, so VERIFY IN GHL, not in the browser.
```

---

## 6. Rollback plan

**Trigger rollback if:** the cert has not provisioned after 4 hours, pages are 404ing at the real domain, or forms stop reaching GHL and can't be fixed in 15 minutes.

**Rollback is DNS-only.** Restore these exact values in GoDaddy:

| Type | Name | Restore to | TTL |
|------|------|-----------|-----|
| A | `@` | `31.43.160.6` | 600 |
| A | `@` | `31.43.161.6` | 600 |
| A | `@` | *delete the two extra GitHub A records* (`185.199.110.153`, `185.199.111.153`) | — |
| AAAA | `@` | *delete all four, if you added them* | — |
| CNAME | `www` | `sites.framer.app` | 600 |

Then in GitHub → Settings → Pages, **clear the custom domain** (so GitHub releases the hostname and stops answering for it).

With the `www` TTL pre-lowered to 600s, full recovery is ~10 minutes.

### The rollback only works if Framer is still up

**Leave the Framer site PUBLISHED for at least 7 full days after cutover.** Do not delete the project. Do not unpublish it. Do not cancel the Framer subscription. Do not remove the custom domain inside Framer.

If Framer is unpublished, those A records point at Framer's edge and it serves *nothing* — you would have no rollback at all, and the site would be hard-down instead of soft-down. Set a calendar reminder for **T+7 days** to review before touching anything in Framer, and only then consider unpublishing.

---

## 7. Search Console / Google Business Profile follow-ups

Do these the same day, after §5 passes.

**Google Search Console** (property is verified by the apex TXT record, which we did not touch — verification survives the migration):

1. **Submit the new sitemap.** Sitemaps → remove the old entry if present → add `sitemap.xml` → Submit.
   ⚠️ Note the URL structure changed: Framer served extensionless pretty URLs (`/service/decks`); the rebuild serves `.html` (`/service-decks.html`). This is a **URL-structure migration**, not a like-for-like move. Expect churn.
2. **Watch Pages → "Not found (404)" for a crawl-error spike** over the next 14 days. A modest bump as Google re-crawls the old URL set is normal. What is *not* normal: any of the 14 stub URLs in §5 check 6 showing up as 404 — that means the stubs didn't ship, go back to §0.
3. **Watch Performance → Pages** for the old `/service/*` URLs bleeding impressions with nothing picking them up. The stubs are meta-refresh redirects, not server-side 301s — Google honors them but treats them as a weaker signal than a true 301. If rankings on the service pages slide past week 2, that's the cause, and the fix is a real redirect layer (Cloudflare in front of Pages), not more stubs.
4. **Request indexing** manually for the top 5 pages: `/`, `/service.html`, `/service-decks.html`, `/contact.html`, `/about.html`.
5. **Re-check the 4 `/projectdeleted/*` project pages** — they are live on Framer and in the live sitemap, but have no counterpart in the rebuild. Decide whether to rebuild them or let them 404. If letting them go, that's fine, but expect them in the 404 report.

**Google Business Profile:**

6. Open the GBP listing and click the **Website** link. Confirm it resolves to the live rebuilt site and does not warn on the certificate. If the GBP link is pointing at a deep Framer URL (e.g. `/contact`) rather than the homepage, update it to `https://www.bivianocontracting.com/` — a GBP link that 404s suppresses the listing.
7. Confirm NAP on the site still matches GBP exactly: **Biviano General Contracting · 2183 Ocean Street, Marshfield, MA 02050 · 617-678-6446**.

**Other:**

8. Check Bing Webmaster Tools if the property exists — same sitemap resubmit.
9. Update the website URL in any Meta ad account, GHL custom values, or email signatures that hardcode a Framer URL.

---

## 8. GitHub Pages size & bandwidth — assessment

**Verified numbers (2026-08-07):**

| Metric | Measured | GitHub limit | Headroom |
|--------|----------|--------------|----------|
| Published site size (branch, post-merge) | **80.1 MB** | 1 GB (hard) | 92% free |
| — of which `assets/videos/` | **58.4 MB** (6 mp4 + 6 poster jpg) | — | — |
| — of which `assets/images/` | ~53 MB on disk / ~19 MB tracked | — | — |
| Published site size (`main` today, pre-merge) | 19.5 MB | 1 GB | — |
| Repo disk usage as GitHub reports it | 79 MB | 1 GB recommended | fine |
| Bandwidth | see below | 100 GB/mo (soft) | — |

**Verdict: not a risk at this traffic level. Ship it.**

Reasoning:
- **Size:** 80 MB against a 1 GB limit. Nowhere near it.
- **Bandwidth:** the videos are the only real consumer, and they are configured defensively — every `<video>` tag is `preload="none"` with a `poster` image. That means a page view downloads a ~150–220 KB poster JPEG, **not** the multi-megabyte mp4. The video only transfers when a visitor presses play. Verified across all 5 video elements; none autoplay.
- **Worst-case math:** the largest video is 21.6 MB (`modular-deck-kent-st.mp4`). For a local GC site running maybe 500–2,000 sessions/month, even if *every single visitor* played the largest video: 2,000 × 21.6 MB ≈ 43 GB — still inside the 100 GB soft limit, and that scenario is wildly pessimistic.
- **Realistic estimate:** ~3 MB average page weight × 2,000 sessions ≈ 6 GB/mo, plus maybe 10–15% of visitors playing one video ≈ 3–6 GB. Call it **under 15 GB/month**. That is 15% of the soft cap.

**Tripwires — revisit if any of these happen:**
- Meta or Google Ads starts driving 10,000+ monthly sessions to the site (currently paid traffic goes to `go.bivianocontracting.com`, not here — so this is not a near-term risk).
- Anyone hotlinks or embeds the mp4s from another site.
- GitHub emails about exceeding the soft bandwidth limit — they warn before throttling.

**If a tripwire fires**, the fix is to move the six mp4s off Pages — YouTube/Vimeo embeds, Cloudflare R2, or Cloudflare in front of Pages for caching. Do not solve it by deleting the videos.

---

## 9. Quick reference card

```
Registrar / DNS ........ GoDaddy (ns73 / ns74.domaincontrol.com)
Canonical host ......... www.bivianocontracting.com
Pages custom domain .... www.bivianocontracting.com
Repo ................... morejobcalls/biviano-website  (main / root)
Preview ................ https://morejobcalls.github.io/biviano-website/

Apex A records ......... 185.199.108.153
                         185.199.109.153
                         185.199.110.153
                         185.199.111.153
www CNAME .............. morejobcalls.github.io      (NO /repo path)

DO NOT TOUCH ........... go.bivianocontracting.com CNAME → sites.ludicrous.cloud   (paid traffic)
DO NOT TOUCH ........... apex TXT google-site-verification=S3zXBv72kh...egn1A      (Search Console)
NO MX RECORDS .......... no email risk on this domain
NO CAA RECORDS ......... nothing blocks cert issuance

Rollback ............... apex A → 31.43.160.6 / 31.43.161.6
                         www CNAME → sites.framer.app
                         clear Pages custom domain
                         KEEP FRAMER PUBLISHED 7+ DAYS
```
