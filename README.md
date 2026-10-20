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

Abre `http://localhost:4321`. No se necesitan credenciales de comercio para esta
base inicial. La página de inicio es temporal; aún no contiene catálogo ni carrito.

## Comandos

| Comando | Función |
| --- | --- |
| `pnpm dev` | Servidor local con recarga automática |
| `pnpm check` | Sincronización de tipos de Astro y comprobación de TypeScript/plantillas |
| `pnpm build` | Genera la compilación de producción en `dist/` |
| `pnpm preview` | Sirve localmente la compilación existente para revisión |
| `pnpm astro --help` | Ayuda de la CLI de Astro |

Antes de registrar cambios de aplicación:

```sh
pnpm check
pnpm build
git diff --check
```

La configuración inicial genera páginas estáticas. S04 incorporará la estrategia
de ejecución, variables de entorno y adaptador para las rutas dinámicas.
Tailwind y los tokens visuales se incorporarán en S06.

## Estructura inicial

```text
src/layouts/BaseLayout.astro  Documento compartido con lang="es-CO"
src/pages/index.astro        Página de inicio temporal
public/images/              Imágenes de referencia; aprobación pendiente
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
