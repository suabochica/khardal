import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';
import { chromium } from '@playwright/test';

export async function withStorefront(run) {
  const socket = createServer();
  socket.listen(0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((r) => socket.close(r));
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
    env: {
      ...process.env,
      HOST: '127.0.0.1',
      PORT: String(port),
      COMMERCE_PROVIDER: 'woocommerce',
      WOOCOMMERCE_URL: `http://127.0.0.1:${process.env.WC_PORT ?? '8000'}`,
      WOOCOMMERCE_CONSUMER_KEY: process.env.WC_API_CONSUMER_KEY,
      WOOCOMMERCE_CONSUMER_SECRET: process.env.WC_API_CONSUMER_SECRET,
    },
    stdio: 'ignore',
  });
  let browser;
  try {
    let ready = false;
    for (let n = 0; n < 100; n++) {
      try {
        if (
          (
            await fetch(`${base}/api/health`, {
              signal: AbortSignal.timeout(1000),
            })
          ).ok
        ) {
          ready = true;
          break;
        }
      } catch {
        /* startup */
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!ready) throw new Error('Compiled storefront did not start.');
    browser = await chromium.launch();
    return await run({ base, browser });
  } finally {
    await browser?.close();
    if (server.exitCode === null) {
      const done = once(server, 'exit');
      server.kill('SIGTERM');
      await done;
    }
  }
}
