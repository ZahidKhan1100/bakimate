#!/usr/bin/env bash
set -euo pipefail

# Railway injects PORT; Apache must Listen and match VirtualHost to the same port.
export PORT="${PORT:-80}"

awk -v port="${PORT}" '
/^Listen[[:space:]]+[[:digit:]]+/ && !done {
    print "Listen " port
    done = 1
    next
}
{ print }
' /etc/apache2/ports.conf > /tmp/ports.railway.conf \
  && mv /tmp/ports.railway.conf /etc/apache2/ports.conf

envsubst '${PORT}' \
  < /etc/apache2/sites-available/site.template.conf \
  > /etc/apache2/sites-available/000-default.conf

exec "$@"
