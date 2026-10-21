# S22 — Catálogo compartido en WooCommerce local

## Fuente y ejecución

La única fuente de productos/variantes/colecciones es
`src/lib/commerce/fixtures.ts`. No se mantiene un segundo catálogo manual en PHP.
El comando Node importa esas fixtures y envía un manifiesto JSON por stdin al
servicio WP-CLI local. No exporta credenciales ni genera archivos de catálogo
dentro del repositorio.

Con S21 iniciado y configurado:

```sh
# Solo la primera vez que falte el navegador usado por el proyecto:
pnpm exec playwright install chromium

pnpm woo:seed
pnpm woo:seed:check
```

Para el checkpoint de idempotencia:

```sh
pnpm woo:seed:repeat-check
```

Este último ejecuta el seed dos veces, verifica paridad en cada ejecución y exige
los mismos IDs. La segunda ejecución debe crear **cero** productos, variantes e
imágenes. Al final consulta el REST nativo de WooCommerce y descarga cada imagen
para comprobar precio, stock, metadatos, dimensiones, MIME y acceso HTTP.

`woo:seed:check` es de solo lectura y no necesita iniciar Chromium. La escritura
usa las API CRUD de WooCommerce mediante WP-CLI, no una clave REST con permisos
de escritura. Se reutiliza la clave de lectura de S21 para las comprobaciones REST.

## Datos resultantes

| Elemento administrado por el seed | Cantidad |
| --- | ---: |
| Productos variables | 12 |
| Variaciones, cada una con SKU propio | 36 |
| Imágenes de muestra PNG | 22 |
| Categorías WooCommerce | 7 |
| Atributos globales | 2 |

Las siete categorías son dos contenedores, tres colecciones y dos tipos de perfume:

```text
khardal-demo-colecciones
  top-10        (10 productos, orden curado)
  frescos       (6 productos)
  amaderados    (6 productos)
khardal-demo-tipos
  tipo-extracto-de-perfume   (4 productos)
  tipo-eau-de-parfum        (8 productos)
```

Los productos se asignan a sus colecciones y al tipo correspondiente. La jerarquía
permite distinguir colecciones de tipos usando campos REST estándar, sin inferir
esa diferencia desde nombres. Los contenedores no son colecciones adicionales.
`menu_order` reproduce el orden estable de las fixtures; Top 10 es una selección
curada, no un ranking calculado de ventas.

Los atributos globales son **Presentación** (`pa_kh-presentacion`, variaciones
30/50/100 ml) y **Familia olfativa** (`pa_kh-familia`, sin variaciones). El seed
verifica términos, opciones y asociación a cada producto.

## Identidad y metadatos para S23–S24

Los IDs enteros asignados por WooCommerce son propios de este proveedor. No se
fuerzan a coincidir con los IDs mock. Los vínculos estables de migración son:

| Dato | Campo en WooCommerce |
| --- | --- |
| SKU de producto padre | `KH-DEMO-P-001` … `KH-DEMO-P-012`, derivado del ID de fixture |
| SKU de variante | `KH-DEMO-001-030`, etc.; exactamente el de la fixture |
| Registro administrado | `_khardal_fixture_seed = khardal-demo-v1` |
| ID original de producto/variante | `_khardal_fixture_id` |
| Producto/variante de muestra | `_khardal_sample = yes` |
| Tipo normalizado | `_khardal_category` |
| Familia normalizada | `_khardal_fragrance_family` |
| Notas opcionales | `_khardal_notes`: objeto `top` / `heart` / `base` |
| Tamaño en ml | `_khardal_size_ml` en la variante |
| Disponibilidad desconocida | `_khardal_availability = unknown` únicamente cuando corresponda |
| ID original de colección | Meta del término `_khardal_fixture_collection_id` |

Las claves de producto/variante se verifican también en `meta_data` del REST. La
meta de términos se verifica con WordPress; no se supone que el REST de categorías
exponga automáticamente toda su meta. Las colecciones se descubren por su jerarquía.
Cuando faltan notas, se elimina la clave en lugar de inventar notas o publicar un
objeto vacío como contenido real.

### Dinero e inventario

Precios regulares en **pesos COP enteros**, no centavos. No hay precios de oferta
ni backorders. Los tamaños mantienen sus diferencias de precio.

- 29 variantes disponibles: `manage_stock=true`, cantidad de la fixture, `instock`.
- 4 agotadas: `manage_stock=true`, cantidad 0, `outofstock`.
- 3 por confirmar: `manage_stock=false`, cantidad `null`, `outofstock` y la meta
  `unknown`. WooCommerce no tiene un estado nativo equivalente a desconocido.

El adaptador futuro debe conservar `unknown` al leer esa meta; para las otras
variantes usará el stock vigente de WooCommerce. No existe una copia de stock
"autoritativa" en metadatos que oculte cambios administrativos posteriores.
`Brisa de bergamota` tiene 100 ml agotado; `Rosa de lluvia` está completamente
agotado; `Horizonte mineral` tiene disponibilidad por confirmar y carece de imágenes.

## Imágenes

Se rasterizan las dos ilustraciones SVG originales de `public/images/` con el
Chromium ya utilizado por el proyecto. No se habilitan subidas SVG en WordPress ni
se publican los PNG de marcas distintas del inventario de referencias. Las
ilustraciones conservan sus rótulos MUESTRA/desarrollo.

Cada imagen de fixture tiene un attachment propio, para mantener el alt text de
su producto. La fuente se rasteriza una vez por comando y se reutilizan sus bytes;
los 11 productos con imágenes reciben portada y galería. El producto sin imágenes
mantiene portada/galería vacías. Las derivadas viven en el volumen de WordPress.

La identidad de medios usa `_khardal_fixture_image_id`. Se guardan la ruta fuente,
SHA-256 del SVG y del PNG, dimensiones y alt text. Repetir el seed reutiliza los
attachments; la verificación detecta archivos ausentes, dañados o asociaciones
incorrectas. Un cambio de fuente SVG exige una actualización versionada o un
entorno limpio de fixtures, no una sustitución silenciosa de medios existentes.

## Repetición y límites

El seed verifica que el entorno sea local, la URL sea loopback, la moneda COP y
WooCommerce tenga la versión fijada. Un bloqueo de base evita ejecuciones de
fixtures concurrentes.

Actualiza solo sus propios SKUs/términos/medios. Si una identidad coincide con un
registro ajeno, está en la papelera, tiene variantes ajenas o está duplicada,
se detiene. No borra categorías/productos de usuario ni elimina registros de una
versión anterior para ocultar discrepancias. Los conteos reportados corresponden
solo a registros administrados por el seed.

**Volver a sembrar restablece precios y stock de las fixtures.** Por eso el
preflight rechaza productos referenciados por un pedido: no debe reponer stock
después de pruebas de ventas. Tras S20b, `woo:seed:check` puede señalar diferencias
de stock legítimas; no las corrige. Para repetir un catálogo inicial después de
pedidos, usar otro entorno local limpio o el reset destructivo documentado en
[S21](local-woocommerce.md), entendiendo que elimina esos datos.

Si una ejecución se interrumpe, volver a ejecutarla reutiliza las identidades
guardadas; los conflictos se resuelven explícitamente. La verificación completa
es condición del checkpoint, no solo el mensaje de creación de un producto.

## Checkpoint S22

`woo:seed:repeat-check` pasó: 12 productos, 36 variantes, 22 imágenes, 7 categorías
y 2 atributos. En la segunda ejecución no se crearon productos/variantes/imágenes;
todos sus IDs y los de categorías/atributos se conservaron. Digest de identidades
en este entorno: `292134cc0c276dfeb8501fea9cd30b2166b2d921b5fea3dafd0664c4537e5de2`.

La comprobación independiente del REST verificó todos los precios y cantidades,
estados agotado/desconocido, categorías, notas opcionales, galería/alt text y las
22 imágenes PNG accesibles a 600 × 750. Top 10 devolvió los diez productos en el
orden esperado. `woo:check` sigue disponible para comprobar el admin y la API.

El catálogo compartido ya permite preparar el recorrido administrativo S20b, que
continúa pendiente. S23 ya incorpora el [adaptador de catálogo](woocommerce-adapter.md)
y permite activarlo con `pnpm woo:use`; S24 completa validación/optimización.
El seed por sí solo no constituye verificación de esas integraciones ni de Shopify.
