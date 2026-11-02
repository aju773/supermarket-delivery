#!/usr/bin/env bash
# Restore Postgres and the product photos from a backup.
#
#   restore.sh --yes <remote> [stamp]     stamp defaults to the newest backup
#
# This replaces the data in RESTORE_DB (default POSTGRES_DB) and the photos in MEDIA_DIR.
# To rehearse without touching live data, set RESTORE_DB=restore_test and MEDIA_DIR=/tmp/media.
set -euo pipefail

if [ "${1:-}" != "--yes" ] || [ -z "${2:-}" ]; then
  echo "usage: restore.sh --yes <remote> [stamp]" >&2
  exit 2
fi
remote="$2"
MEDIA_DIR="${MEDIA_DIR:-/media}"
target_db="${RESTORE_DB:-${POSTGRES_DB:?}}"

stamp="${3:-$(rclone lsf --dirs-only "$remote" | tr -d / | sort | tail -n 1)}"
[ -n "$stamp" ] || { echo "no backups found in $remote" >&2; exit 1; }
echo "restoring $remote/$stamp into database $target_db and $MEDIA_DIR"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
rclone copy "$remote/$stamp" "$work"
[ -s "$work/db.dump" ] && [ -s "$work/media.tar.gz" ] || { echo "backup $stamp is incomplete" >&2; exit 1; }

export PGPASSWORD="${POSTGRES_PASSWORD:-}"
pg=(--host "${POSTGRES_HOST:-db}" --port "${POSTGRES_PORT:-5432}" --username "${POSTGRES_USER:?}")
psql "${pg[@]}" --dbname postgres --quiet --command "DROP DATABASE IF EXISTS \"$target_db\" WITH (FORCE)"
psql "${pg[@]}" --dbname postgres --quiet --command "CREATE DATABASE \"$target_db\""
pg_restore "${pg[@]}" --dbname "$target_db" --no-owner --exit-on-error "$work/db.dump"

mkdir -p "$MEDIA_DIR"
find "$MEDIA_DIR" -mindepth 1 -delete
tar --extract --gzip --file "$work/media.tar.gz" --directory "$MEDIA_DIR"
echo "restore of $stamp finished"
