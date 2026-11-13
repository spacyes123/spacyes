import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';

const root = fileURLToPath(new URL('../', import.meta.url));
const expected = {
  $schema: './node_modules/wrangler/config-schema.json',
  name: 'spacyes',
  compatibility_date: '2026-11-10',
  assets: {
    directory: './public',
    html_handling: 'auto-trailing-slash',
    not_found_handling: 'none',
  },
  previews: {},
};

export async function validateCloudflareConfig(config) {
  const schema = JSON.parse(await readFile(path.join(root, 'node_modules/wrangler/config-schema.json'), 'utf8'));
  const data = config ?? JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  const validate = ajv.compile(schema);
  assert(validate(data), `Pinned Wrangler schema rejected config: ${JSON.stringify(validate.errors)}`);
  // JSON is valid JSONC. Keep this reviewed file comment-free so it can be parsed
  // without a second JSONC dependency, and restrict it to the audited fields.
  assert.deepEqual(data, expected, 'Unexpected routing, binding, runtime or identity setting');
  const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/wrangler/package.json'), 'utf8'));
  assert.equal(pkg.version, '4.161.0', 'Use the exact reviewed Wrangler version');
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await validateCloudflareConfig();
    console.log('Wrangler 4.161.0 schema and reviewed static-assets invariants passed. This is NOT production approval.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
