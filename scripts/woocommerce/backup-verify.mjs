import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import { createGunzip } from 'node:zlib';
import { resolve, join } from 'node:path';

assert.ok(process.argv[2], 'Pass the backup directory.');
const directory = resolve(process.argv[2]);
const names = [
  'database.sql.gz',
  'wordpress.tar.gz',
  'local-environment.env',
  'images.txt',
];
const manifest = (await readFile(join(directory, 'SHA256SUMS'), 'utf8'))
  .trim()
  .split('\n');
assert.equal(manifest.length, names.length);
for (const name of names) {
  const entry = manifest.find((line) => line.endsWith(`  ${name}`));
  assert.ok(
    entry && /^[a-f0-9]{64} {2}/.test(entry),
    'Missing/invalid checksum entry.',
  );
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(join(directory, name)))
    hash.update(chunk);
  assert.equal(
    hash.digest('hex'),
    entry.slice(0, 64),
    `Checksum mismatch: ${name}`,
  );
  if (name.endsWith('.gz'))
    for await (const chunk of createReadStream(join(directory, name)).pipe(
      createGunzip(),
    )) {
      void chunk;
    }
}
console.log(
  'PASS: backup checksums and gzip integrity; no database or credential contents printed.',
);
