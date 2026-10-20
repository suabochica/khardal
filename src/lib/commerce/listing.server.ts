import { getCommerce } from './provider.server';
import { CommerceError } from './models';
import { readPage } from './query';

export async function loadListing(url: URL, collectionSlug?: string) {
  try {
    const page = readPage(url.searchParams);
    const commerce = await getCommerce();
    const collection = collectionSlug
      ? await commerce.getCollection(collectionSlug)
      : null;
    if (collectionSlug && !collection)
      return { status: 404 as const, data: null };
    return {
      status: 200 as const,
      data: {
        provider: commerce.provider,
        collection,
        collections: await commerce.listCollections(),
        results: await commerce.listProducts({
          page,
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
