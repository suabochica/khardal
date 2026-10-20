import type { Collection, Product } from './models.ts';
import { cop } from './money.ts';

// Synthetic development catalog. No names, prices, notes or demand claims are approved stock.
export const sampleCollections: Collection[] = [
  {
    id: 'demo-top10',
    slug: 'top-10',
    name: 'Top 10',
    description:
      'Selección curada de diez perfumes de muestra; no es un ranking de ventas.',
  },
  {
    id: 'demo-fresh',
    slug: 'frescos',
    name: 'Encuentros frescos',
    description: 'Una selección de muestra de perfiles cítricos y florales.',
  },
  {
    id: 'demo-woods',
    slug: 'amaderados',
    name: 'Matices amaderados',
    description: 'Una selección de muestra de maderas y acordes ambarados.',
  },
];
const names = [
  'Brisa de bergamota',
  'Cedro al atardecer',
  'Jardín de iris',
  'Ámbar sereno',
  'Neroli de la mañana',
  'Sándalo suave',
  'Rosa de lluvia',
  'Vetiver profundo',
  'Té y mandarina',
  'Una memoria extraordinariamente luminosa de flores blancas al caer la tarde',
  'Noche de especias',
  'Horizonte mineral',
];
const families = ['Cítrica', 'Amaderada', 'Floral', 'Ambarada'];
export const sampleProducts: Product[] = names.map((name, index) => {
  const n = index + 1;
  const key = String(n).padStart(3, '0');
  const family = families[index % families.length]!;
  return {
    id: `mock-product-${key}`,
    slug: [
      'brisa-bergamota',
      'cedro-atardecer',
      'jardin-iris',
      'ambar-sereno',
      'neroli-manana',
      'sandalo-suave',
      'rosa-lluvia',
      'vetiver-profundo',
      'te-mandarina',
      'memoria-luminosa',
      'noche-especias',
      'horizonte-mineral',
    ][index]!,
    name,
    description: `Una exploración de muestra de la familia ${family.toLocaleLowerCase('es-CO')}. Esta descripción es ilustrativa: el catálogo, las notas y las fotografías finales están pendientes de aprobación.`,
    family,
    category: index % 3 === 0 ? 'Extracto de perfume' : 'Eau de parfum',
    collectionSlugs: [
      ...(index < 10 ? ['top-10'] : []),
      index % 2 === 0 ? 'frescos' : 'amaderados',
    ],
    images:
      index === 11
        ? []
        : [
            {
              id: `${key}-front`,
              src: '/images/demo-bottle.svg',
              alt: `Ilustración de muestra para ${name}`,
              width: 600,
              height: 750,
            },
            {
              id: `${key}-detail`,
              src: '/images/demo-detail.svg',
              alt: `Detalle ilustrativo de muestra para ${name}`,
              width: 600,
              height: 750,
            },
          ],
    ...(index === 2 || index === 11
      ? {}
      : { notes: { top: ['Bergamota'], heart: ['Iris'], base: ['Cedro'] } }),
    variants: [30, 50, 100].map((sizeMl, sizeIndex) => ({
      id: `mock-${key}-${sizeMl}`,
      sku: `KH-DEMO-${key}-${String(sizeMl).padStart(3, '0')}`,
      label: `${sizeMl} ml`,
      sizeMl,
      price: cop(65000 + index * 7000 + sizeIndex * 45000),
      availability:
        index === 11
          ? 'unknown'
          : index === 6 || (index === 0 && sizeIndex === 2)
            ? 'sold-out'
            : 'available',
      stockQuantity:
        index === 11
          ? null
          : index === 6 || (index === 0 && sizeIndex === 2)
            ? 0
            : 5 + sizeIndex,
    })),
    sample: true,
  };
});
