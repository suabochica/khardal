import {
  COMMERCE_PROVIDER,
  WOOCOMMERCE_URL,
  WOOCOMMERCE_CONSUMER_KEY,
  WOOCOMMERCE_CONSUMER_SECRET,
  SHOPIFY_STORE_DOMAIN,
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
} from 'astro:env/server';
import { parseCommerceConfig } from './commerce';

// astro:env/server prevents this module from being imported into a client bundle.
export const commerceConfig = parseCommerceConfig({
  COMMERCE_PROVIDER,
  WOOCOMMERCE_URL,
  WOOCOMMERCE_CONSUMER_KEY,
  WOOCOMMERCE_CONSUMER_SECRET,
  SHOPIFY_STORE_DOMAIN,
  SHOPIFY_STOREFRONT_PRIVATE_TOKEN,
});
