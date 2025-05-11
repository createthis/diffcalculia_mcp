#!/bin/sh
set -e

if [ "$SANDBOX_USER_ID" -ne 0 ]; then
  if ! id mcpuser 2>/dev/null || [ "$(id -u mcpuser)" -ne "$SANDBOX_USER_ID" ]; then
    deluser mcpuser 2>/dev/null || true
    adduser -D -u "$SANDBOX_USER_ID" -s /bin/sh mcpuser
  fi
  # Using su-exec instead of gosu:
  chown -R mcpuser:mcpuser /app
  exec su-exec mcpuser "$@"
else
  exec "$@"
fi
