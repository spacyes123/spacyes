# Static asset staging

This code-only process creates `public/` from the reviewed list in
`scripts/public-assets.json`. It does not invoke Wrangler, upload assets, change
hosting settings, or deploy anything. Website sources remain in their current
locations so the existing GitHub Pages build is not moved or reconfigured.

## Run locally

Use Node.js 20 or newer. No npm installation or third-party Node packages are
required.

```sh
node scripts/stage-public-assets.mjs
node --test scripts/stage-public-assets.test.mjs
```

Run these commands from the repository root. The stager itself derives the source
root from its own location, so invoking it by absolute path from another working
directory also works. It accepts no command-line arguments and cannot be directed
to delete a different output path. Its only output location is this repository's
`public/`, which is generated, disposable, and ignored by Git.

The integration test also needs Git, an `origin/main` reference, and `tar`. It
extracts a clean main-baseline archive into a unique temporary directory, adds
only the manifest and stager, runs the CLI there, and verifies all source-file
hashes before and after. Tests do not modify the checkout's website sources.

## Publication boundary

The initial main baseline contains 49 tracked files. The manifest explicitly lists
46 website files: 21 HTML pages, 18 JPG/WebP images, CSS, client JavaScript, the
logo, favicon, robots, sitemap, and `llms.txt`.

`.gitattributes`, `CHANGELOG.md`, and `CNAME` are not published. Neither are `.git`,
scripts, docs, configuration, credentials, dependency trees, or development
artifacts. The script never recursively copies the repository root. A separate
path/type policy also rejects hidden paths and files outside the permitted public
locations, even if they are accidentally inserted into the manifest.

Adding a public file requires a reviewed manifest change. Adding a new root-file
name or asset category additionally requires a policy change in the stager. The
manifest is a trust boundary: approved website files must themselves contain only
public content. No filename policy can detect secrets placed inside an otherwise
approved HTML/image file.

## Failure behavior and safe cleanup

- Reject absolute paths (including Windows/UNC), traversal, backslashes, hidden
  path components, duplicates, invalid locations/types, and missing inputs.
- Reject symlink/junction sources and parent directories, a symlink manifest, and
  symlinks/junctions anywhere in an existing output tree.
- Validate/read all sources and inspect the entire existing output tree before
  deleting any prior output.
- Remove only inspected files and empty directories under the fixed `public/`
  path. No recursive removal API is used by the stager. Sibling directories and
  website sources are untouched.
- Write files exclusively, then reread sources and verify the exact file list,
  directory hierarchy, and byte equality. Extra files or empty directories fail
  verification. Errors exit nonzero; never publish output from a failed run.

The script is intended for an exclusively owned checkout/build workspace. Do not
run concurrent staging processes, source editors, or untrusted processes that
mutate the checkout during a build. Filesystem checks are not an OS sandbox
against an adversary concurrently replacing directory entries.

Tests exercise exclusions, byte preservation, stale-output removal, sibling
preservation, malicious paths, missing/malformed inputs, symlinks/junctions, output
tampering, and clean-main CLI execution. File-symlink tests explicitly skip if the
OS denies creating symlinks; directory-junction cases are tested separately.

See [the separate Cloudflare proposal](cloudflare-integration-proposal.md). No
Cloudflare integration is activated by these files.
