# Future Cloudflare integration — proposal only

This document is not an active build/deploy configuration. This PR adds no
Wrangler configuration, package scripts, CI workflow, production deploy command,
routes, DNS settings, tokens, or Worker entry point. It does not change PR #6.

## Background

The reported feature-build command is `npx wrangler versions upload`, failing with
`Missing entry-point to Worker script or to assets directory`. The repository has
static website files, but no configured Worker script or assets directory. Browser
`main.js` must never be used as a Worker entry point.

The stager supplies a reviewed assets directory without exposing the repository
root. It does not itself fix or rerun Cloudflare builds.

## Prerequisites for a separate, explicitly approved hosting change

1. Inspect the active `spacyes` Worker, successful main build, and failed feature
   build: effective commands, root directory, Wrangler version, assets settings,
   compatibility settings, bindings, variables, and any Worker code.
2. Confirm whether the active Worker is assets-only. Do not replace unknown
   custom Worker logic, bindings, authentication, or proxy behavior.
3. Confirm the relationship between Cloudflare and the existing GitHub Pages
   configuration (`main`, root, `www.spacyes.com` CNAME). Leave `CNAME` untouched.
4. Pin an approved Wrangler version and confirm preview/version behavior and
   account permissions. Version uploads do not immediately promote production
   traffic, but are still remote writes requiring separate approval.

## Proposed feature-build wiring, not configured or executed

After those checks and separate approval, the proposed build step is:

```sh
node scripts/stage-public-assets.mjs
```

The proposed non-production command would then explicitly supply `./public` to
the existing version-upload mechanism:

```sh
# PROPOSAL ONLY: do not execute without the separate hosting approval.
npx wrangler versions upload --name spacyes --assets ./public --keep-vars
```

The precise Wrangler version/flags, compatibility settings, and variable/binding
preservation must be reviewed against the active Worker before that command is
configured or executed. `--keep-vars` does not preserve unknown Worker code or
bindings, and a version upload is not a branch-isolated resource environment.
See Cloudflare's
[Wrangler commands](https://developers.cloudflare.com/workers/wrangler/commands/workers/).

This PR intentionally does not create or alter any production deploy command.
Never use `--assets .`, recursively copy the checkout, or switch a feature branch
to a production deployment just to obtain a green check.

## Routing and release checks

- Preserve the staged hierarchy and source bytes. `public/index.html` remains
  the homepage; branch/article `.html` files and `blog/index.html` retain their
  existing physical paths. This PR does not rename or rewrite any website files.
- Verify the existing extensionless/`auto-trailing-slash` behavior with the chosen
  Wrangler runtime, including `/`, `/blog/`, branch pages, and `.html` alternates.
- Preserve existing not-found behavior in the narrow deployment fix. Do not turn
  on SPA fallback. Enabling a custom 404 is a separate change: existing relative
  asset paths in `404.html` require review for nested missing URLs.
- Verify custom domains, redirects, all canonical destinations, CSS/images/JS,
  forms, contact links, and JSON-LD on an approved isolated preview before any
  production release. Staging tests do not establish production routing or
  deployment success.
- Excluded metadata/configuration paths must not be served by the staged assets.

References: [assets configuration](https://developers.cloudflare.com/workers/static-assets/binding/),
[HTML routing](https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/),
[build configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).
