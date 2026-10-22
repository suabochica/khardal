import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import tailwindcss from '@tailwindcss/vite';
import { storefrontDomains } from './storefront-origin.mjs';
import { mediaPatterns } from './media-origin.mjs';

const serverSecret = { context: 'server', access: 'secret', optional: true };

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: { plugins: [tailwindcss()] },
  image: { remotePatterns: mediaPatterns(process.env.WOO_MEDIA_ORIGIN) },
  security: {
    allowedDomains: storefrontDomains(
      process.env.STOREFRONT_ORIGIN ?? process.env.RENDER_EXTERNAL_URL,
    ),
  },
  env: {
    schema: {
      DEPLOYMENT_ENV: envField.enum({
        context: 'server',
        access: 'public',
        values: ['development', 'preview', 'production'],
        default: 'development',
      }),
      COMMERCE_PROVIDER: envField.string(serverSecret),
      WOOCOMMERCE_URL: envField.string(serverSecret),
      WOOCOMMERCE_CONSUMER_KEY: envField.string(serverSecret),
      WOOCOMMERCE_CONSUMER_SECRET: envField.string(serverSecret),
      SHOPIFY_STORE_DOMAIN: envField.string(serverSecret),
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: envField.string(serverSecret),
    },
  },
});
