import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { stagePublicAssets, validateManifest, verifyPublicAssets } from './stage-public-assets.mjs';

const repo = fileURLToPath(new URL('../', import.meta.url));
const fixtureManifest = ['index.html', 'style.css', 'blog/index.html', 'images/example.jpg'];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function fixture(t, manifest = fixtureManifest) {
  const root = await mkdtemp(path.join(tmpdir(), 'spacyes-staging-test-'));
  t.after(async () => {
    // Recursive test-fixture cleanup is limited to this unique temporary root.
    const resolved = await realpath(root);
    assert.equal(path.dirname(resolved), await realpath(tmpdir()));
    assert(path.basename(resolved).startsWith('spacyes-staging-test-'));
    await rm(resolved, { recursive: true });
  });
  await mkdir(path.join(root, 'scripts'));
  await writeFile(path.join(root, 'scripts/public-assets.json'), JSON.stringify(manifest));
  for (const entry of fixtureManifest) {
    await mkdir(path.dirname(path.join(root, entry)), { recursive: true });
    await writeFile(path.join(root, entry), entry.endsWith('.jpg')
      ? Buffer.from([0, 255, 1, 128, 13, 10, 0]) : `Original ${entry}\r\n`);
  }
  return root;
}

async function linkOrSkip(t, target, link, type) {
  try {
    await symlink(target, link, type);
    return true;
  } catch (error) {
    if (!['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) throw error;
    t.skip(`OS denied creating a ${type} symlink: ${error.code}`);
    return false;
  }
}

async function relativeFiles(root, directory = root) {
  const files = [];
  for (const name of await readdir(directory)) {
    const absolute = path.join(directory, name);
    const stat = await lstat(absolute);
    assert(!stat.isSymbolicLink());
    if (stat.isDirectory()) files.push(...await relativeFiles(root, absolute));
    else files.push(path.relative(root, absolute).split(path.sep).join('/'));
  }
  return files.sort();
}

test('manifest has exactly the 46 public files from the clean main baseline', async () => {
  const manifest = JSON.parse(await readFile(path.join(repo, 'scripts/public-assets.json'), 'utf8'));
  assert.equal(manifest.length, 46);
  assert.deepEqual(validateManifest(manifest), manifest);
  const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: repo, encoding: 'utf8' }).trim();
  const tracked = execFileSync('git', ['ls-tree', '-r', '--name-only', base], { cwd: repo, encoding: 'utf8' }).trim().split('\n');
  const publicNames = tracked.filter(name => {
    try { validateManifest([name]); return true; } catch { return false; }
  });
  assert.deepEqual([...manifest].sort(), publicNames.sort());
  for (const excluded of ['.gitattributes', 'CHANGELOG.md', 'CNAME']) assert(!manifest.includes(excluded));
});

for (const entry of [
  '/index.html', 'C:/index.html', 'C:\\index.html', '\\\\server\\share\\index.html',
  '../index.html', 'blog/../../index.html', 'blog/../index.html', './index.html',
  'blog//index.html', 'blog\\index.html', 'index.html\0', 'index.html:stream',
  '.git/config', '.env', '.gitattributes', 'CHANGELOG.md', 'CNAME', 'wrangler.jsonc',
  'scripts/private.html', 'node_modules/index.html', 'public/index.html',
  'credentials.json', 'blog/.secret.html', 'blog/%2e%2e/index.html',
]) {
  test(`reject unsafe/non-public path: ${JSON.stringify(entry)}`, () => {
    assert.throws(() => validateManifest(['index.html', entry]));
  });
}

test('reject duplicate paths and invalid manifest shapes', () => {
  assert.throws(() => validateManifest(['index.html', 'index.html']), /Duplicate/);
  for (const value of [null, {}, [], [''], [12]]) assert.throws(() => validateManifest(value));
  assert.throws(() => validateManifest(['index.html', 'INDEX.HTML']));
});

test('copy only listed files, preserve hierarchy/binary bytes and leave all sources unchanged', async t => {
  const root = await fixture(t);
  const excluded = ['.env', '.gitattributes', 'CHANGELOG.md', 'CNAME', 'wrangler.jsonc', '.git/config', 'scripts/private.html'];
  for (const entry of excluded) {
    await mkdir(path.dirname(path.join(root, entry)), { recursive: true });
    await writeFile(path.join(root, entry), 'DO NOT PUBLISH');
  }
  const before = new Map(await Promise.all([...fixtureManifest, ...excluded].map(async entry =>
    [entry, digest(await readFile(path.join(root, entry)))])));
  assert.equal((await stagePublicAssets(root)).files, fixtureManifest.length);
  assert.deepEqual(await relativeFiles(path.join(root, 'public')), [...fixtureManifest].sort());
  for (const [entry, hash] of before) assert.equal(digest(await readFile(path.join(root, entry))), hash);
  for (const entry of fixtureManifest) assert.equal(digest(await readFile(path.join(root, 'public', entry))), before.get(entry));
});

test('reruns remove stale output only inside generated public/', async t => {
  const root = await fixture(t);
  await stagePublicAssets(root);
  await mkdir(path.join(root, 'public/stale/nested'), { recursive: true });
  await writeFile(path.join(root, 'public/stale/nested/old.txt'), 'stale');
  await mkdir(path.join(root, 'public-backup'));
  await writeFile(path.join(root, 'public-backup/keep.txt'), 'keep');
  await stagePublicAssets(root);
  assert.deepEqual(await relativeFiles(path.join(root, 'public')), [...fixtureManifest].sort());
  assert.equal(await readFile(path.join(root, 'public-backup/keep.txt'), 'utf8'), 'keep');
});

test('missing input fails before deleting previous generated output', async t => {
  const root = await fixture(t, [...fixtureManifest, 'blog/missing.html']);
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public/previous.txt'), 'keep until valid');
  await assert.rejects(stagePublicAssets(root), /ENOENT/);
  assert.equal(await readFile(path.join(root, 'public/previous.txt'), 'utf8'), 'keep until valid');
});

test('malformed manifest fails before deleting previous output', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public/keep.txt'), 'keep');
  await writeFile(path.join(root, 'scripts/public-assets.json'), '{invalid');
  await assert.rejects(stagePublicAssets(root), SyntaxError);
  assert.equal(await readFile(path.join(root, 'public/keep.txt'), 'utf8'), 'keep');
});

test('reject symlink/junction in source parent directories', async t => {
  const root = await fixture(t);
  await rename(path.join(root, 'blog'), path.join(root, 'other-blog'));
  if (!await linkOrSkip(t, path.join(root, 'other-blog'), path.join(root, 'blog'), 'junction')) return;
  await assert.rejects(stagePublicAssets(root), /Symlink source/);
  await assert.rejects(lstat(path.join(root, 'public')), /ENOENT/);
});

test('reject a directory in place of an allowlisted source file', async t => {
  const root = await fixture(t);
  await rename(path.join(root, 'index.html'), path.join(root, 'original.html'));
  await mkdir(path.join(root, 'index.html'));
  await assert.rejects(stagePublicAssets(root), /regular file/);
  await assert.rejects(lstat(path.join(root, 'public')), /ENOENT/);
});

test('reject a symlink/junction project root', async t => {
  const root = await fixture(t);
  const actual = path.join(root, 'actual');
  await mkdir(actual);
  if (!await linkOrSkip(t, actual, path.join(root, 'linked-root'), 'junction')) return;
  await assert.rejects(stagePublicAssets(path.join(root, 'linked-root')), /real directory/);
});

test('reject symlink source files', async t => {
  const root = await fixture(t);
  await rename(path.join(root, 'index.html'), path.join(root, 'original.html'));
  if (!await linkOrSkip(t, path.join(root, 'original.html'), path.join(root, 'index.html'), 'file')) return;
  await assert.rejects(stagePublicAssets(root), /Symlink source/);
});

test('reject symlink manifest', async t => {
  const root = await fixture(t);
  await rename(path.join(root, 'scripts/public-assets.json'), path.join(root, 'manifest.json'));
  if (!await linkOrSkip(t, path.join(root, 'manifest.json'), path.join(root, 'scripts/public-assets.json'), 'file')) return;
  await assert.rejects(stagePublicAssets(root), /Symlink source/);
});

test('reject output directory symlink/junction without deleting its target', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'keep'));
  await writeFile(path.join(root, 'keep/sentinel.txt'), 'safe');
  if (!await linkOrSkip(t, path.join(root, 'keep'), path.join(root, 'public'), 'junction')) return;
  await assert.rejects(stagePublicAssets(root), /Symlink output/);
  assert.equal(await readFile(path.join(root, 'keep/sentinel.txt'), 'utf8'), 'safe');
});

test('reject nested output junction before deleting any previous output', async t => {
  const root = await fixture(t);
  await stagePublicAssets(root);
  await mkdir(path.join(root, 'keep'));
  await writeFile(path.join(root, 'keep/sentinel.txt'), 'safe');
  if (!await linkOrSkip(t, path.join(root, 'keep'), path.join(root, 'public/linked'), 'junction')) return;
  await assert.rejects(stagePublicAssets(root), /Symlink output/);
  assert.equal(await readFile(path.join(root, 'keep/sentinel.txt'), 'utf8'), 'safe');
  assert.equal(digest(await readFile(path.join(root, 'public/index.html'))), digest(await readFile(path.join(root, 'index.html'))));
});

test('reject a file named public without deleting it', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'public'), 'not disposable');
  await assert.rejects(stagePublicAssets(root), /real directory/);
  assert.equal(await readFile(path.join(root, 'public'), 'utf8'), 'not disposable');
});

for (const change of ['extra file', 'missing file', 'changed bytes', 'extra directory']) {
  test(`verification fails on ${change}`, async t => {
    const root = await fixture(t);
    await stagePublicAssets(root);
    if (change === 'extra file') await writeFile(path.join(root, 'public/secret.txt'), 'unexpected');
    if (change === 'missing file') await rm(path.join(root, 'public/index.html'));
    if (change === 'changed bytes') await writeFile(path.join(root, 'public/style.css'), 'tampered');
    if (change === 'extra directory') await mkdir(path.join(root, 'public/empty'));
    await assert.rejects(verifyPublicAssets(root), /differs|differ/);
  });
}

test('CLI stages a clean main archive from another working directory without changing website sources', async t => {
  const root = await fixture(t);
  const checkout = path.join(root, 'checkout');
  await mkdir(checkout);
  const base = execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: repo, encoding: 'utf8' }).trim();
  const archive = execFileSync('git', ['archive', '--format=tar', base], { cwd: repo, maxBuffer: 30000000 });
  execFileSync('tar', ['-xf', '-', '-C', checkout], { input: archive });
  const originals = await relativeFiles(checkout);
  const before = new Map(await Promise.all(originals.map(async entry => [entry, digest(await readFile(path.join(checkout, entry)))])));
  await mkdir(path.join(checkout, 'scripts'), { recursive: true });
  for (const file of ['stage-public-assets.mjs', 'public-assets.json']) {
    await copyFile(path.join(repo, 'scripts', file), path.join(checkout, 'scripts', file));
  }
  const script = path.join(checkout, 'scripts/stage-public-assets.mjs');
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /46 public files/);
  const expected = JSON.parse(await readFile(path.join(repo, 'scripts/public-assets.json'), 'utf8'));
  assert.deepEqual(await relativeFiles(path.join(checkout, 'public')), expected.sort());
  for (const [entry, hash] of before) assert.equal(digest(await readFile(path.join(checkout, entry))), hash, entry);
  for (const entry of expected) assert.equal(digest(await readFile(path.join(checkout, 'public', entry))), before.get(entry));
  const badArgs = spawnSync(process.execPath, [script, '--output', root], { cwd: root, encoding: 'utf8' });
  assert.equal(badArgs.status, 1);
  assert.match(badArgs.stderr, /No arguments accepted/);
});
