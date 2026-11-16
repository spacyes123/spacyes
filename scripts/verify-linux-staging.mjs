import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

// No skip-tolerant exit-code shortcut: require the exact TAP totals as well.
assert.equal(process.platform, 'linux', 'This verification requires Linux');
assert.equal(process.versions.node.split('.')[0], '22', 'Use Node 22');
const result = spawnSync(process.execPath, ['--test', '--test-reporter=tap', 'scripts/stage-public-assets.test.mjs'], { encoding: 'utf8' });
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
await writeFile('staging-tests.tap', (result.stdout ?? '') + (result.stderr ?? ''));
assert.equal(result.status, 0, 'Staging test process failed');
for (const [label, count] of [['tests', 43], ['pass', 43], ['fail', 0], ['skipped', 0], ['cancelled', 0]]) {
  assert.match(result.stdout, new RegExp(`^# ${label} ${count}$`, 'm'), `Unexpected ${label} total`);
}
