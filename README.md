# Khardal Perfumería

Tienda en línea para Colombia, con contenido en español y precios en COP.
Frontend compartido en Astro y TypeScript para comparar WooCommerce y Shopify.
Los pedidos se solicitarán por WhatsApp y se registrarán manualmente después de
la confirmación del equipo.

## Requisitos

- Node.js **22.22.0 o superior** (requisito de Astro 7).
- pnpm **12.14.0**, fijado en `package.json`.

Instala esa versión de pnpm con tu gestor de herramientas habitual. Si tu entorno
dispone de Corepack, puedes usar `corepack enable` y
`corepack prepare pnpm@12.14.0 --activate`. Node.js no siempre incluye Corepack.

## Desarrollo local

Desde la raíz del repositorio:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre `http://localhost:4321`. El proveedor predeterminado `mock` no requiere
credenciales: incluye inicio, tienda, colecciones, búsqueda, detalles de perfumes
y páginas informativas. Los 12 productos, precios e ilustraciones son muestras
de desarrollo. Las políticas definitivas están pendientes de publicación.
El carrito persiste por proveedor en este navegador. En `/carrito`, “Solicitar
pedido por WhatsApp” verifica precios y stock en el servidor y prepara un mensaje
para revisar y enviar. Los precios cambiados requieren aceptación y una nueva
verificación. Las solicitudes mock están marcadas como demostración, no pedidos
reales. Abrir WhatsApp conserva el carrito y no confirma una compra ni un pago.

## Comandos

| Comando | Función |
| --- | --- |
| `pnpm dev` | Servidor local con recarga automática |
| `pnpm check` | Sincronización de tipos de Astro y comprobación de TypeScript/plantillas |
| `pnpm format` | Aplica el formato de Prettier al código y configuración |
| `pnpm format:check` | Comprueba el formato sin modificar archivos |
| `pnpm lint` | Reglas de JavaScript, TypeScript y Astro; no permite advertencias |
| `pnpm verify` | Formato, lint, pruebas, tipos, build y pruebas del servidor compilado |
| `pnpm build` | Genera la compilación de producción en `dist/` |
| `pnpm preview` | Sirve localmente la compilación existente para revisión |
| `pnpm start` | Ejecuta el servidor Node compilado; carga `.env` si existe |
| `pnpm test:config` | Comprueba la validación de configuración de comercio |
| `pnpm test:commerce` | Prueba dinero COP, catálogo mock, filtros y validación de dominio |
| `pnpm test:woocommerce` | Prueba cliente y mapeo WooCommerce con respuestas aisladas; no requiere Docker |
| `pnpm test:runtime` | Verifica el servidor compilado; requiere `pnpm build` previo |
| `pnpm astro --help` | Ayuda de la CLI de Astro |

Antes de registrar cambios de aplicación:

```sh
pnpm verify
git diff --check
```

La aplicación usa el adaptador Node standalone. Inicio, catálogo, búsqueda y
detalles se renderizan en el servidor con `Cache-Control: no-store`; las páginas
de nosotros/contacto/FAQ se generan estáticamente. `/api/health` también usa
`no-store` y comprueba configuración, no conectividad con un backend.
Sin variables de entorno se selecciona `mock`. Para configurar un proveedor,
copia el contenido de `.env.example` en `.env` y consulta la
[guía de runtime y entornos](docs/runtime-and-environments.md).
No se requieren credenciales reales para desarrollar con `mock`.
Tailwind, los tokens visuales y los componentes compartidos están disponibles en
la vista de desarrollo del sistema de diseño.

Para comprobar la compilación de producción:

```sh
pnpm build
HOST=127.0.0.1 PORT=4321 pnpm start
```

Si `pnpm dev` indica que ya existe un servidor, abre la URL indicada. Puedes
consultarlo con `pnpm astro dev status`, ver los logs con `pnpm astro dev logs`
y detenerlo con `pnpm astro dev stop` antes de usar el mismo puerto.

## CI y previews

GitHub Actions ejecutará `pnpm verify` en pushes a `main` y pull requests usando
Node 22.22.0 (archivo `.node-version`) y pnpm 12.14.0. `render.yaml` define una
preview Node con catálogo mock, comprobación de salud y metadatos `noindex`.
`DEPLOYMENT_ENV=preview` debe estar definido al compilar esa preview.
La conexión de hosting y la verificación alojada están pendientes; consulta la
[guía de CI y previews](docs/ci-and-previews.md).
Para una compilación alojada, define `STOREFRONT_ORIGIN=https://tu-tienda.example`
en el entorno del proceso de build. Render usa `RENDER_EXTERNAL_URL` si no se
indica otro origen. Esto permite verificar el origen de las solicitudes y generar
enlaces de producto correctos; consulta la [guía de runtime](docs/runtime-and-environments.md).

## Sistema de diseño

Con `pnpm dev`, abre `http://localhost:4321/dev/design`. Esta ruta de desarrollo
muestra la paleta, tipografía, controles, productos de ejemplo, navegación,
paneles y acordeones; devuelve 404 en producción. Los productos y precios de esa
vista son demostraciones, no el catálogo aprobado.
Consulta [la guía del sistema de diseño](docs/design-system.md).
Para las comprobaciones de navegador:

```sh
pnpm exec playwright install chromium
pnpm test:ui
```

## Comercio y navegación

La [guía de comercio compartido](docs/commerce.md) documenta el contrato,
fixtures, semántica de filtros y checkpoints S10–S15. Para revisar:

- `/tienda`, `/colecciones/top-10`, `/buscar`
- `/perfumes/brisa-bergamota` (tamaños y precios), `/perfumes/rosa-lluvia` (agotado)
- `/nosotros`, `/contacto`, `/preguntas-frecuentes`, `/politicas/envios`
- `/carrito` (edición, validación y preparación del mensaje de WhatsApp)

WooCommerce ya dispone de mapeo de catálogo real (S23); Shopify sigue pendiente.
Los proveedores no disponibles muestran un error recuperable y nunca se sustituyen
silenciosamente por datos mock. Las páginas con catálogo de
muestra y las políticas pendientes fuerzan `noindex`.

La [guía de carrito y pedidos](docs/cart-and-ordering.md) documenta persistencia,
reconciliación y handoff. Los mensajes largos se copian completos para pegarlos
en WhatsApp; si falla el portapapeles, el campo permite copia manual. La
verificación caduca tras un minuto y se invalida al editar el carrito.
La [guía operativa del equipo](docs/manual-order-operations.md) explica confirmación,
entrada manual, inventario, pagos y duplicados. El recorrido real de administrador
se registrará en S20b; el backend y catálogo de prueba ya están disponibles.

## WooCommerce local (S21)

```sh
pnpm woo:init
pnpm woo:up
pnpm woo:setup
pnpm woo:check
```

Administrador: **http://127.0.0.1:8000/wp-admin/**. Usuario `khardal_local` y
contraseña `WC_ADMIN_PASSWORD` en el archivo ignorado `.env.woocommerce`.
Las imágenes oficiales están fijadas por versión y digest: WordPress 7.1.3 con
PHP 8.3.36, MariaDB 11.4.13 y WP-CLI 2.12.0; WooCommerce 11.2.1.
Consulta la [guía local](docs/local-woocommerce.md) para parada/reinicio,
persistencia, API, actualizaciones y reset destructivo. El catálogo compartido está disponible con:

```sh
pnpm woo:seed                # Crear/actualizar los registros de muestra
pnpm woo:seed:check          # Verificar paridad sin modificar el catálogo
pnpm woo:seed:repeat-check   # Sembrar dos veces y comprobar IDs/no duplicados
```

Son 12 productos variables, 36 variantes y 22 imágenes de demostración. La
[guía de seeding](docs/woocommerce-seeding.md) describe SKUs, metadatos, imágenes
y reglas de repetición. El seed utiliza Chromium (instalable con
`pnpm exec playwright install chromium`) y evita restablecer stock de productos
que ya estén referenciados por pedidos. El siguiente checkpoint es S20b.

Para que Astro lea WooCommerce en lugar de las fixtures:

```sh
pnpm woo:use  # Configura .env ignorado usando las credenciales locales
pnpm dev
```

Consulta [el adaptador WooCommerce](docs/woocommerce-adapter.md). Los productos
publicados creados manualmente también aparecen; sin precio publicado se muestran
como “Precio por confirmar”. El orden del catálogo respeta `menu_order` y la
paginación. S24 ya valida precios/stock actuales antes de preparar WhatsApp y usa
una caché de catálogo de 30 segundos que la validación omite. Las pruebas reales son `pnpm test:woocommerce:local`
y, tras compilar, `pnpm test:woocommerce:storefront`.

`pnpm test:woocommerce:journey` verifica el recorrido completo contra Docker con
productos temporales de prueba. Incluye cambios de precio/stock, revisión,
retención del carrito y caducidad real de caché. Los productos de muestra generan
mensajes explícitamente marcados como demostración.

Para respaldar el backend: `pnpm woo:backup`; para comprobar el respaldo:
`pnpm woo:backup:check <directorio>`. El comando pausa WordPress brevemente y lo
reinicia al terminar. Consulta [la guía operativa](docs/woocommerce-operations.md)
para límites, recuperación y actualizaciones.
El [ensayo administrativo restaurado](docs/order-rehearsal.md) ya verifica S20b:
`pnpm woo:rehearse:orders <directorio-backup>` crea una copia local aislada, prueba
entrada/estados/inventario reales y elimina solo esa copia al terminar.

## Estructura del proyecto

```text
src/layouts/BaseLayout.astro  Documento compartido con lang="es-CO"
src/pages/                  Inicio, catálogo, búsqueda, detalles e información
src/lib/commerce/           Modelos, contrato, mock y loaders de servidor
src/components/commerce/    Listados, filtros, galería y selección
src/content/business.ts     Contactos aprobados y contenido pendiente
public/images/              Ilustraciones demo y referencias no aprobadas
ui-design/                  Guías y referencias visuales
docs/                       Inventario de contenido y migración
TODO.md                     Pasos, checkpoints y registro de ejecución
```

`node_modules/`, `.astro/` y `dist/` se generan localmente y no se versionan.
Los archivos `.env*` locales también se excluyen, salvo `.env.example`.

## Plan y fuentes

- [Checklist de implementación](TODO.md): un paso, un checkpoint y un commit;
  cada commit incluye `Step: Sxx` en su cuerpo.
- [Inventario de contenido](docs/content-inventory.md): fuentes observadas,
  plantillas CSV e información pendiente de confirmación.
- [Especificación original](PROMPT.md) y [diseño](ui-design/DESIGN.md).

Las imágenes y precios observados durante el inventario no equivalen a contenido
aprobado para producción. El acceso real a Shopify se verificará en S27;
WooCommerce local se preparará con Docker en S21.
