import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { resolve, join } from 'node:path';
import { pipeline } from 'node:stream/promises';

export async function withRestoredStore(directory, run) {
  const backup = resolve(directory);
  const envFile = join(backup, 'local-environment.env');
  const verified = spawnSync(
    process.execPath,
    ['scripts/woocommerce/backup-verify.mjs', backup],
    { encoding: 'utf8' },
  );
  if (verified.status !== 0)
    throw new Error('Backup integrity verification failed.');
  const credentials = parseEnv(await readFile(envFile, 'utf8'));
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const project = `khardal-rehearsal-${randomBytes(6).toString('hex')}`;
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('WC_')),
  );
  environment.WC_PORT = String(port);
  const prefix = ['compose', '-p', project, '--env-file', envFile];
  function command(args) {
    const r = spawnSync('docker', [...prefix, ...args], {
      env: environment,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (r.status !== 0)
      throw new Error(`Rehearsal Docker command failed: ${r.stderr}`);
    return r.stdout;
  }
  async function restore(name, args) {
    const child = spawn('docker', [...prefix, ...args], {
      env: environment,
      stdio: ['pipe', 'ignore', 'pipe'],
    });
    let error = '';
    child.stderr.on('data', (d) => (error += d));
    const done = once(child, 'exit');
    await pipeline(
      createReadStream(join(backup, name)),
      createGunzip(),
      child.stdin,
    );
    const [code] = await done;
    if (code !== 0) throw new Error(`Restore failed: ${error}`);
  }
  try {
    command(['up', '-d', '--wait', 'db']);
    await restore('database.sql.gz', [
      'exec',
      '-T',
      'db',
      'sh',
      '-c',
      'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb --user=root',
    ]);
    await restore('wordpress.tar.gz', [
      'run',
      '--rm',
      '--no-deps',
      '-T',
      '--user',
      '0:0',
      '--entrypoint',
      'sh',
      'setup',
      '-c',
      'tar -xf - -C /var/www/html && chown -R 33:33 /var/www/html',
    ]);
    command(['up', '-d', '--wait', 'wordpress']);
    const check = spawnSync(
      process.execPath,
      [`--env-file=${envFile}`, 'scripts/woocommerce/check.mjs'],
      { env: environment, encoding: 'utf8', timeout: 30000 },
    );
    if (check.status !== 0)
      throw new Error(`Restored admin/API check failed: ${check.stderr}`);
    const cli = (php) =>
      command([
        'run',
        '--rm',
        '-T',
        '--entrypoint',
        'wp',
        'setup',
        'eval',
        php,
      ]);
    return await run({
      base: `http://127.0.0.1:${port}`,
      credentials,
      project,
      cli,
    });
  } finally {
    // Only this invocation's random, newly created project and copied volumes.
    command(['--profile', 'tools', 'down', '--volumes']);
  }
}
