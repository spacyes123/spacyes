import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stagePublicAssets } from './stage-public-assets.mjs';
import { validateCloudflareConfig } from './validate-cloudflare-config.mjs';
import { verifyPublication } from './verify-publication.mjs';

export function requireNode22(version = process.versions.node) {
  const [major, minor] = version.split('.').map(Number);
  if (major !== 22 || !Number.isInteger(minor) || minor < 12) {
    throw new Error('Use Node.js 22.12.0 or later within major 22.');
  }
}

export async function build() {
  requireNode22();
  await validateCloudflareConfig();
  await stagePublicAssets();
  const result = await verifyPublication();
  console.log(`Built and verified ${result.files} public files (${result.bytes} bytes).`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw new Error('Build accepts no arguments; output is always public/.');
    await build();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
