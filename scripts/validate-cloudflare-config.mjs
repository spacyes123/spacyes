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
  previews: {},
  assets: {
    directory: './public',
    html_handling: 'auto-trailing-slash',
    not_found_handling: 'none',
  },
};

export async function validateCloudflareConfig(config) {
  const schema = JSON.parse(await readFile(path.join(root, 'node_modules/wrangler/config-schema.json'), 'utf8'));
  const data = config ?? JSON.parse(await readFile(path.join(root, 'wrangler.jsonc'), 'utf8'));
  const ajv = new Ajv({ allErrors: true, strict: false, validateFormats: false });
  const validate = ajv.compile(schema);
  assert(validate(data), `Pinned Wrangler schema rejected config: ${JSON.stringify(validate.errors)}`);
  // JSON is valid JSONC. Keep identity and publication boundaries explicit;
  // additional production settings need a reviewed config/test update.
  const { observability, ...core } = data;
  assert.deepEqual(core, expected, 'Unexpected routing, binding, runtime or identity setting');
  if (observability !== undefined) {
    assert.equal(typeof observability, 'object');
    assert(observability !== null && !Array.isArray(observability));
    for (const [key, value] of Object.entries(observability)) {
      assert(['enabled', 'head_sampling_rate'].includes(key), 'Unreviewed observability field');
      if (key === 'enabled') assert.equal(typeof value, 'boolean');
      else assert(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1);
    }
  }
  const pkg = JSON.parse(await readFile(path.join(root, 'node_modules/wrangler/package.json'), 'utf8'));
  assert.equal(pkg.version, '4.161.0', 'Use the exact reviewed Wrangler version');
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    await validateCloudflareConfig();
    console.log('Wrangler 4.161.0 schema and static-assets checks passed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
