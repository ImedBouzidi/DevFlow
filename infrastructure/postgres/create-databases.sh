#!/bin/sh
set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"
until pg_isready -h postgres -U "$POSTGRES_USER" -d postgres >/dev/null 2>&1; do
  sleep 2
done

for database in "$AUTH_DB_NAME" "$INCIDENT_DB_NAME"; do
  exists=$(psql -h postgres -U "$POSTGRES_USER" -d postgres -tAc \
    "SELECT 1 FROM pg_database WHERE datname = '$database'")
  if [ "$exists" != "1" ]; then
    createdb -h postgres -U "$POSTGRES_USER" "$database"
  fi
done
