# Cloudflare static-assets candidate — HOLD, not activated

This is a stacked configuration/toolchain PR based on PR #7's exact staging
commit `c1fe3fa6ab2f8a666b4f2a57bfccb7025a6d6a48`. Its review base is
`fix/safe-static-assets-staging`, not main. No staging files have been copied or
rewritten. It is not independently deployable from current main.

## Audit and evidence

- Main baseline: `695f74ba6ef631902aa5a6c8bd7358903950c01c`; no tracked Wrangler
  configuration, package manifest, build workflow, or server-side Worker entry.
- PR #6 (`46460df`) changes SEO/page URLs, remains unmerged, and is not included
  here. PR #7 supplies the 46-file publication boundary. PR #8 supplies manual
  Linux verification and does not activate a workflow or Cloudflare setting.
- The owner reports a successful Codespaces Linux run. No accessible logs were
  attached to PR #7/#8, and the current GitHub authentication cannot read
  Codespaces. This report is not independent verification of that Linux run.
- Owner-confirmed production facts: assets-only Worker `spacyes`, compatibility
  date `2026-11-10`, custom domain `spacyes.com`, production branch main, deploy
  command `npx wrangler deploy`, legacy feature command
  `npx wrangler versions upload`, new Worker Previews not enabled.
- Latest successful main build observed through GitHub:
  `e2263f5e-6d5d-4abf-834e-d97ecff4af71`, Worker version
  `0582a83a-a673-4a9b-ae7a-de4d9d817d05`. Reconfirm the active version immediately
  before an approved release; a historical successful check is not an active
  deployment-history export.
- Cloudflare settings/deployments API inspection returned HTTP 403/error 10000:
  the connection lacks Worker settings read access. GitHub Pages is separately
  configured on main/root with CNAME `www.spacyes.com`; do not disable or change it
  without establishing which hosting path currently serves each hostname.

## What this candidate does and does not establish

`wrangler.jsonc` supplies only the verified Worker name/date and the proposed
static-assets options: `./public`, `auto-trailing-slash`, `none`, and `previews: {}`.
It intentionally includes no Worker script, ASSETS binding, SPA fallback, routes,
custom-domain reassignment, secrets, runtime variables or wildcard redirects.

**This is not a complete, approved production-settings export.** Omitting unknown
settings is not proof that a Wrangler write preserves them. In particular, route
ownership, `workers_dev`, `preview_urls`, compatibility flags, observability,
limits, placement, logpush, vars, bindings and any managed settings must be
inspected before replacing remote configuration. The known `spacyes.com` domain
remains untouched because no write is authorized. Preserve its exact existing
association in the approved configuration/release procedure; do not guess a new
route stanza from its hostname alone.

## Pinned toolchain and local-only commands

- Wrangler `4.161.0` is pinned exactly, with npm lockfile integrity hashes. Its
  official release notes and npm metadata were reviewed. It supports Worker
  Previews (documented minimum `4.135.0`) and requires Node >=22.12.0.
- Use Node 22 (`.nvmrc`); package engines deliberately restrict the major to 22.
- Ajv `8.20.0` validates against the installed, pinned Wrangler schema. Additional
  assertions restrict the candidate to its reviewed identity/date/assets fields.

```sh
npm ci
npm run build
npm run validate:config
npm run test:cloudflare
npm run test:staging
```

For local runtime routing checks only, run `npm run dev` in one terminal and
`npm run test:routing` in another. The checker accepts only an HTTP loopback
origin, compares served bytes/MIME types, checks known HTML redirects and empty
404s, and verifies that metadata/config/scripts/docs are not served. This never
creates a Preview or deploys anything. Set `WRANGLER_SEND_METRICS=false` for local
QA; a restricted Windows environment may require a writable temporary
`WRANGLER_LOG_PATH` and explicit permission for the local runtime to read its
installed files.

No deployment lifecycle runs on install. `npm run build` stages the 46 approved
files and validates the schema. The build wrapper rejects Workers Builds
(`WORKERS_CI`) while settings remain unverified. `npm run preview` and
`npm run deploy` stage/validate locally and then exit with an explicit release
hold, without invoking Wrangler. There is no environment-variable bypass.

The preinstall guard also rejects Workers Builds for this draft, so a push cannot
silently turn the existing missing-input failure into an approved upload during
the normal dependency-install/build pipeline. Do not bypass it with
`--ignore-scripts` in Cloudflare. Direct Wrangler commands bypass npm wrappers:
the repository is not an authorization boundary against an operator supplying
different commands. Keep this PR draft and never retry a build with changed
commands just to obtain a green check.

## Proposed future Cloudflare commands — NOT configured or executed

After the settings audit, reviewed hold removal, and explicit approval:

| Setting | Exact proposed value |
| --- | --- |
| Root | Repository root containing package.json/wrangler.jsonc |
| Install | `npm ci --include=dev` with Node 22 |
| Shared build command | `npm ci --include=dev && npm run build` |
| Production branch | Keep `main` |
| Production deploy command | Keep `npx wrangler deploy` |
| New Worker Previews command | `npm run build && npx wrangler preview` |

The duplicate build in the future Preview command is intentional defense against
missing shared build wiring: it regenerates and verifies assets before the remote
write. Production's existing command stays unchanged; require a successful shared
build before it runs. Direct local writes are out of scope until approval and must
also be preceded by the same staging/validation step. Do not use bare
`versions upload` as a substitute for the new Preview model.

### Shared-build and merge-order hazard

Changing the shared build command before main has the staging script/package
would break main builds. A top-level Wrangler file and new package can also alter
the behavior of the existing production command even without a dashboard change.
The new `.nvmrc` can also change the CI Node runtime when adopted. Do not merge
this candidate merely to make previews work.

1. Review/obtain the actual Linux TAP output, Node version, commit SHA, zero-skip
   count and 46-file validation evidence for PR #7. The owner report alone is not
   an independently collected result.
2. Approve PR #7 separately. Its merge may trigger existing deployments, so review
   that bootstrap as a production event. No merge is performed here.
3. Rebase this stack onto approved main (especially after squash merging PR #7),
   remove duplicate dependency commits, and retarget this PR to main. Review the
   diff again. Do not modify PR #7 or copy its files into this PR's unique diff.
4. Reconcile the unknown settings, preserve domain/production behavior, and remove
   the explicit hold only in a separately reviewed activation change. Capture a
   before/after effective-settings diff before any remote write.
5. Change shared build wiring only when the entire approved main tree is ready.
6. PR #6 can be reviewed separately; test a combined approved integration tree
   before relying on previews to approve its SEO/navigation changes. PR #8 is an
   optional verification aid, not an activation dependency. Never merge it merely
   to bypass the default-branch dispatch restriction without release approval.

## Worker Previews migration — separate irreversible approval

In Workers & Pages > spacyes > Settings > Builds, the existing Worker requires
the one-time **Set up Worker Previews** / **Switch to Worker Previews** action.
Cloudflare documents that the switch cannot be reversed. A Git revert, disabling
future preview builds, or a production version rollback does not undo it.

When separately approved, retain empty Preview vars/secrets/bindings for this
static-only site, review the new command, and prefer workers.dev Preview URLs
initially. Enabling a Preview host is separate from enabling the model. Preserve
the production `spacyes.com` custom domain; do not enable Preview traffic on it
or create wildcard DNS/certificates as part of this configuration fix. Verify
workers.dev Preview responses have X-Robots-Tag noindex; use Access if previews
should be private. No `preview_urls` toggle is added speculatively here.

## Routing, browser and SEO validation plan

- Preserve hierarchy: `/` -> index.html, `/blog/` -> blog/index.html,
  extensionless detail paths -> their .html files. `auto-trailing-slash` is the
  documented behavior that also issues the existing 307 .html normalization.
- Preserve `not_found_handling: none`, rather than introducing a homepage SPA
  fallback or activating the custom 404. Existing 404.html has relative logo/CSS
  paths that need a separate nested-path review before custom fallback is enabled.
- Check root/nested CSS, JS, images, query strings and fragments, MIME types,
  missing paths, excluded file paths and .html alternates against the local runtime
  and then an approved isolated Preview. Local tests do not establish production
  DNS, route precedence, WAF, caching or custom-domain behavior.
- Previews isolate backend settings, not inline frontend effects: block production
  GA requests and intercept email, telephone and WhatsApp actions during QA.
- Canonicals should describe approved production URLs, not Preview hostnames.
  PR #6 is not included here; absolute production navigation may leave a Preview.
  Do not add a site-wide production noindex header while protecting previews.

## Production snapshot and rollback

Before any approved activation record the active Worker/version/traffic weights,
domain associations, routes, DNS ownership, compatibility settings, build/root/
branch commands, variable names (never secret values), bindings, Preview host
settings and existing GitHub Pages state. Save the effective approved configuration
and previous toolchain lockfile in the release record.

If a future release fails, stop further builds via an explicitly authorized
operational action. Restore the recorded known-good Worker version/traffic and
only the settings actually changed, preserving spacyes.com. Use a reviewed revert
PR for this configuration/toolchain change and the normal approved release flow.
A bare configuration revert without matching build commands could reintroduce the
missing-assets failure. Reconfirm HTML, assets, enquiry links, analytics and SEO
signals after rollback. No rollback command is executed or automated here.

The Worker Previews migration itself has no dashboard rollback. That permanent
decision must be accepted independently of ordinary code/version rollback.

## Evidence and references

Actual executed results and limitations are recorded in the draft PR description;
do not infer successful deployment or Linux verification from this document.

- https://developers.cloudflare.com/workers/previews/get-started/
- https://developers.cloudflare.com/workers/previews/configuration/
- https://developers.cloudflare.com/workers/previews/custom-domains/
- https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/
- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/
- https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%404.161.0

**Verdict: HOLD merge, remote writes and irreversible migration until the settings
audit, Linux evidence and separate approvals are complete.** This preparation does
not change Cloudflare, DNS, domains, tokens, Worker versions, main, PR #6/#7/#8 or
Modi Holidays.
