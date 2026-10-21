export function storefrontDomains(value) {
  const domains = [
    { protocol: 'http', hostname: 'localhost' },
    { protocol: 'http', hostname: '127.0.0.1' },
  ];
  if (!value) return domains;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('STOREFRONT_ORIGIN must be an absolute storefront origin.');
  }
  if (
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  )
    throw new Error(
      'STOREFRONT_ORIGIN requires HTTPS (HTTP only on loopback), with no path, credentials, query or fragment.',
    );
  domains.push({
    protocol: url.protocol.slice(0, -1),
    hostname: url.hostname,
    port: url.port,
  });
  return domains;
}
