import fs from 'fs';
import path from 'path';

const pkgPath = path.resolve(process.cwd(), 'package.json');
const raw = fs.readFileSync(pkgPath, 'utf8');
const pkg = JSON.parse(raw);

if (typeof pkg.version !== 'string') {
  throw new Error('package.json version is missing or invalid');
}

const match = pkg.version.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  throw new Error(`Unsupported version format: ${pkg.version}`);
}

const major = Number(match[1]);
const minor = Number(match[2]);
const patch = Number(match[3]) + 1;
pkg.version = `${major}.${minor}.${patch}`;

fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
console.log(`Bumped version: ${match[1]}.${match[2]}.${match[3]} -> ${pkg.version}`);
