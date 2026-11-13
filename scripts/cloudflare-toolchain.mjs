import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagePublicAssets, verifyPublicAssets } from './stage-public-assets.mjs';

export const RELEASE_HOLD = 'HOLD: production settings and Worker Previews migration require owner review. No Cloudflare write is approved.';

export function requireNode22(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (major !== 22 || minor < 12) throw new Error('Use Node.js 22.12.0 or later within major 22.');
}

export async function run(action, { environment = process.env, version = process.versions.node } = {}) {
  requireNode22(version);
  if (!['install', 'build', 'preview', 'deploy'].includes(action)) {
    throw new Error('Expected install, build, preview or deploy; arbitrary commands are not accepted.');
  }
  // Known builds inject WORKERS_CI. Do not let a push of this draft configuration
  // turn the existing bare upload command into a successful remote write.
  // There is deliberately no environment-variable bypass for this review hold.
  if (environment.WORKERS_CI) throw new Error(RELEASE_HOLD);
  if (action === 'install') return;
  const staged = await stagePublicAssets();
  const { validateCloudflareConfig } = await import('./validate-cloudflare-config.mjs');
  await validateCloudflareConfig();
  await verifyPublicAssets();
  console.log(`Prepared ${staged.files} allowlisted files locally; production configuration is NOT approved.`);
  if (action !== 'build') {
    // Preview/deploy wrappers stage and validate, then stop. A separately reviewed
    // activation change must reconcile settings and replace this explicit hold.
    // This file never imports/spawns a Wrangler write command.
    throw new Error(RELEASE_HOLD);
  }
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
