import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { RELEASE_HOLD, requireNode22, run } from './cloudflare-toolchain.mjs';
import { validateCloudflareConfig } from './validate-cloudflare-config.mjs';

test('reviewed minimal configuration matches the pinned Wrangler schema', async () => {
  const config = await validateCloudflareConfig();
  assert.equal(config.compatibility_date, '2026-11-10');
  assert.equal(config.assets.directory, './public');
  assert.deepEqual(config.previews, {});
});

test('reject a different worker identity, date, unsafe directory, SPA fallback or production routes', async () => {
  const config = await validateCloudflareConfig();
  for (const change of [
    { name: 'other-worker' }, { compatibility_date: '2026-11-13' },
    { assets: { ...config.assets, directory: '.' } },
    { assets: { ...config.assets, not_found_handling: 'single-page-application' } },
    { routes: ['*/*'] }, { main: 'main.js' },
  ]) await assert.rejects(validateCloudflareConfig({ ...config, ...change }));
});

test('require the supported Node 22 major and Wrangler minimum Node minor', () => {
  requireNode22('22.12.0');
  requireNode22('22.23.5');
  for (const version of ['20.19.0', '22.11.0', '24.0.0', '26.0.0']) {
    assert.throws(() => requireNode22(version));
  }
});

test('Workers Builds install/build/write wrappers fail closed before staging', async () => {
  for (const action of ['install', 'build', 'preview', 'deploy']) {
    await assert.rejects(run(action, { environment: { WORKERS_CI: '1' }, version: '22.23.5' }),
      error => error.message === RELEASE_HOLD);
  }
});

test('no environment-variable bypass or arbitrary shell command is accepted', async () => {
  await assert.rejects(run('deploy', {
    environment: { WORKERS_CI: '1', SPACYES_APPROVED: 'true' }, version: '22.23.5',
  }), error => error.message === RELEASE_HOLD);
  await assert.rejects(run('anything-else', { environment: {}, version: '22.23.5' }), /arbitrary/);
});

test('toolchain source contains no subprocess/network path to a remote write', async () => {
  const source = await readFile(new URL('./cloudflare-toolchain.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"](?:node:)?(?:child_process|http|https|net)['"]|\bfetch\s*\(/);
});
