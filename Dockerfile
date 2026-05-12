# syntax=docker/dockerfile:1.6
#
# BakiMate Laravel API — production image.
#
# Base: `serversideup/php` (Alpine variant) — a hardened, Laravel-aware
# nginx + php-fpm 8.3 stack. Ships with: pdo_mysql, bcmath, gd, intl, opcache,
# zip, curl, mbstring, xml, exif, redis. Runs as non-root user `www-data`.
#
# Runtime contract (Railway / any Docker host):
#   - Listens on :8080 (declared via EXPOSE; Railway auto-routes HTTPS edge here).
#   - On container start, the serversideup entrypoint runs:
#       * php artisan migrate --force        (AUTORUN_LARAVEL_MIGRATION)
#       * php artisan storage:link           (AUTORUN_LARAVEL_STORAGE_LINK)
#       * php artisan optimize               (AUTORUN_LARAVEL_OPTIMIZE)
#     so config / routes / views are cached against the *runtime* env, not
#     baked at build time (which would freeze APP_KEY, DB_* etc. to empty).
#
# Local build: `docker build -t bakimate-backend .`
# Local run:   `docker run --rm -p 8080:8080 --env-file .env bakimate-backend`

FROM serversideup/php:8.3-fpm-nginx-alpine AS production

# --- Runtime configuration (serversideup conventions) -------------------------
ENV PHP_OPCACHE_ENABLE=1 \
    SSL_MODE=off \
    NGINX_HTTP_LISTEN_PORT=8080 \
    AUTORUN_ENABLED=true \
    AUTORUN_LARAVEL_STORAGE_LINK=true \
    AUTORUN_LARAVEL_MIGRATION=true \
    AUTORUN_LARAVEL_OPTIMIZE=true

# --- Copy application source --------------------------------------------------
# `.dockerignore` excludes vendor/, node_modules/, .env, storage caches, etc.
COPY --chown=www-data:www-data . /var/www/html

# --- Composer install (production only, optimised autoloader) -----------------
# Composer is pre-installed in the base image. Switch to www-data so cache
# files end up writable by the runtime user.
USER www-data

RUN composer install \
        --no-dev \
        --optimize-autoloader \
        --no-interaction \
        --prefer-dist \
        --no-progress \
        --no-scripts \
 && composer dump-autoload --optimize --classmap-authoritative

# --- Expose port + healthcheck -----------------------------------------------
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- http://127.0.0.1:8080/up >/dev/null 2>&1 || exit 1

# Default CMD is provided by the serversideup base image (php-fpm + nginx
# under s6-overlay), which also invokes the AUTORUN_* artisan commands above.
