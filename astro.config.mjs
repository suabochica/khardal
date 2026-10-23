import { defineConfig, envField } from 'astro/config';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { storefrontDomains } from './storefront-origin.mjs';
import { mediaPatterns } from './media-origin.mjs';
import { deploymentSettings } from './deployment.mjs';

const serverSecret = { context: 'server', access: 'secret', optional: true };
const deployment = deploymentSettings();

export default defineConfig({
  site: deployment.site,
  output: 'server',
  adapter:
    deployment.target === 'vercel'
      ? vercel({ maxDuration: 30, isr: false, imageService: false })
      : node({ mode: 'standalone' }),
  vite: { plugins: [tailwindcss()] },
  image: { remotePatterns: mediaPatterns(process.env.WOO_MEDIA_ORIGIN) },
  security: {
    allowedDomains: deployment.requestOrigins.length
      ? deployment.requestOrigins.flatMap((origin) => storefrontDomains(origin))
      : storefrontDomains(),
  },
  env: {
    schema: {
      DEPLOYMENT_ENV: envField.enum({
        context: 'server',
        access: 'public',
        values: ['development', 'preview', 'production'],
        default: deployment.target === 'vercel' ? 'preview' : 'development',
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
