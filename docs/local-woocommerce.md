# S21 — WooCommerce local con Docker

## Versiones verificadas

Verificadas el 2026-10-21 en Linux amd64, Docker 29.0.0 y Compose v5.5.0.

| Componente | Pin | Versión observada |
| --- | --- | --- |
| WordPress / Apache | `wordpress:7.1.3-php8.3-apache` + digest SHA-256 en Compose | WordPress 7.1.3 / PHP 8.3.36 |
| Base de datos | `mariadb:11.4.13` + digest SHA-256 | MariaDB 11.4.13 |
| Herramientas | `wordpress:cli-php8.3` + digest SHA-256 | WP-CLI 2.12.0 / PHP 8.3.36 |
| Plugin | WooCommerce `11.2.1` | 11.2.1 activo, checksum oficial verificado |

Se consultaron la [API de versiones de WordPress](https://api.wordpress.org/core/version-check/1.7/),
la [metadata oficial de WooCommerce](https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=woocommerce)
y los tags/digests de las imágenes oficiales de Docker Hub. WooCommerce 11.2.1
declara WordPress mínimo 7.0, probado hasta 7.1.3 y PHP mínimo 7.4. Los PHP 8.3.36
de ambas imágenes y MariaDB 11.4.13 superan el baseline acordado.

El digest fija el contenido exacto aunque el tag de PHP/CLI se reconstruya.
WordPress y WooCommerce verifican checksums contra sus fuentes oficiales. Se
excluye de la verificación de core `wp-config-docker.php`, propio de la imagen
oficial y cubierto por su digest. Las traducciones es_CO se instalan para las
versiones elegidas. Este checkpoint prueba estas versiones, no futuras actualizaciones.

## Inicio

Desde la raíz del repositorio:

```sh
pnpm woo:init
pnpm woo:up
pnpm woo:setup
pnpm woo:check
```

- Sitio local: **http://127.0.0.1:8000**
- Administrador: **http://127.0.0.1:8000/wp-admin/**
- Usuario predeterminado: `khardal_local`.
- Contraseña: campo `WC_ADMIN_PASSWORD` del archivo local **`.env.woocommerce`**.

`woo:init` genera contraseñas aleatorias y claves de API, con permisos 0600, sin
imprimirlas y sin sobrescribir un archivo existente. El ejemplo
`.env.woocommerce.example` no contiene credenciales. `.env.woocommerce` está
ignorado por Git y separado del `.env` de Astro. Conserva este archivo mientras
uses los volúmenes: volver a generar secretos no cambia los usuarios de una base
existente y puede impedir el acceso.

El proyecto Compose se llama `khardal-woocommerce`; usa su propia red y volúmenes
`database` y `wordpress`, con prefijo de proyecto. La base no publica puertos.
WordPress publica solamente `127.0.0.1:8000`; no ocupa el puerto de Astro ni los
servicios PostgreSQL existentes. Para cambiar puerto, edita `WC_PORT` en el archivo
local y ejecuta nuevamente `woo:up` y `woo:setup`; usa la URL canónica 127.0.0.1.

## Qué hace cada comando

| Comando | Función |
| --- | --- |
| `pnpm woo:init` | Genera el entorno local una sola vez |
| `pnpm woo:up` | Inicia DB/WordPress y espera sus health checks |
| `pnpm woo:setup` | Instala/configura core, plugin, idioma y clave de lectura; se puede repetir |
| `pnpm woo:check` | Comprueba login/admin, REST protegido, firma válida y rechazo de firma inválida |
| `pnpm woo:cli <argumentos>` | Ejecuta WP-CLI contra el volumen compartido |
| `pnpm woo:stop` | Detiene los contenedores conservándolos y sus datos |
| `pnpm woo:down` | Elimina contenedores/red; conserva los volúmenes y datos |

La salud de MariaDB comprueba conexión e inicialización. WordPress espera a la DB;
su health check inicial comprueba Apache, permitiendo instalar la base mediante
el servicio `setup`. La disponibilidad completa de WordPress/WooCommerce se
verifica después con `woo:setup` y `woo:check`, no solo con el puerto abierto.

`setup` es un servicio de herramientas de una ejecución, no un daemon. Comparte
el volumen con Apache usando UID/GID 33:33; su configuración WP-CLI habilita las
reglas Apache para generar `.htaccess`. Los scripts se montan en solo lectura.

## Configuración aplicada

- Nombre de desarrollo Khardal Perfumería; WordPress y WooCommerce en **es_CO**.
- Zona horaria **America/Bogota**, país **CO**, moneda **COP**, precios visibles
  en pesos enteros. Colombia es el país permitido en este entorno de prueba.
- Permalinks y namespace REST `wc/v3`.
- Una clave REST de **solo lectura**, asociada al administrador local y preservada
  al repetir setup. No hay claves de producción ni credenciales en Git.
- Indexación desactivada; entorno WordPress `local`.
- Actualizaciones automáticas desactivadas para conservar los pins verificados.
- Correo saliente suprimido por el mu-plugin local; no se envían correos reales
  desde las pruebas administrativas. El plugin solo aplica al entorno `local`.

No se inventan direcciones, impuestos, tarifas de envío ni medios de pago del
negocio. La configuración comercial definitiva sigue pendiente de S28. No hay
productos de muestra sembrados todavía: eso corresponde a S22.

## API y Astro

`woo:check` firma solicitudes OAuth 1.0 con HMAC-SHA256 para el HTTP de loopback.
WooCommerce exige este mecanismo en HTTP; no se deshabilita autenticación ni se
supone que Basic Auth sobre HTTP equivalga al flujo HTTPS. El script comprueba:

1. REST index público y namespace WooCommerce.
2. Catálogo protegido devuelve 401 sin autenticación.
3. Firma con la clave local devuelve el catálogo (inicialmente vacío).
4. Una firma inválida devuelve 401.
5. Login real del administrador y acceso autenticado al dashboard.

Las credenciales/cookies no se imprimen. Para verificar configuración interna:

```sh
pnpm woo:cli eval-file /opt/khardal/verify.php
```

Cuando implementemos S23–S24, los valores locales se mapearán al `.env` de Astro:

```dotenv
COMMERCE_PROVIDER=woocommerce
WOOCOMMERCE_URL=http://127.0.0.1:8000
# WOOCOMMERCE_CONSUMER_KEY toma WC_API_CONSUMER_KEY del archivo local.
# WOOCOMMERCE_CONSUMER_SECRET toma WC_API_CONSUMER_SECRET del archivo local.
```

Por ahora Astro continúa con `mock`: el adaptador WooCommerce aún no está
implementado. Que el backend y su REST funcionen no completa S23/S24 ni S20b.

## Persistencia y reinicio

```sh
pnpm woo:stop
pnpm woo:up
# O recrear los contenedores, conservando los datos:
pnpm woo:down
pnpm woo:up
pnpm woo:check
```

El core/plugin están en el volumen WordPress y los usuarios/opciones/claves en
MariaDB. El checkpoint guarda una opción no sensible y verifica que sobreviva a
la recreación, junto con login, plugin y clave REST. Repetir setup preserva el
administrador y la clave existente; no cambia su contraseña por una nueva del env.

## Cambios de versión

Actualizar un tag no sustituye automáticamente el core/plugin del volumen.
`woo:setup` falla si encuentra versiones distintas de las esperadas. Para una
actualización: respaldar volúmenes/base, elegir versiones compatibles, actualizar
pins/digests y expectativas, actualizar core/plugin explícitamente con WP-CLI y
ejecutar las migraciones requeridas. Repetir checksums, configuración, admin/API
y pruebas del adaptador antes de registrar un nuevo checkpoint. No borrar datos
para encubrir una migración fallida.

## Reset destructivo — solo entorno local

El siguiente comando **borra la base, usuarios, pedidos, productos y archivos de
WordPress de este proyecto**. No es el procedimiento normal de parada/reinicio:

```sh
docker compose --env-file .env.woocommerce --profile tools down --volumes
```

Después, `woo:up` y `woo:setup` crean una instalación vacía usando las credenciales
del archivo conservado. El checkpoint S21 no ejecutó este reset sobre datos existentes.

## Checkpoint S21

Resultados registrados en `TODO.md`:

- Arranque desde volúmenes nuevos: DB y WordPress saludables; solo puerto de
  loopback 8000 publicado.
- Setup inicial y repetido: versiones/checksums verificados, es_CO/CO/COP y una
  única clave local. `woo:init` repetido preservó las credenciales (archivo 0600).
- `woo:check` pasó tras setup, tras stop/start y tras down/up: sesión de admin,
  REST firmado y rechazo de acceso anónimo/firma inválida.
- La opción no sensible `khardal_s21_persistence_probe=s21-persistent-v1` sobrevivió
  la recreación, junto con core/plugin, usuario y clave REST.
- Compose válido, sintaxis shell válida y `pnpm install --frozen-lockfile` correcto.
- `pnpm verify` pasó: formato/lint, 5 pruebas de configuración, 13 de comercio,
  tipos sin diagnósticos, build y 2 pruebas del servidor compilado.

La verificación Docker es explícita y separada de `pnpm verify`; CI y previews
mock no necesitan iniciar contenedores. S20b sigue pendiente de S22 y del recorrido
administrativo real de un pedido de prueba.
