import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/ui',
  use: { baseURL: 'http://127.0.0.1:4330', browserName: 'chromium' },
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4330 --ignore-lock',
    url: 'http://127.0.0.1:4330/dev/design',
    reuseExistingServer: false,
  },
});
