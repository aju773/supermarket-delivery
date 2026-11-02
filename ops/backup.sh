#!/usr/bin/env bash
# Back up Postgres and the product photos to every remote in BACKUP_REMOTES.
#
# BACKUP_REMOTES is a comma-separated list of rclone destinations, e.g.
#   oracle:shop-backups,offsite:shop-backups
# Remotes are configured through RCLONE_CONFIG_<NAME>_* variables (see .env.prod.example).
# Each run uploads one folder named by UTC time: <remote>/<stamp>/db.dump and media.tar.gz.
set -euo pipefail

: "${BACKUP_REMOTES:?set BACKUP_REMOTES}"
MEDIA_DIR="${MEDIA_DIR:-/media}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-30}"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
pg_dump --format=custom --host "${POSTGRES_HOST:-db}" --port "${POSTGRES_PORT:-5432}" \
  --username "${POSTGRES_USER:?}" --dbname "${POSTGRES_DB:?}" --file "$work/db.dump"
tar --create --gzip --file "$work/media.tar.gz" --directory "$MEDIA_DIR" .

failed=0
IFS=',' read -ra remotes <<<"$BACKUP_REMOTES"
for remote in "${remotes[@]}"; do
  remote="${remote// /}"
  if rclone copy "$work" "$remote/$stamp" && rclone delete "$remote" --min-age "${KEEP_DAYS}d" && rclone rmdirs "$remote" --leave-root; then
    echo "backup $stamp uploaded to $remote"
  else
    echo "backup $stamp FAILED for $remote" >&2
    failed=1
  fi
done
exit "$failed"
