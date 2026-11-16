import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagePublicAssets, verifyPublicAssets } from './stage-public-assets.mjs';

export const RELEASE_HOLD = 'HOLD: no deployment or preview operation is approved.';

export function requireProductionBuildApproval(environment) {
  if (!environment.WORKERS_CI) return;
  const approved = environment.SPACYES_PRODUCTION_BUILD_SHA;
  if (environment.WORKERS_CI_BRANCH !== 'main' || !/^[a-f0-9]{40}$/.test(approved ?? '')
    || approved !== environment.WORKERS_CI_COMMIT_SHA) {
    throw new Error('HOLD: Workers Builds requires main and an exact owner-approved SPACYES_PRODUCTION_BUILD_SHA.');
  }
}

export function requireNode22(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (major !== 22 || minor < 12) throw new Error('Use Node.js 22.12.0 or later within major 22.');
}

export async function run(action, { environment = process.env, version = process.versions.node } = {}) {
  requireNode22(version);
  if (!['install', 'build', 'preview', 'deploy'].includes(action)) {
    throw new Error('Expected install, build, preview or deploy; arbitrary commands are not accepted.');
  }
  // Write wrappers always stop before staging, even with build approval.
  if (action === 'preview' || action === 'deploy') throw new Error(RELEASE_HOLD);
  // Build approval is a release-SHA latch, not permission to deploy. Direct
  // Wrangler commands bypass this wrapper; dashboard controls remain essential.
  requireProductionBuildApproval(environment);
  if (action === 'install') return;
  const staged = await stagePublicAssets();
  const { validateCloudflareConfig } = await import('./validate-cloudflare-config.mjs');
  await validateCloudflareConfig();
  await verifyPublicAssets();
  console.log(`Prepared and verified ${staged.files} allowlisted files; no remote operation executed.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 3) throw new Error('Pass exactly one toolchain action.');
    await run(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
