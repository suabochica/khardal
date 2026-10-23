function vercelOrigin(hostname) {
  if (!hostname) return undefined;
  const url = new URL(`https://${hostname}`);
  if (
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.port
  )
    throw new Error('Invalid Vercel deployment hostname.');
  return url.origin;
}

export function deploymentSettings(env = process.env) {
  const target = env.DEPLOY_TARGET ?? (env.VERCEL === '1' ? 'vercel' : 'node');
  if (!['node', 'vercel'].includes(target))
    throw new Error('DEPLOY_TARGET must be node or vercel.');
  const primary =
    target === 'vercel'
      ? vercelOrigin(env.VERCEL_PROJECT_PRODUCTION_URL)
      : undefined;
  const preview =
    target === 'vercel' ? vercelOrigin(env.VERCEL_URL) : undefined;
  const site =
    env.STOREFRONT_ORIGIN ||
    (target === 'vercel' ? (primary ?? preview) : env.RENDER_EXTERNAL_URL);
  return {
    target,
    site,
    requestOrigins: [...new Set([site, primary, preview].filter(Boolean))],
  };
}
