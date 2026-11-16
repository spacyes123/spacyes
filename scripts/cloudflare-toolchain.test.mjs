import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { RELEASE_HOLD, requireNode22, requireProductionBuildApproval, run } from './cloudflare-toolchain.mjs';
import { validateCloudflareConfig } from './validate-cloudflare-config.mjs';

const sha = 'a'.repeat(40);
const approved = { WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main', WORKERS_CI_COMMIT_SHA: sha, SPACYES_PRODUCTION_BUILD_SHA: sha };

test('production-only configuration validates with no previews', async () => {
  const config = await validateCloudflareConfig();
  assert.equal(config.compatibility_date, '2026-11-10');
  assert.equal(config.assets.directory, './public');
  assert(!('previews' in config));
});

test('bounded production observability is accepted, unsafe/unknown settings rejected', async () => {
  const config = await validateCloudflareConfig();
  await validateCloudflareConfig({ ...config, observability: { enabled: true, head_sampling_rate: 0.1 } });
  for (const change of [
    { name: 'other-worker' }, { compatibility_date: '2026-11-13' },
    { assets: { ...config.assets, directory: '.' } },
    { assets: { ...config.assets, not_found_handling: 'single-page-application' } },
    { routes: ['*/*'] }, { main: 'main.js' }, { previews: {} }, { vars: { SECRET: 'x' } },
    { observability: { enabled: 'true' } }, { observability: { head_sampling_rate: 2 } },
    { observability: { anything: true } }, { observability: null },
  ]) await assert.rejects(validateCloudflareConfig({ ...config, ...change }));
});

test('Node major/minor policy', () => {
  requireNode22('22.12.0');
  for (const version of ['20.19.0', '22.11.0', '24.0.0']) assert.throws(() => requireNode22(version));
});

test('only exact approved main build is admitted; local build needs no Cloudflare approval', async () => {
  requireProductionBuildApproval({});
  requireProductionBuildApproval(approved);
  await run('install', { environment: approved, version: '22.23.5' });
  for (const environment of [
    { WORKERS_CI: '1' }, { ...approved, WORKERS_CI_BRANCH: 'feature' },
    { ...approved, SPACYES_PRODUCTION_BUILD_SHA: 'true' },
    { ...approved, WORKERS_CI_COMMIT_SHA: 'b'.repeat(40) },
    { ...approved, WORKERS_CI_COMMIT_SHA: undefined },
  ]) {
    assert.throws(() => requireProductionBuildApproval(environment), /HOLD/);
    await assert.rejects(run('build', { environment, version: '22.23.5' }), /HOLD/);
  }
});

test('build approval never permits npm write operations or arbitrary commands', async () => {
  for (const environment of [{}, approved, { WORKERS_CI: '1' }]) {
    for (const action of ['deploy', 'preview']) {
      await assert.rejects(run(action, { environment, version: '22.23.5' }), error => error.message === RELEASE_HOLD);
    }
  }
  await assert.rejects(run('anything-else', { environment: {}, version: '22.23.5' }), /arbitrary/);
});

test('toolchain has no remote write execution path', async () => {
  const source = await readFile(new URL('./cloudflare-toolchain.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"](?:node:)?(?:child_process|http|https|net)['"]|\bfetch\s*\(/);
});

test('publication verifier checks actual staged files', async () => {
  const { verifyPublication } = await import('./verify-publication.mjs');
  assert.equal((await verifyPublication()).files, 46);
});

test('Pages template is inactive and requires manual SHA approval and environment review', async () => {
  const workflow = await readFile(new URL('../docs/workflows/pages-release.yml.disabled', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /^  (push|pull_request|schedule|workflow_run):/m);
  for (const required of ['SPACYES_PAGES_RELEASE_SHA', 'required_reviewers', 'prevent_self_review', 'can_admins_bypass', 'path: public', 'environment:', 'github-pages', 'pages: write', 'persist-credentials: false']) assert(workflow.includes(required), required);
  assert.doesNotMatch(workflow, /wrangler (deploy|preview|versions)/);
});

test('Pages approval preflight fails closed for missing reviewers, self approval and bypass', async () => {
  const workflow = await readFile(new URL('../docs/workflows/pages-release.yml.disabled', import.meta.url), 'utf8');
  const inline = workflow.split("<<'NODE'\n")[1].split('\n          NODE')[0];
  const predicate = inline.slice(inline.indexOf('          if ('));
  const valid = { can_admins_bypass: false, protection_rules: [
    { type: 'required_reviewers', prevent_self_review: true, reviewers: [{ type: 'User' }] },
  ] };
  vm.runInNewContext(predicate, { e: valid });
  for (const e of [
    {}, { ...valid, can_admins_bypass: true }, { ...valid, protection_rules: [] },
    { ...valid, protection_rules: [{ ...valid.protection_rules[0], prevent_self_review: false }] },
    { ...valid, protection_rules: [{ ...valid.protection_rules[0], reviewers: [] }] },
  ]) assert.throws(() => vm.runInNewContext(predicate, { e }), /Required independent/);
});
