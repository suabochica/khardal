export type CommerceConfig =
  | { provider: 'mock' }
  | {
      provider: 'woocommerce';
      url: string;
      consumerKey: string;
      consumerSecret: string;
    }
  | { provider: 'shopify'; domain: string; privateToken: string };

type Environment = Readonly<Record<string, string | undefined>>;

function required(env: Environment, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new Error(`Commerce configuration: ${name} is required.`);
  return value;
}

export function parseCommerceConfig(env: Environment): CommerceConfig {
  const provider = env.COMMERCE_PROVIDER?.trim() ?? 'mock';

  if (provider === 'mock') return { provider };

  if (provider === 'woocommerce') {
    const rawUrl = required(env, 'WOOCOMMERCE_URL');
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new Error(
        'Commerce configuration: WOOCOMMERCE_URL must be a valid URL.',
      );
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw new Error(
        'Commerce configuration: WOOCOMMERCE_URL requires HTTPS (HTTP only on loopback), without embedded credentials, query or fragment.',
      );
    }
    return {
      provider,
      url: url.href.replace(/\/+$/, ''),
      consumerKey: required(env, 'WOOCOMMERCE_CONSUMER_KEY'),
      consumerSecret: required(env, 'WOOCOMMERCE_CONSUMER_SECRET'),
    };
  }

  if (provider === 'shopify') {
    const domain = required(env, 'SHOPIFY_STORE_DOMAIN').toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com$/.test(domain)) {
      throw new Error(
        'Commerce configuration: SHOPIFY_STORE_DOMAIN must be a bare myshopify.com hostname.',
      );
    }
    return {
      provider,
      domain,
      privateToken: required(env, 'SHOPIFY_STOREFRONT_PRIVATE_TOKEN'),
    };
  }

  throw new Error(
    'Commerce configuration: COMMERCE_PROVIDER must be mock, woocommerce or shopify.',
  );
}
