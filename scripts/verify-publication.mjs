import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyPublicAssets } from './stage-public-assets.mjs';

export async function verifyPublication() {
  const manifest = JSON.parse(await readFile(new URL('./public-assets.json', import.meta.url), 'utf8'));
  assert.equal(manifest.length, 46);
  assert.equal(new Set(manifest).size, 46);
  // PR #7's verifier checks the full output inventory, hierarchy, symlinks and
  // byte equality. The count alone is never accepted as publication evidence.
  const result = await verifyPublicAssets();
  assert.equal(result.files, 46);
  return result;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(await verifyPublication())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
