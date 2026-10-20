import { expect, test } from '@playwright/test';

test('design foundation loads local fonts and fits phone, tablet and desktop', async ({
  page,
}) => {
  const failedFonts: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('.woff')) failedFonts.push(request.url());
  });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/dev/design');
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('body')).toHaveCSS(
      'background-color',
      'rgb(252, 249, 246)',
    );
    await expect(page.locator('body')).toHaveCSS('font-size', '16px');
    expect(
      await page.evaluate(
        () =>
          document.fonts.check('16px Inter') &&
          document.fonts.check('32px Metrophobic'),
      ),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(failedFonts).toEqual([]);
});
