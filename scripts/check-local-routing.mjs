import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const origin = new URL(process.env.SPACYES_LOCAL_ORIGIN ?? 'http://127.0.0.1:8797');
assert.equal(origin.protocol, 'http:');
assert(['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname),
  'Routing checks must never target production or another remote host');
assert.equal(origin.pathname, '/');
assert(!origin.username && !origin.password && !origin.search && !origin.hash);
const manifest = JSON.parse(await readFile(path.join(root, 'scripts/public-assets.json'), 'utf8'));
let checks = 0;

async function responseFor(route) {
  const url = new URL(route, origin);
  assert.equal(url.origin, origin.origin);
  checks++;
  return fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
}

async function asset(route, file) {
  const response = await responseFor(route);
  assert.equal(response.status, 200, route);
  const bytes = Buffer.from(await response.arrayBuffer());
  assert(bytes.equals(await readFile(path.join(root, 'public', file))), route);
  const type = response.headers.get('content-type') ?? '';
  if (file.endsWith('.html')) assert.match(type, /^text\/html\b/, route);
  if (file.endsWith('.css')) assert.match(type, /^text\/css\b/, route);
  if (file.endsWith('.js')) assert.match(type, /(?:text|application)\/javascript\b/, route);
  if (/\.(?:jpg|webp|png|ico)$/.test(file)) assert.match(type, /^image\//, route);
}

async function redirect(route, expected) {
  const response = await responseFor(route);
  assert.equal(response.status, 307, route);
  const target = new URL(response.headers.get('location'), origin);
  assert.equal(target.origin, origin.origin, route);
  assert.equal(target.pathname + target.search, expected, route);
}

for (const file of manifest) {
  const route = `/${file.replace(/index\.html$/, '').replace(/\.html$/, '')}`;
  await asset(route, file);
  if (file.endsWith('.html')) await redirect(`/${file}`, route);
}
await redirect('/blog', '/blog/');
await redirect('/branches/kandivali-west/', '/branches/kandivali-west');
await redirect('/branches/kandivali-west.html?qa=1', '/branches/kandivali-west?qa=1');
await asset(new URL('../style.css', new URL('/blog/article', origin)).pathname, 'style.css');
await asset(new URL('../images/spacyes-kandivali-west-1.jpg',
  new URL('/branches/kandivali-west', origin)).pathname, 'images/spacyes-kandivali-west-1.jpg');
for (const route of [
  '/missing-local-qa', '/blog/missing-local-qa', '/CNAME', '/CHANGELOG.md',
  '/.gitattributes', '/.git/config', '/wrangler.jsonc', '/package.json',
  '/package-lock.json', '/scripts/stage-public-assets.mjs',
  '/docs/cloudflare-configuration-release-plan.md',
]) {
  const response = await responseFor(route);
  assert.equal(response.status, 404, route);
  assert.equal((await response.arrayBuffer()).byteLength, 0, `Expected unchanged empty 404: ${route}`);
}
console.log(`PASS ${checks} loopback-only routing/byte/MIME checks; no production routing was inferred.`);
