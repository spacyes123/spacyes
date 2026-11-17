import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { requireNode22 } from './build.mjs';
import { validateCloudflareConfig } from './validate-cloudflare-config.mjs';
import { verifyPublication } from './verify-publication.mjs';

test('production configuration matches pinned Wrangler and existing static routing', async () => {
  const config = await validateCloudflareConfig();
  assert.equal(config.name, 'spacyes');
  assert.equal(config.compatibility_date, '2026-11-10');
  assert.deepEqual(config.assets, {
    directory: './public', html_handling: 'auto-trailing-slash', not_found_handling: 'none',
  });
});

test('reject unsafe publication, routing, bindings and unreviewed settings', async () => {
  const config = await validateCloudflareConfig();
  await validateCloudflareConfig({ ...config, observability: { enabled: true, head_sampling_rate: 0.1 } });
  for (const change of [
    { name: 'other-worker' }, { compatibility_date: '2026-11-13' },
    { assets: { ...config.assets, directory: '.' } },
    { assets: { ...config.assets, not_found_handling: 'single-page-application' } },
    { routes: ['*/*'] }, { main: 'main.js' }, { previews: {} },
    { vars: { SECRET: 'x' } }, { kv_namespaces: [] },
    { observability: { enabled: 'true' } }, { observability: { head_sampling_rate: 2 } },
    { observability: { anything: true } }, { observability: null },
  ]) await assert.rejects(validateCloudflareConfig({ ...config, ...change }));
});

test('Node policy requires supported major 22 and minimum minor', () => {
  requireNode22('22.12.0');
  requireNode22('22.23.5');
  for (const version of ['20.19.0', '22.11.0', '24.0.0', '22.invalid', 'invalid']) {
    assert.throws(() => requireNode22(version));
  }
});

test('ordinary Workers CI build succeeds without an approval SHA', () => {
  const env = { ...process.env, WORKERS_CI: '1', WORKERS_CI_BRANCH: 'main' };
  delete env.SPACYES_PRODUCTION_BUILD_SHA;
  const result = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), env, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Built and verified 46 public files/);
});

test('publication inventory and bytes match the approved manifest', async () => {
  assert.equal((await verifyPublication()).files, 46);
});

test('install and tests cannot invoke deployment; deploy is an explicit build then pinned CLI', async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'pretest', 'posttest', 'preview']) {
    assert.equal(pkg.scripts[hook], undefined, hook);
  }
  assert.equal(pkg.scripts.deploy, 'npm run build && wrangler deploy');
  assert.equal(pkg.devDependencies.wrangler, '4.161.0');
  for (const [name, command] of Object.entries(pkg.scripts)) {
    if (name !== 'deploy') assert.doesNotMatch(command, /\b(?:deploy|upload|preview)\b/, name);
  }
});

test('build source has no subprocess or network execution path', async () => {
  const source = await readFile(new URL('./build.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"](?:node:)?(?:child_process|http|https|net)['"]|\bfetch\s*\(/);
});

test('build refuses output overrides and arbitrary arguments', () => {
  const result = spawnSync(process.execPath, ['scripts/build.mjs', '--output', '.'], {
    cwd: fileURLToPath(new URL('../', import.meta.url)), encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /accepts no arguments/);
});
