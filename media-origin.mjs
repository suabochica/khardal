export function mediaPatterns(value = 'http://127.0.0.1:8000') {
  const url = new URL(value);
  if (
    (url.protocol !== 'https:' &&
      !(
        url.protocol === 'http:' &&
        ['localhost', '127.0.0.1'].includes(url.hostname)
      )) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      'WOO_MEDIA_ORIGIN must be a public HTTPS or loopback media base without credentials/query/fragment.',
    );
  return [
    {
      protocol: url.protocol.slice(0, -1),
      hostname: url.hostname,
      port: url.port,
      pathname: `${url.pathname.replace(/\/$/, '')}/wp-content/uploads/**`,
    },
  ];
}
