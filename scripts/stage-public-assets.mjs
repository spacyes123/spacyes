import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, realpath, rmdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const rootFiles = new Set([
  '404.html', 'about.html', 'coworking.html', 'favicon.ico', 'franchise.html',
  'index.html', 'library.html', 'llms.txt', 'main.js', 'managed-office.html',
  'robots.txt', 'rules.html', 'sitemap.xml', 'spacyes-logo.png', 'style.css',
  'success-stories.html',
]);

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..'
    && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

export function validateManifest(manifest) {
  requireCondition(Array.isArray(manifest) && manifest.length > 0,
    'Manifest must be a non-empty array of relative file paths');
  const seen = new Set();
  for (const entry of manifest) {
    requireCondition(typeof entry === 'string' && entry.length > 0,
      'Manifest entries must be non-empty strings');
    requireCondition(!path.posix.isAbsolute(entry) && !path.win32.isAbsolute(entry)
      && !/[\\:\x00-\x1f\x7f]/.test(entry), `Unsafe path: ${entry}`);
    requireCondition(entry.split('/').every(part => part && part !== '.'
      && part !== '..' && !part.startsWith('.')), `Unsafe path: ${entry}`);
    // The manifest selects files; this separate publication policy excludes code,
    // configuration, hidden files, credentials and arbitrary repository folders.
    const publicFile = rootFiles.has(entry)
      || /^(?:blog|branches)\/[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(entry)
      || /^images\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|webp)$/.test(entry);
    requireCondition(publicFile, `Not an approved public file type/location: ${entry}`);
    const key = entry.toLowerCase();
    requireCondition(!seen.has(key), `Duplicate manifest path: ${entry}`);
    seen.add(key);
  }
  return [...manifest];
}

async function checkedRoot(rootDirectory) {
  requireCondition(path.isAbsolute(rootDirectory), 'Project root must be absolute');
  const stat = await lstat(rootDirectory);
  requireCondition(!stat.isSymbolicLink() && stat.isDirectory(),
    'Project root must be a real directory, not a symlink');
  return realpath(rootDirectory);
}

async function checkedSource(root, relative) {
  const parts = relative.split('/');
  let current = root;
  let stat;
  for (let i = 0; i < parts.length; i++) {
    current = path.join(current, parts[i]);
    requireCondition(inside(root, current), `Source escapes project: ${relative}`);
    stat = await lstat(current);
    requireCondition(!stat.isSymbolicLink(), `Symlink source rejected: ${relative}`);
    requireCondition(i === parts.length - 1 ? stat.isFile() : stat.isDirectory(),
      `Source must be a regular file with real parent directories: ${relative}`);
  }
  requireCondition(await realpath(current) === current, `Source path changed: ${relative}`);
  // O_NOFOLLOW also rejects a leaf swapped to a symlink where the OS supports it.
  const handle = await open(current, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const opened = await handle.stat();
    requireCondition(opened.isFile() && opened.ino === stat.ino && opened.dev === stat.dev,
      `Source changed while opening: ${relative}`);
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

async function inputs(root) {
  const manifestBytes = await checkedSource(root, 'scripts/public-assets.json');
  const manifest = validateManifest(JSON.parse(manifestBytes.toString('utf8')));
  const sources = new Map();
  // Validate and read every input before touching any previous generated output.
  for (const entry of manifest) sources.set(entry, await checkedSource(root, entry));
  return sources;
}

function outputPath(root) {
  const output = path.join(root, 'public');
  requireCondition(inside(root, output) && path.dirname(output) === root
    && path.basename(output) === 'public', 'Refusing unsafe output directory');
  return output;
}

async function inventory(output) {
  const files = [];
  const directories = [];
  const visit = async current => {
    requireCondition(current === output || inside(output, current), 'Output escapes public/');
    const stat = await lstat(current);
    requireCondition(!stat.isSymbolicLink(), `Symlink output rejected: ${current}`);
    if (stat.isDirectory()) {
      directories.push(current);
      for (const name of await readdir(current)) await visit(path.join(current, name));
    } else {
      requireCondition(current !== output && stat.isFile(),
        `Output must contain only regular files/directories: ${current}`);
      files.push(current);
    }
  };
  let outputStat;
  try {
    outputStat = await lstat(output);
  } catch (error) {
    if (error.code === 'ENOENT') return { files, directories };
    throw error;
  }
  // A public file or junction is never treated as a disposable generated tree.
  requireCondition(!outputStat.isSymbolicLink(), `Symlink output rejected: ${output}`);
  requireCondition(outputStat.isDirectory(), 'public/ must be a real directory');
  await visit(output);
  return { files, directories };
}

async function clearOutput(output) {
  const { files, directories } = await inventory(output);
  // No recursive remove/copy API: inspect the entire tree before deleting any
  // entry, then unlink files and remove empty directories, all within public/.
  for (const file of files) {
    const parent = await realpath(path.dirname(file));
    requireCondition(parent === output || inside(output, parent),
      `Output parent changed: ${file}`);
    await unlink(file);
  }
  for (const directory of directories.reverse()) {
    const stat = await lstat(directory);
    requireCondition(!stat.isSymbolicLink() && stat.isDirectory(),
      `Output directory changed: ${directory}`);
    await rmdir(directory);
  }
}

async function verify(root, sources) {
  const output = outputPath(root);
  const { files, directories } = await inventory(output);
  const actual = files.map(file => path.relative(output, file).split(path.sep).join('/')).sort();
  const expected = [...sources.keys()].sort();
  requireCondition(JSON.stringify(actual) === JSON.stringify(expected),
    'Staged file list differs from manifest');
  const expectedDirectories = new Set(['']);
  for (const entry of expected) {
    let parent = path.posix.dirname(entry);
    while (parent !== '.') {
      expectedDirectories.add(parent);
      parent = path.posix.dirname(parent);
    }
  }
  const actualDirectories = directories.map(dir => path.relative(output, dir)
    .split(path.sep).join('/')).sort();
  requireCondition(JSON.stringify(actualDirectories) === JSON.stringify([...expectedDirectories].sort()),
    'Staged directory hierarchy differs from manifest');
  for (const [entry, bytes] of sources) {
    const staged = await checkedSource(root, `public/${entry}`);
    requireCondition(staged.equals(bytes), `Staged bytes differ from source: ${entry}`);
  }
  return { files: expected.length, bytes: [...sources.values()].reduce((sum, b) => sum + b.length, 0) };
}

export async function verifyPublicAssets(rootDirectory = projectRoot) {
  const root = await checkedRoot(rootDirectory);
  return verify(root, await inputs(root));
}

export async function stagePublicAssets(rootDirectory = projectRoot) {
  const root = await checkedRoot(rootDirectory);
  const sources = await inputs(root);
  const output = outputPath(root);
  await clearOutput(output);
  await mkdir(output);
  for (const [entry, bytes] of sources) {
    const parts = entry.split('/');
    let directory = output;
    for (const part of parts.slice(0, -1)) {
      directory = path.join(directory, part);
      try {
        await mkdir(directory);
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
      }
      const stat = await lstat(directory);
      requireCondition(!stat.isSymbolicLink() && stat.isDirectory(),
        `Unsafe output parent: ${directory}`);
    }
    requireCondition(await realpath(directory) === directory, 'Output directory changed');
    await writeFile(path.join(output, ...parts), bytes, { flag: 'wx' });
  }
  // Reread inputs too: source edits during staging must not yield success.
  return verifyPublicAssets(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCondition(process.argv.length === 2, 'No arguments accepted; output is always this project\'s public/');
    const result = await stagePublicAssets();
    console.log(`Staged and verified ${result.files} public files (${result.bytes} bytes).`);
  } catch (error) {
    console.error(`Static asset staging failed: ${error.message}`);
    process.exitCode = 1;
  }
}
