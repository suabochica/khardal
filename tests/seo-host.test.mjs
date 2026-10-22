import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { once } from 'node:events';

test(
  'production artifact indexes only its configured host and excludes sample/private URLs',
  { timeout: 60000 },
  async () => {
    const site = 'https://shop.example.test';
    const build = spawnSync('pnpm', ['build'], {
      env: {
        ...process.env,
        DEPLOYMENT_ENV: 'production',
        STOREFRONT_ORIGIN: site,
        COMMERCE_PROVIDER: 'mock',
      },
      encoding: 'utf8',
    });
    assert.equal(build.status, 0, build.stderr);
    const socket = createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise((r) => socket.close(r));
    const server = spawn(process.execPath, ['dist/server/entry.mjs'], {
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(port),
        COMMERCE_PROVIDER: 'mock',
      },
      stdio: 'ignore',
    });
    const base = `http://127.0.0.1:${port}`;
    const headers = {
      'X-Forwarded-Host': 'shop.example.test',
      'X-Forwarded-Proto': 'https',
    };
    try {
      let ready = false;
      for (let n = 0; n < 100; n++) {
        try {
          if ((await fetch(`${base}/api/health`)).ok) {
            ready = true;
            break;
          }
        } catch {
          /* startup */
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(ready);
      const wrong = await fetch(`${base}/contacto`);
      assert.equal(wrong.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(
        await wrong.text(),
        /name="robots" content="noindex, nofollow"/,
      );
      const good = await fetch(`${base}/contacto`, { headers });
      const html = await good.text();
      assert.equal(good.status, 200);
      assert.equal(good.headers.get('x-robots-tag'), null);
      assert.ok(!html.includes('name="robots" content="noindex'));
      assert.match(
        html,
        /rel="canonical" href="https:\/\/shop.example.test\/contacto"/,
      );
      assert.match(
        html,
        /property="og:image" content="https:\/\/shop.example.test\/social-preview.png"/,
      );
      const sample = await (
        await fetch(`${base}/perfumes/brisa-bergamota`, { headers })
      ).text();
      assert.match(sample, /name="robots" content="noindex, nofollow"/);
      assert.ok(!sample.includes('"@type":"Product"'));
      const robots = await (
        await fetch(`${base}/robots.txt`, { headers })
      ).text();
      assert.match(robots, /Sitemap: https:\/\/shop.example.test\/sitemap.xml/);
      const sitemap = await (
        await fetch(`${base}/sitemap.xml`, { headers })
      ).text();
      assert.match(sitemap, /https:\/\/shop.example.test\/contacto/);
      assert.ok(
        !sitemap.includes('/perfumes/') &&
          !sitemap.includes('/carrito') &&
          !sitemap.includes('/politicas/'),
      );
      const missing = await fetch(`${base}/products/khamrah`, {
        headers,
        redirect: 'manual',
      });
      assert.equal(missing.status, 404);
      const existing = await fetch(`${base}/products/brisa-bergamota`, {
        headers,
        redirect: 'manual',
      });
      assert.equal(existing.status, 301);
      assert.equal(
        existing.headers.get('location'),
        '/perfumes/brisa-bergamota',
      );
      assert.equal(
        (await fetch(`${base}/social-preview.png`)).headers.get('content-type'),
        'image/png',
      );
    } finally {
      if (server.exitCode === null) {
        const exited = once(server, 'exit');
        server.kill('SIGTERM');
        await exited;
      }
      const restored = spawnSync('pnpm', ['build'], {
        env: process.env,
        encoding: 'utf8',
      });
      assert.equal(restored.status, 0, restored.stderr);
    }
  },
);
