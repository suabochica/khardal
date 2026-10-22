import { getImage, inferRemoteSize, imageConfig } from 'astro:assets';
import { isRemoteAllowed } from 'astro/assets/utils';

const dimensions = new Map<
  string,
  { width: number; height: number; expires: number }
>();
export async function imageAttributes(
  src: string,
  width?: number | null,
  height?: number | null,
  maxWidth = 960,
) {
  const fallback = {
    src,
    srcset: undefined as string | undefined,
    width: width ?? undefined,
    height: height ?? undefined,
  };
  if (
    !/^https?:/.test(src) ||
    /\.svg(?:\?|$)/i.test(src) ||
    !isRemoteAllowed(src, imageConfig)
  )
    return fallback;
  try {
    let size = width && height ? { width, height } : dimensions.get(src);
    if (!size || ('expires' in size && Number(size.expires) <= Date.now())) {
      size = await inferRemoteSize(src);
      if (dimensions.size >= 64)
        dimensions.delete(dimensions.keys().next().value!);
      dimensions.set(src, {
        width: size.width,
        height: size.height,
        expires: Date.now() + 3600000,
      });
    }
    const target = Math.min(maxWidth, size.width);
    const result = await getImage({
      src,
      width: target,
      height: Math.round((target * size.height) / size.width),
      widths: [160, 320, 480, 640, 960, 1280]
        .filter((w) => w <= target)
        .concat(target),
      format: 'webp',
      quality: 80,
    });
    return {
      src: result.src,
      srcset: result.srcSet.attribute,
      width: target,
      height: Math.round((target * size.height) / size.width),
    };
  } catch {
    return fallback;
  }
}
