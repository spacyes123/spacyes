# Spacyes website

Static website for https://spacyes.com, served by the existing Cloudflare Worker
`spacyes`. Node.js 22.12+ within major 22 and Wrangler 4.161.0 are used for builds.
Install with the committed lockfile:

```sh
npm ci --include=dev
npm test
```

Installation and tests never deploy. `npm test` builds, runs the staging security
suite and checks configuration/build behavior. For the Linux release check use
`npm run test:linux`: it requires exactly 43 staging passes with no skips or
failures, then runs build tests. Tests require Git, tar and the `origin/main`
reference/history. Windows can skip file-symlink tests when permissions deny them;
those skips do not replace the Linux check.

`.github/workflows/website-ci.yml` runs these checks on Ubuntu/Node22 for every PR
(including the proposed merge tree), main pushes and manual test runs. It uses
full history, no persisted Git credentials and no Cloudflare secrets. Validation
requires 43 staging passes with zero skips, eight build/configuration tests, exact
46-file byte equality and local routing. There are no path filters or deploy jobs.

## Build and local routing

```sh
npm run build
npm run dev
```

In another terminal, run `npm run test:routing`. This checks only the loopback
server: pages, redirects, query strings, MIME types, nested assets and excluded
paths. Local results do not prove production DNS or Cloudflare rule behavior.

The build validates the pinned Wrangler schema, then copies only the 46 files in
`scripts/public-assets.json` into ignored `public/`. It verifies exact hierarchy
and source bytes, rejects unsafe paths, duplicates, missing files and symlinks,
and cleans only the fixed generated output. It never copies the repository root.
Do not run simultaneous staging processes or mutate inputs during a build.
Metadata, CNAME, README, scripts, docs, configuration, dependencies and credentials
are excluded. Adding or removing website files requires a reviewed manifest and
file-count check update. Never use `--assets .`.

## Cloudflare deployment

`wrangler.jsonc` keeps Worker `spacyes`, compatibility date `2026-11-10`, assets
`./public`, `auto-trailing-slash` HTML handling and `none` not-found handling.
There is no Worker script, ASSETS binding, SPA fallback or Worker Previews setup.
The configuration is unchanged from PR #9. Current API access cannot independently
read production settings (403): before the first release compare the active domain,
routes, flags, variables, bindings and observability with the candidate. Omitted
settings are not proof of preservation; reconcile any differences before deploying.
Preserve the existing apex domain association and www-to-apex Page Rule/DNS.

An authorized operator deploys explicitly, using the locally pinned Wrangler:

```sh
npm run deploy
```

This rebuilds and verifies `public/` before `wrangler deploy`. It is a real
production operation, never an installation/test hook. There is no SHA environment
approval variable. Keep credentials outside source control.

After the first controlled deployment succeeds, configure the existing Workers
Git integration with Node 22 and repository root:

| Setting | Command |
| --- | --- |
| Build | `npm ci --include=dev && npm run build` |
| Deploy | `npx wrangler deploy` |

The successful build installs the pinned local Wrangler before the existing deploy
command runs. For local deployments prefer `npm run deploy`, which rebuilds first.
Both deployment commands run from repository root and use this same wrangler.jsonc
and validated `./public` directory, without assets/config/environment overrides.
In Worker spacyes > Settings > Builds, select repository spacyes123/spacyes,
production branch main and the commands above. Disable non-production/preview
branch builds; do not switch to Worker Previews. Keep the existing Worker/domain,
DNS, redirects and reconciled runtime settings. No second deployment pipeline or
Cloudflare token is added to GitHub Actions. Keep GitHub Pages disabled.

## GitHub merge protection and failure alerts

Before enabling production automation, protect main in Settings > Branches:

- Require a pull request and one approval from another eligible reviewer; dismiss
  stale approvals after new commits and require approval of the latest push.
- Require the unique GitHub Actions check **Static website checks**, with the
  branch up to date before merging, and require conversations to be resolved.
- Apply protection to administrators/bypass roles; allow no bypass, force pushes
  or branch deletion. Do not enable a merge queue without adding merge-group CI.
- Do NOT require the production Cloudflare check or deployment-result job before
  merge: Cloudflare deploys only after main changes. No direct main pushes.

Main currently needs these settings; this code does not configure them. Let the
first review-branch CI run register its check before selecting it as required.
Bootstrap PR #7 predates this workflow: use its verified Linux evidence while
publication is disabled, then require the new check for PR #9 and routine updates.
One independent reviewer must be available; authors cannot approve their own PR.
The required PR check is the pre-merge gate. Post-merge tests do not delay an
already-started Cloudflare build, so strict up-to-date checks are important.

The same workflow observes the existing Cloudflare GitHub check on main for up to
10 minutes, without deploying. Failure/cancellation/timeout produces a red
**Cloudflare deployment result** job, annotation and build-log link. No observed
check also fails rather than claiming a deployment occurred. During bootstrap
this is expected while automatic builds are disabled; validation remains a separate
job. A successful Cloudflare check is not a substitute for production smoke tests.

For alerts, watch this repository and enable GitHub Settings > Notifications >
System > Actions > Email/On GitHub, optionally failed workflows only. The workflow
run is triggered by the main merge; confirm notification delivery during setup.
Cloudflare also exposes its build status/logs in GitHub and Worker build history.
No email/webhook delivery has been tested and no notification service is deployed.

## Release and recovery

1. Review/merge PR #7 first while automatic publication remains disabled. It adds
   secure staging; do not deploy that intermediate tree by itself.
2. With owner approval, incorporate this local simplification through a normal
   review-branch merge into PR #9, without rewriting its history. Bring PR #9 up to
   date with main, retarget it to main and review its final diff. Run Linux tests
   and local routing on the combined tree, then merge the approved PR #9.
3. Record the final main SHA and verify its tree. Snapshot the current Worker
   version/traffic, domain/settings and commands. Last recorded rollback version
   is `0582a83a-a673-4a9b-ae7a-de4d9d817d05` at 100%; reconfirm it is available.
4. Keep automatic Cloudflare builds disabled. After production settings are
   reconciled, obtain approval for one explicit `npm run deploy` of that tested
   main tree. Smoke-test it first, then obtain approval to enable only production
   main builds with the settings above. If reconnecting Git starts another build,
   confirm it targets the same tested main tree; do not activate preview builds.
   Keep PR #6 separate and release it afterward with its own SEO checks.
5. Smoke-test apex and www, all three branches, blog, CSS/images/JS and missing
   paths. Check enquiry links without submitting forms or triggering calls.

Example read-only smoke tests (use `curl.exe` and `NUL` on Windows):

```sh
curl -sS -I https://spacyes.com/
curl -sS -I 'https://www.spacyes.com/blog/?qa=1&source=www'
curl -sS -L --max-redirs 5 -o /dev/null -w '%{http_code} %{url_effective}\n' 'https://www.spacyes.com/branches/kandivali-west.html?qa=1'
curl -sS -o /dev/null -w '%{http_code}\n' https://spacyes.com/style.css
curl -sS -o /dev/null -w '%{http_code}\n' https://spacyes.com/__missing_release_check
```

Expect apex/pages/assets 200, www 301 to apex with path/query preserved, HTML
normalization without loops, and missing/excluded paths 404. PR #6 remains unmerged
in this candidate, so compare SEO signals to the existing production baseline.

If release fails before promotion, confirm the old version remains active. If it
fails after promotion, the owner restores the recorded known-good version through
Worker > Deployments > version menu > Rollback and verifies 100% traffic and smoke
tests. Restore only settings actually changed. Fix/revert code through a reviewed
PR before another explicit deployment. A Git revert alone does not restore the
active Worker version or dashboard settings. Keep Pages disabled; do not change
DNS or enable previews as a recovery shortcut.

Production rollback has not been verified or exercised. Confirm that the recorded
version and its assets are available and that the owner has rollback permission
before approving a production release.

## Routine updates after setup

Create a branch, edit the website, run `npm test`, and open a PR. CI must pass and
another reviewer must approve before merge. If main advances, update the branch
and rerun checks. Merge the PR; the existing Cloudflare integration builds the
same allowlisted public directory and deploys it automatically. Check its result
and smoke-test the changed page. Installation/tests never deploy, and feature
branches have no automatic Cloudflare deployment path. Reserve manual deployment
for approved main releases or recovery. New public files require a reviewed
manifest/count-check change; content-only edits keep the 46-file boundary.
