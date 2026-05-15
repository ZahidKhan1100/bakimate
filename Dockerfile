FROM php:8.4-cli
WORKDIR /var/www/html

# Composer warns when running as root during Docker builds — normal for Docker builds.
ENV COMPOSER_ALLOW_SUPERUSER=1

# System deps — libicu-dev required to compile ext-intl, libpng/libjpeg/libfreetype
# for ext-gd (DomPDF / image handling), libonig-dev for ext-mbstring.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git unzip zip curl \
    libonig-dev libxml2-dev libzip-dev libicu-dev \
    libpng-dev libjpeg-dev libfreetype-dev \
 && rm -rf /var/lib/apt/lists/*

# Compile intl explicitly first so ICU is linked cleanly, then remaining extensions.
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
 && docker-php-ext-install -j "$(nproc)" intl \
 && docker-php-ext-install -j "$(nproc)" pdo pdo_mysql mbstring xml zip bcmath gd \
 && pecl install redis \
 && docker-php-ext-enable redis \
 && php -r "extension_loaded('intl') || exit(1);"

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Copy all files
COPY . .

# Install deps first (vendor/autoload); skip scripts until APP_KEY exists.
RUN composer install --optimize-autoloader --no-interaction --no-dev --no-scripts

# App key for Artisan during image build. Railway APP_KEY overrides at runtime.
RUN if [ ! -f .env ]; then cp .env.example .env; fi \
    && php artisan key:generate --force --no-interaction

# Composer post-autoload-dump (package:discover, filament:upgrade, etc.)
RUN composer dump-autoload -o --no-interaction --no-dev

# Set permissions for Laravel
RUN mkdir -p storage/framework/{sessions,views,cache,testing} storage/logs bootstrap/cache \
 && chmod -R 775 storage bootstrap/cache

# Pre-bake the public/storage symlink so the runtime startCommand stays simple
# (just `php artisan serve`). Idempotent: `|| true` guards against rebuild.
RUN php artisan storage:link || true

# Expose port 8000
EXPOSE 8000

# Start Laravel server (railway.json `startCommand` overrides this in production,
# but we keep a sensible default so `docker run` Just Works locally).
CMD ["sh", "-c", "php artisan serve --host=0.0.0.0 --port=${PORT:-8000}"]
