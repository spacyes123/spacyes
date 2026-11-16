# Controlled production release candidate — HOLD

This draft remains stacked on PR #7 at c1fe3fa6ab2f8a666b4f2a57bfccb7025a6d6a48,
not independently deployable from current main. PR #6 SEO changes remain separate.
No Cloudflare/Pages setting, domain, DNS, secret, Worker version or production
traffic is changed by this work. No deployment command is executed.
This production-only runbook supersedes the inherited PR #7 integration proposal;
that historical proposal is not authorization to run versions upload.

## Production configuration and unknown settings

wrangler.jsonc is production-only: name spacyes, compatibility_date 2026-11-10,
assets.directory ./public, html_handling auto-trailing-slash, and
not_found_handling none. There is no previews configuration, Worker script,
ASSETS binding, SPA fallback, vars, guessed route or guessed binding.
Wrangler remains pinned at 4.161.0 with its lockfile and Node >=22.12 <23.

This is a candidate, NOT an exported effective production configuration.
Before release obtain the actual Worker settings, custom-domain association,
routes, workers_dev/preview_urls state, flags, observability, limits, placement,
vars and bindings. Previous reads returned 403/error 10000; do not interpret an
omitted field as proven preservation. Keep spacyes.com attached to the existing
Worker and preserve the exact existing routing association. Do not invent a
route based on the hostname. Reconcile settings in code review before any write.

The validator locks identity/date/assets and rejects unknown top-level fields,
previews, vars, main, bindings and routes. It permits only explicitly bounded
optional observability.enabled (boolean) and head_sampling_rate (0..1), validated
against the installed schema. Neither is added to production speculatively.
Other verified settings require a narrow validator/test amendment in the same
review as their configuration; there is deliberately no arbitrary overlay file
or environment-provided JSON configuration escape hatch.

## Build authorization versus deployment authorization

Normal local npm ci/build works without Cloudflare credentials. Workers Builds
install AND build require all of:

- WORKERS_CI_BRANCH exactly main;
- SPACYES_PRODUCTION_BUILD_SHA: an owner-approved lowercase full 40-character SHA;
- WORKERS_CI_COMMIT_SHA equal to that SHA.

No approval value is configured by this PR. Set the build-only approval variable
only after the final main SHA is known and separately approved. A later commit
fails until it receives its own approval. Clear the variable after the controlled
release. Do not set it in runtime vars or commit it as automatic authorization.
Cloudflare documents the WORKERS_CI variables as injected but overridable: this
is an operational latch, not cryptographic authorization against an administrator.
The actual checked-out SHA must also be confirmed in the release/build record.

npm run deploy and npm run preview ALWAYS fail before staging, including for an
approved production build. No wrapper spawns Wrangler or performs a remote write.
**Direct npx wrangler deploy bypasses npm wrappers.** The Cloudflare deploy stage
has real production authority; guard scripts are not an IAM or dashboard boundary.
Do not bypass preinstall with --ignore-scripts or clear WORKERS_CI to get green CI.

## Exact proposed future Cloudflare settings — not activated

Keep Worker spacyes, production branch main, compatibility date 2026-11-10,
production domain association, and production deploy command npx wrangler deploy.
Use Node 22 (>=22.12). After approval, repository root and shared build command:

```sh
npm ci --include=dev && npm run build && node scripts/verify-publication.mjs
```

Then the existing deploy stage runs:

```sh
npx wrangler deploy
```

Do not execute these as a combined release before approval. Build command,
Node/dependency installation policy, final repository configuration and SHA latch
must be coordinated. Build failure must prevent the deploy stage. Pin/verify the
installed Wrangler version rather than relying on npx fetching an unpinned version.
If Cloudflare automatically installs dependencies, supply the approval latch before
that install as well as the explicit build. The repeated npm ci is intentional
for reproducibility and must retain devDependencies.

Temporarily pause production automatic builds and non-production builds before
merging; obtain owner approval for these dashboard actions. No switch is performed
here. Legacy feature builds must not proceed to versions upload using production
settings. Keep them disabled until a separately approved branch-build policy exists.
Do not enable Worker Previews or invoke preview/upload to test this release.

## GitHub Pages: inactive artifact-only workflow

Observed repository visibility: public. Official GitHub documentation makes
environment required reviewers available for public repositories on current plans;
no paid-plan assumption is needed. Existing github-pages environment has only a
branch policy, no required-reviewer rule, and can_admins_bypass=true. It is NOT
currently an approval gate. No environment settings are changed here.

The prepared workflow is docs/workflows/pages-release.yml.disabled, deliberately
outside .github/workflows and with an unrecognized extension. It cannot run, even
if these commits merge. A separately reviewed activation change must move it to
.github/workflows/pages-release.yml AFTER the owner approves the publication
transition. There are no push, PR or scheduled triggers; only workflow_dispatch.
Pinned action revisions were resolved from the official action repositories.

Future safeguards:

1. Require dispatch on main and exact current-main input SHA matching both
   GITHUB_SHA and owner-set repository variable SPACYES_PAGES_RELEASE_SHA.
2. Read the existing github-pages environment and fail closed unless independent
   required reviewers are configured, prevent_self_review=true, and admin bypass
   is disabled. A read-permission error also blocks publication.
3. Build on Ubuntu/Node22, checkout full history without persisted Git credentials,
   require origin/main, enforce exactly 43 Linux passes with zero skips/failures,
   stage, run toolchain tests, verify exact inventory/hierarchy/source bytes.
4. Upload only public/; the publish job has pages:write and id-token:write and
   waits on github-pages environment approval. Build has no Pages write access.
5. Keep the www.spacyes.com Pages custom-domain setting unchanged. CNAME stays in
   source but is excluded from the artifact; verify the existing domain setting
   survives the approved source migration. Do not run configure-pages with
   enablement permissions or change CNAME/DNS in this workflow.

The workflow intentionally requires independent review. If no second reviewer,
environment-read capability or supported protection is available, leave it disabled.
Safe fallback: retain the previous known-good publication source/artifact, perform
build-only Linux verification with no pages/id-token write permissions, and request
separate approval for an owner-operated publication of that exact verified artifact.
Manual dispatch alone is not represented as independent approval. If the repository
becomes private, reassess plan support; never silently drop the environment gate.

Current Pages main/root publication DOES NOT obey the manifest or .gitignore.
It could publish scripts/docs/configuration, including this template. Do not merge
while that legacy source is automatically publishing unchecked main changes.
An _config.yml denylist is a possible interim exclusion but is weaker and not
implemented here. Preferred migration is publishing only the 46-file artifact.

Before disabling redundant Pages permanently, establish whether www or Cloudflare
origin/redirect behavior depends on it. Disabling it now is not approved.

## Local and Linux checks

```sh
npm ci --include=dev
npm run build
npm run validate:config
npm run test:cloudflare
node scripts/verify-publication.mjs
node --test --test-reporter=tap scripts/stage-public-assets.test.mjs
```

Linux acceptance (requires Node22, Git, tar, full history and origin/main):

```sh
node scripts/verify-linux-staging.mjs
```

This runs the requested TAP command, writes staging-tests.tap and fails unless
43 tests/pass, zero fail/skipped/cancelled. The owner reports all43 passed in
Codespaces. Independent evidence requires exact SHA, OS/Node/Git/tar versions,
full TAP output and 46-file byte verification. No independent Linux run is inferred.
The TAP file is ignored and never included in public/. Local Windows symlink skips
do not satisfy Linux acceptance. Workflow execution remains untested until approved.

Run npm run dev and npm run test:routing in separate terminals for loopback-only
runtime checks. Before a release verify /, /blog/, extensionless pages, .html 307,
nested assets, MIME and query strings, empty missing-page 404 and excluded paths.
Local routing does not establish production DNS/WAF/cache/custom-domain behavior.
Preserve not_found_handling none; activating custom 404 or SPA is a separate change.

## Coordinated release checkpoints — owner approval required

A. Capture active Worker version, traffic, domains/routes, effective settings,
build/root/branch commands and installed tooling. Last recorded successful version:
0582a83a-a673-4a9b-ae7a-de4d9d817d05 at100%; reconfirm current state. Save the last
successful Pages deployment/artifact and source/domain/environment configuration.
Historical baseline main is695f74ba6ef631902aa5a6c8bd7358903950c01c.

B. Approve a release window and pause Cloudflare automatic publication (including
feature builds); drain queued builds. Approve a Pages publication freeze that
preserves its current served site, e.g. migrate publication control to Actions with
no enabled publishing workflow, after confirming expected site retention. Capture
a known-good artifact first. If a nondestructive freeze cannot be established,
STOP before merging. Never unpublish/delete Pages as a substitute for a pause.

C. While BOTH publication paths are controlled, approve/merge PR#7. Rebase/retarget
PR#9 onto resulting main, especially after squash merges; remove duplicate dependency
commits, review only intended final changes and run Linux validation on that tree.
Merge approved PR#9. No intermediate main commit should deploy. PR#6 remains separate;
PR#8 is optional verification, not a production dependency.

D. Reconcile unknown production settings and approve the exact final SHA. Set build
Node/version/root/command and SHA latch together while builds remain paused. Verify
bare deploy cannot run before successful build. Approve one controlled main build;
confirm it uses the exact approved commit and pinned toolchain. Do not authorize
Worker Previews migration as part of this production-only procedure.

E. After Worker release validate apex and www redirects, HTML/assets, old URL forms,
404 behavior, canonical/robots/sitemap, analytics and enquiry links. Intercept forms,
WhatsApp/call/email during QA: do not submit or send anything. PR#6 is not included,
so do not claim its SEO improvements have been released.

F. Separately approve Pages activation PR/environment/source switch, approved SHA
variable and manual dispatch. Preserve domain, verify the artifact and approve the
environment deployment only after reviewing run/SHA. Verify excluded URLs on Pages
and both public hostnames. Clear one-release SHA latches. Restore only approved
automation, or retain manual publication until further authorization.

## Rollback

Stop further builds/publication via approved operations. If failure occurs before
Worker promotion, confirm the recorded version still serves100%. Otherwise restore
the recorded known-good Worker version/traffic and only changed settings, preserving
spacyes.com. A reviewed revert PR restores repository state; match build commands
and guard behavior to that tree, because a code revert alone cannot restore dashboard
settings or assets inputs. Reconfirm version/traffic and key URLs.

For Pages retain the known-good artifact and recorded source/domain before migration.
Restore that artifact through the approved protected Actions process. If it predates
the stager, use its archived artifact or a separately reviewed rollback publishing
procedure; do not blindly run modern scripts from an incompatible old commit. Revert
workflow/code via reviewed PR, and restore previous Pages source only if approved and
verified not to republish development files. Preserve www custom-domain settings and
check redirects/assets. Keep publication paused if no safe rollback path is verified.

Worker Previews remains disabled. Its irreversible migration is not an alternative
rollback or prerequisite. Git reverts cannot undo that future migration.

## References and decision

- https://developers.cloudflare.com/workers/ci-cd/builds/configuration/
- https://developers.cloudflare.com/workers/wrangler/configuration/
- https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

Local amendment validation on Windows/Node22.23.5: nine toolchain/approval tests
passed with zero skips/failures; the disabled workflow parsed as YAML with only
workflow_dispatch; an approved-main environment simulation built46 files totaling
2,175,332 bytes with source equality; all40 existing JSON-LD blocks parsed.
PR#7 tests recorded43 total,41 passed,2 file-symlink permission skips,0 failures.
No usable local WSL distribution or Docker runtime was available. The prepared
Linux/Pages workflow was not dispatched or activated. Source website/PR#7 staging
files have no diff against the dependency commit.

GO for code review/local verification only. HOLD merge, workflow activation and
production release until settings reconciliation, Linux evidence, publication freeze
and owner approvals. No merge, deployment, Cloudflare/Pages setting change or Modi
Holidays work is performed by this PR.
