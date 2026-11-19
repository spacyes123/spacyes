# Phase 2A enquiry conversion and analytics

## Local changes

Base: main 3b971ca8c9d7d4e216ac17fc81f64898ca530a11. Branch: feature/phase2-enquiry-conversion. No deployment or settings changes.

- Existing pricing buttons preselect recognised plans in the existing forms. All nine library plans retain their prices, durations, order and access conditions.
- A tab-scoped sessionStorage record carries only allowlisted branch/plan values between internal pages. No customer input is stored. Branch pages override branch context with their actual branch; unavailable dropdown options are not invented. Blocked storage gracefully falls back to same-page behaviour. Closing the tab ends the normal session lifetime; do not use this for attribution or customer identification.
- Branch mobile View Plans targets that branch's pricing section. Existing contact numbers, email destination and booking anchors remain. Generic WhatsApp links add only recognised branch/plan context, without repeated appends on subsequent clicks.
- Phone validation accepts ten-digit Indian mobile numbers beginning 6–9, optionally prefixed by +91 or 91 and common spacing/hyphens/parentheses. It rejects alphabetic input and malformed lengths. Handoff phone text is normalised to ten digits; input values stay as typed.
- Existing form-note styling displays an accessible error with focus on the invalid field. Values are never cleared. Optional email is validated when supplied and included only in the intended WhatsApp/email enquiry body. No new server endpoint or chat provider is added.
- Existing GA4 loader/config G-N36ZSN4PE0 is reused on the seven missing indexable pages. Each of twenty pages has one loader and one config; existing page-view behaviour is retained. No explicit second page_view event is added.

## Event contract

| Event | Trigger | Meaning |
|---|---|---|
| trial_cta_click | Existing trial/₹49 CTA activation | Interest only |
| membership_enquiry_click | Existing pricing-card CTA | Membership interest only |
| plan_select | Plan pill/dropdown/card selection | Recognised selection, not purchase |
| branch_select | Branch pill/dropdown selection | Recognised selection |
| contact_click | Contact anchor or validated form contact action | Channel intent, not answered call/delivery |
| enquiry_handoff | Validated form prepares and opens WhatsApp/mail app | Handoff attempted, not delivery or completed booking |

The fixed send_to routing directive is G-N36ZSN4PE0. Business parameters are limited to branch, plan, contact_channel (whatsapp/email/telephone) and cta_location (pricing/form/navigation/footer/mobile_bar/help/content). Unknown values are discarded. One selection plus one enquiry event on a pricing click are intentionally distinct events, not duplicate firing. Repeated user clicks are separate actions. Restoration of stored context emits no selection events. Startup is idempotent, preventing duplicate bindings if DOMContentLoaded is dispatched again.

No names, mobile numbers, email addresses, free-text messages, customer IDs or prefilled contact URLs are passed to custom analytics. Do not convert handoffs into generate_lead, purchase or confirmed-booking events. Confirmation needs actual business records.

## Privacy review and owner-confirmed dashboard settings

Owner-confirmed settings: automatic outbound clicks OFF; automatic form interactions OFF; email redaction ON and owner-tested; Google Signals OFF; user-provided data collection OFF; page views ON. No dashboard setting was changed or independently authenticated by this implementation. These facts supersede the earlier request to inspect those settings; they are not proof of complete privacy compliance.

All six custom events use only allowlisted catalogue/context values. The dispatcher now explicitly sets send_to to G-N36ZSN4PE0. A real-tag local browser capture revealed that default routing also attempted forwarding to Ads destination AW-17380257938. The explicit destination limits custom events to the requested GA4 property; it does not alter the existing page-view configuration, remote tag destinations, Google Signals or consent. Initialisation-time Ads requests still require owner review. They are not evidence that customer data reached Ads: test collection requests were intercepted locally.

The repository contains no public analytics/privacy policy, CMP or Consent Mode implementation. Public /privacy and /privacy-policy returned404 during review. The Google tag loads/configures immediately and custom events do not wait for an application consent choice. No banner or consent change was implemented. Google Analytics published terms require an appropriate privacy policy and analytics/cookie disclosures. Approve actual disclosure content, retention/contact details, data recipients (Google, WhatsApp and email), and placement before publication; do not invent these facts in code.

For the intended Indian audience, the DPDP commencement notification and Rules use phased commencement. As of19November2026, the notice/consent provisions scheduled eighteen months after the November2025 publication are not yet fully in force. This is not an exemption from existing applicable law, Google terms or other jurisdictions' requirements. Owner/legal review must confirm the relevant entity, audience outsideIndia, treatment of minors, data handling and the required consent approach. A cookie banner is not declared universally mandatory solely because GA4 is used. If prior consent is required, approve and implement the appropriate mechanism before collection; Consent Mode alone does not obtain consent.

Local queued-event and real-tag network tests are distinct. The real-tag test allows the existing tag script to load but intercepts collection requests and supplies local responses, so no test hits or enquiries reach Google or Spacyes. It checks generated payloads and routing; it cannot verify account-side ingestion or authenticated DebugView. A final owner-side DebugView check remains required. Email redaction is defence in depth, not permission to collect customer details. Campaign/page URLs must never contain personal information.

References:
- https://developers.google.com/tag-platform/gtagjs/routing
- https://marketingplatform.google.com/about/analytics/terms/us/#7.-privacy
- https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf
- https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf

## Local verification commands

Use Node 22.12+ within major 22 and the existing locked dependencies:

```sh
npm ci --include=dev
npm test
npm run test:enquiry-browser
npm run dev
# In another terminal, after the local server starts:
npm run test:routing
git diff --check
```

The browser test uses built-in Node APIs and installed Chrome (set CHROME_PATH if required). It builds/serves only the 46-file allowlist on loopback, blocks every remote request and intercepts WhatsApp/mailto navigation. It fails rather than silently skips if Chrome is missing. Screenshots and results are written to the OS temporary directory, not published. No enquiry, analytics hit, call or payment is sent. Do not run these customer-data test doubles on production.

New Node regression tests run in both npm test and the existing Linux test script. They cover mobile formats, rejection, analytics allowlisting and all-page GA uniqueness. Browser checks cover all 36 library choices at two widths, branch/plan persistence across navigation, validation and retained input, email inclusion, safe event payloads, once-only handlers, correct branch pricing links and malicious stored context. Existing membership/build/security tests remain intact.

The new documentation and test files are excluded from the unchanged publication manifest; only the original 46 approved website assets are staged. No CSS, membership markup, JSON-LD, policy, pricing, trial copy, logo, image, sitemap, robots, Wrangler configuration or dependency versions are changed.

## References

- https://support.google.com/analytics/answer/9216061 — enhanced measurement, including outbound link and form events.
- https://developers.google.com/tag-platform/security/guides/consent — consent defaults and actual user updates.

Stop for owner review. Do not commit, push, deploy or change dashboard settings as part of local verification.

## Results from this local implementation

- Base commit remains 3b971ca8c9d7d4e216ac17fc81f64898ca530a11; all changes are uncommitted on feature/phase2-enquiry-conversion.
- Full Node 22 suite: 103 tests, 101 passed, zero failed, two Windows symlink-permission skips. The 17 conversion unit tests also passed independently after the final refinement. No fresh Linux execution is claimed.
- Final local browser suite: homepage plus three branches at 1440px and 390px, all nine library selections per page (72 selection cases), correct branch/plan state, validation and both full-form handoff channels; no overflow or JavaScript exceptions. Branch quick-form selections are synchronised by the same existing fields; full-form handoffs were the browser submission fixture. Cross-page library-to-home persistence, malformed storage rejection, once-only branch/trial/contact events and repeated DOMContentLoaded handling passed.
- Exactly 46 allowlisted public files built and verified. New scripts/documentation remain outside public/.
- 85 existing local routing/byte/MIME checks passed. git diff --check passed; existing LF/CRLF warnings only.
- Preservation comparison against HEAD: the seven HTML pages differ only by the reused GA block; all other public source changes are confined to main.js. CSS, membership cards, prices, durations, trial wording, policy text, JSON-LD and deployment configuration are untouched.
- Screenshots/results: C:/Users/Harsh/AppData/Local/Temp/spacyes-phase2a-browser-kcclhW.
- Remaining publication limitations: authenticated GA4 receipt, owner review of initialisation-time linked Ads traffic, approved privacy/consent disclosures, and Linux execution of the two Windows-skipped security tests. No received analytics events, consent compliance, confirmed delivery or conversion uplift is claimed.

## Final release-verification addendum

The previously confirmed clear-plan bug is fixed by two narrow selection guards: an explicit empty plan is accepted and synchronisation no longer skips an empty plan. Quick and detailed forms, hidden plan field, active pills and sessionStorage now clear together. Refresh cannot restore the cleared value. New selections, branch changes and ordinary navigation retain their intentional state. One plan_select event is generated by explicit clearing; restoring/synchronising state generates none.

Final automated result:103 tests,101 passed,zero failed,two Windows symlink-permission skips. Existing Linux-compatible test scripts include the new regressions, but no fresh native Linux run is claimed. Required CI after publication approval: npm ci --include=dev; npm run test:linux (require43/43 staging security tests,zero skips); publication integrity; local routing. Browser checks need installed Chrome and npm run test:enquiry-browser.

Final functional browser evidence: homepage and three branch pages at1440px/390px,72 library-plan selection cases, full-form WhatsApp/email handoffs, all three branch quick forms, invalid and valid Indian phones, optional email, explicit clearing/refresh/reselection, branch changes and navigation persistence passed. Duplicate-event and idempotent-handler assertions passed. Synthetic values were used; no enquiries were sent.

Real-tag network evidence: C:/Users/Harsh/AppData/Local/Temp/spacyes-phase2a-browser-Adov5d/ga4-network-audit.json. The existing Google tag loaded. Three intercepted GA4 collection requests contained one page_view and the eight expected event occurrences (one each branch_select, plan_select, membership_enquiry_click and trial_cta_click; contact_click/enquiry_handoff once for each of the two handoff channels). All six custom event types were present. No synthetic name, phone, email, private message or prefilled contact URL was found. Fixed send_to routing produced zero custom Ads event requests. Initialisation-time linked Ads requests remained blocked and require owner review. All collect requests were intercepted before transmission and answered locally; authenticated DebugView and server receipt remain unverified. This proves tested generated payloads, not universal privacy compliance or account-side ingestion.

Publication integrity:46 allowlisted files,source-byte equality. Preservation check confirms unchanged CSS, all membership markup/prices/durations,22 Rules, trial wording, calling/entry policies, images, SEO metadata, JSON-LD and Cloudflare configuration. No floating WhatsApp button added. git diff --check passed.

Verdict: application/regression checks PASS; production release HOLD pending approved privacy disclosure/placement, owner decision on linked Ads initialisation and consent applicability, native Linux security verification and account-side DebugView receipt. No banner, dashboard change, commit, push, merge or deployment performed.

## Exact cumulative file inventory

- about.html
- blog/can-background-noise-reduce-concentration.html
- blog/how-long-should-i-study.html
- blog/how-to-stay-focused-while-studying.html
- blog/is-studying-in-library-better-than-home.html
- blog/should-i-study-at-night.html
- main.js
- package.json
- success-stories.html
- PHASE2-ENQUIRY.md
- scripts/enquiry-browser-check.cjs
- scripts/enquiry-conversion.test.mjs
