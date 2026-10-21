import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

const secret = () => randomBytes(32).toString('hex');
const file = new URL('../../.env.woocommerce', import.meta.url);
try {
  await writeFile(
    file,
    [
      '# Generated local-only credentials. Keep this file out of Git.',
      'WC_PORT=8000',
      `WC_DB_ROOT_PASSWORD=${secret()}`,
      `WC_DB_PASSWORD=${secret()}`,
      'WC_ADMIN_USER=khardal_local',
      `WC_ADMIN_PASSWORD=${secret()}`,
      'WC_ADMIN_EMAIL=admin@khardal.test',
      `WC_API_CONSUMER_KEY=ck_${secret().slice(0, 40)}`,
      `WC_API_CONSUMER_SECRET=cs_${secret().slice(0, 40)}`,
      '',
    ].join('\n'),
    { flag: 'wx', mode: 0o600 },
  );
  console.log(
    'Created .env.woocommerce with local credentials (0600). No values printed.',
  );
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('.env.woocommerce already exists; preserved without changes.');
}
