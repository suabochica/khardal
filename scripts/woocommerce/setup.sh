#!/bin/sh
set -eu

php -r 'exit(version_compare(PHP_VERSION, "8.3", ">=") ? 0 : 1);'
mkdir -p wp-content/mu-plugins
cp /opt/khardal/local-settings.php wp-content/mu-plugins/khardal-local.php
if [ "$(wp core version)" != "$KHARDAL_WORDPRESS_VERSION" ]; then
  printf '%s\n' 'Unexpected WordPress version in the persistent volume. Review the documented upgrade procedure.' >&2
  exit 1
fi

if ! wp core is-installed; then
  wp core install --url="$WP_LOCAL_URL" --title='Khardal Perfumería — Desarrollo' \
    --admin_user="$WC_ADMIN_USER" --admin_password="$WC_ADMIN_PASSWORD" \
    --admin_email="$WC_ADMIN_EMAIL" --skip-email
fi
wp user get "$WC_ADMIN_USER" --field=ID >/dev/null

if wp plugin is-installed woocommerce; then
  if [ "$(wp plugin get woocommerce --field=version)" != "$KHARDAL_WOOCOMMERCE_VERSION" ]; then
    printf '%s\n' 'Unexpected WooCommerce version. Review the documented upgrade procedure.' >&2
    exit 1
  fi
  wp plugin activate woocommerce
else
  wp plugin install woocommerce --version="$KHARDAL_WOOCOMMERCE_VERSION" --activate
fi
wp core verify-checksums --exclude=wp-config-docker.php
wp plugin verify-checksums woocommerce
wp language core install es_CO --activate
wp language plugin install woocommerce es_CO
wp option update timezone_string America/Bogota
wp option update blog_public 0
wp option update woocommerce_default_country CO
wp option update woocommerce_currency COP
wp option update woocommerce_allow_tracking no
wp option update woocommerce_price_num_decimals 0
wp option update woocommerce_allowed_countries specific
wp option update woocommerce_specific_allowed_countries '["CO"]' --format=json
wp rewrite structure '/%postname%/' --hard
wp eval-file /opt/khardal/setup-api-key.php
wp eval-file /opt/khardal/verify.php
printf '%s\n' 'Local WooCommerce setup complete. Admin and read-only API credentials are in .env.woocommerce.'
