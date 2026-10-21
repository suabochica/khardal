import { readFile, writeFile, chmod } from 'node:fs/promises';

const file = new URL('../../.env', import.meta.url);
const key = process.env.WC_API_CONSUMER_KEY;
const secret = process.env.WC_API_CONSUMER_SECRET;
if (!key || !secret) throw new Error('Run woo:init and woo:setup first.');
const values = {
  COMMERCE_PROVIDER: 'woocommerce',
  WOOCOMMERCE_URL: `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`,
  WOOCOMMERCE_CONSUMER_KEY: key,
  WOOCOMMERCE_CONSUMER_SECRET: secret,
};
for (const value of Object.values(values))
  if (value.includes('\n') || value.includes('\r'))
    throw new Error('Invalid local commerce setting.');
let original;
try {
  original = await readFile(file, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  original = '# Local Astro runtime; private commerce settings.\n';
}
const seen = new Set();
const lines = original
  .trimEnd()
  .split(/\r?\n/)
  .map((line) => {
    const name = line.match(/^\s*(?:export\s+)?([A-Z_]+)\s*=/)?.[1];
    if (!Object.hasOwn(values, name)) return line;
    seen.add(name);
    return `${name}=${JSON.stringify(values[name])}`;
  });
for (const [name, value] of Object.entries(values))
  if (!seen.has(name)) lines.push(`${name}=${JSON.stringify(value)}`);
await writeFile(file, lines.join('\n') + '\n', { mode: 0o600 });
await chmod(file, 0o600);
console.log(
  'Configured ignored .env for local WooCommerce; other settings preserved. No credentials printed. Restart Astro to apply.',
);
