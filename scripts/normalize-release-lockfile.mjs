/**
 * Make an exported lockfile portable to external CI without changing versions.
 * This does not change Replit's package registry or download/install packages.
 * Generate the lockfile with no node_modules present before running this.
 */
import fs from 'node:fs';

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node normalize-release-lockfile.mjs path/to/package-lock.json');
const lock = JSON.parse(fs.readFileSync(filename, 'utf8'));
let rewritten = 0;
for (const [name, entry] of Object.entries(lock.packages ?? {})) {
  if (entry.link) throw new Error(`Local dependency link in release lockfile: ${name}`);
  if (!entry.resolved) continue;
  const url = new URL(entry.resolved);
  if (url.hostname === 'package-firewall.replit.internal') {
    if (!url.pathname.startsWith('/npm/') || !entry.integrity) {
      throw new Error(`Unexpected package resolution or missing integrity: ${name}`);
    }
    entry.resolved = 'https://registry.npmjs.org/' + url.pathname.slice('/npm/'.length);
    rewritten++;
  } else if (url.origin !== 'https://registry.npmjs.org') {
    throw new Error(`Non-portable dependency origin: ${name}`);
  }
}
fs.writeFileSync(filename, JSON.stringify(lock, null, 2) + '\n');
console.log(`Normalized ${rewritten} tarball URLs; locked versions and integrity hashes preserved.`);
