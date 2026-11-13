# Manual Linux verification of PR #7

Workflow: `.github/workflows/verify-pr7-static-assets-linux.yml`.

This is verification only. It uses `ubuntu-latest` and Node.js 22, requests only
`contents: read`, references no secrets, and runs no Wrangler, Cloudflare, upload,
preview, production deployment, or publishing command. There are no automatic
push, pull-request, schedule, or external-dispatch triggers.

## Exact revision under test

The workflow checks out repository `spacyes123/spacyes` at the audited PR #7 SHA:

```text
c1fe3fa6ab2f8a666b4f2a57bfccb7025a6d6a48
```

It does not test whichever commit happens to be on the dispatch branch, a moving
feature branch, or an unrelated main checkout. An explicit HEAD check fails on a
different checkout. If PR #7 changes, review and update both the pinned checkout
and `PR7_SHA`, plus the expected test count if appropriate. A successful run is
evidence for this SHA only, not for later PR changes.

## Prerequisites and commands

Checkout fetches full history with `fetch-depth: 0`. The prerequisite step also
fetches `refs/heads/main` into `refs/remotes/origin/main` and checks that Git, tar,
non-shallow history, and a merge base are available. This is required because two
tests use Git history/`origin/main` and the clean-main test uses `git archive`
and external tar. The stager itself has no Git/tar or npm-package dependency.

The exact test command is:

```sh
node --test --test-reporter=tap scripts/stage-public-assets.test.mjs
```

The runner preserves pipeline failures and captures TAP outside the checkout in
`$RUNNER_TEMP/spacyes-pr7-staging-tests.tap`. A separate gate requires exactly
43 tests and 43 passes, with zero failures, cancellations, skips, or TODOs. Missing
or ambiguous summaries fail. Explicit SKIP/TODO directives also fail, even though
Node normally permits skipped tests to exit successfully. There is no
`continue-on-error` path.

After that gate, the workflow runs:

```sh
node scripts/stage-public-assets.mjs
```

It then independently walks `public/`, checks its exact 46-file manifest set,
rejects hidden/non-public paths and symlinks, compares every staged file with the
original source bytes, and invokes `verifyPublicAssets()` to verify hierarchy as
well. It checks that output is ignored and the source checkout remains clean.
No artifact is published or uploaded. Results are printed in logs and the job
summary.

Official checkout/setup-node actions are pinned to immutable commit SHAs. Checkout
does not persist its read token into Git configuration. The explicit main fetch
uses this public repository without credentials. The job runs only in
`spacyes123/spacyes`, and accepts no input selecting arbitrary code or commands.

## Trigger manually — later, not during preparation

GitHub requires a `workflow_dispatch` workflow to exist on the repository's
default branch before it can be triggered. Therefore this new workflow cannot be
run while it exists only in this draft PR. Neither adding automatic triggers nor
merging anything is part of preparing this workflow.

A future merge/push to main can trigger the repository's existing Cloudflare or
GitHub Pages integrations independently of this manual workflow. This workflow
does not disable or control those integrations. Review and approve that bootstrap
separately; do not assume merging a verification-only file is deployment-free.

After a separately approved merge makes the workflow available on `main`:

1. Open the repository's **Actions** tab.
2. Select **Verify PR7 static assets on Linux**.
3. Choose **Run workflow**, select **main**, and confirm **Run workflow**.
4. Inspect every job step and the summary. Require 43 passes, zero skips, 46
   verified files, and a clean source checkout.

The equivalent manual CLI dispatch, for that later approved stage only, is:

```sh
gh workflow run verify-pr7-static-assets-linux.yml --repo spacyes123/spacyes --ref main
```

Selecting main here chooses the workflow definition; it does not change the pinned
PR #7 source revision that the job tests. This preparation does not dispatch the
workflow and does not claim that Linux verification has passed.

Reference: [GitHub manual workflow requirements](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).
