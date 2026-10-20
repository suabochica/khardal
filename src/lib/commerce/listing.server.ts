import { getCommerce } from './provider.server';
import { CommerceError } from './models';
import { readQuery } from './query';

export async function loadListing(url: URL, collectionSlug?: string) {
  try {
    const query = readQuery(url.searchParams);
    const commerce = await getCommerce();
    const collection = collectionSlug
      ? await commerce.getCollection(collectionSlug)
      : null;
    if (collectionSlug && !collection)
      return { status: 404 as const, data: null };
    const facets = await commerce.getFacets(collectionSlug);
    if (
      (query.category && !facets.categories.includes(query.category)) ||
      (query.family && !facets.families.includes(query.family))
    )
      throw new CommerceError('invalid-request', 'Filtro no disponible.');
    return {
      status: 200 as const,
      data: {
        provider: commerce.provider,
        collection,
        query,
        facets,
        collections: await commerce.listCollections(),
        results: await commerce.listProducts({
          ...query,
          collection: collectionSlug,
        }),
      },
    };
  } catch (error) {
    return {
      status:
        error instanceof CommerceError && error.code === 'invalid-request'
          ? (400 as const)
          : (503 as const),
      data: null,
    };
  }
}
