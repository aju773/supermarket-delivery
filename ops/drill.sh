#!/usr/bin/env bash
# Restore drill: proves backup.sh and restore.sh work together, with no server and no cloud account.
# Starts a throwaway Postgres, backs up to a local folder, wipes the data, restores and compares.
# Run from the repo root: ops/drill.sh
set -euo pipefail

cd "$(dirname "$0")"
run="drill-$$"
net="$run"
work="$(mktemp -d)"
cleanup() { docker rm -f "$run-db" >/dev/null 2>&1 || true; docker network rm "$net" >/dev/null 2>&1 || true; docker run --rm --volume "$work:/w" alpine:3.22 rm -rf /w/media /w/backups >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT

docker build --quiet --tag supermarket-ops-drill . >/dev/null
docker network create "$net" >/dev/null
docker run --detach --name "$run-db" --network "$net" --network-alias db \
  --env POSTGRES_USER=shop --env POSTGRES_PASSWORD=pw --env POSTGRES_DB=shop postgres:17-alpine >/dev/null
until docker exec "$run-db" pg_isready --username shop --dbname shop >/dev/null 2>&1; do sleep 1; done
sleep 2

mkdir -p "$work/media/products" "$work/backups"
echo "photo bytes" >"$work/media/products/tomato.webp"
docker exec "$run-db" psql --username shop --dbname shop --quiet \
  --command "CREATE TABLE item (name text); INSERT INTO item VALUES ('tomato'), ('onion')"

ops() {
  docker run --rm --network "$net" --volume "$work/media:/media" --volume "$work/backups:/backups" \
    --env POSTGRES_USER=shop --env POSTGRES_PASSWORD=pw --env POSTGRES_DB=shop \
    --env BACKUP_REMOTES=/backups --env BACKUP_KEEP_DAYS=30 supermarket-ops-drill "$@"
}

ops /ops/backup.sh

# Lose everything, then bring it back.
docker exec "$run-db" psql --username shop --dbname shop --quiet --command "DROP TABLE item"
rm -rf "$work/media/products"

ops /ops/restore.sh --yes /backups

rows="$(docker exec "$run-db" psql --username shop --dbname shop --tuples-only --command "SELECT count(*) FROM item" | tr -d ' ')"
[ "$rows" = "2" ] || { echo "DRILL FAILED: expected 2 rows, got $rows" >&2; exit 1; }
[ "$(cat "$work/media/products/tomato.webp")" = "photo bytes" ] || { echo "DRILL FAILED: photo missing" >&2; exit 1; }

# A rehearsal into a scratch database must leave the real one alone.
ops env RESTORE_DB=scratch MEDIA_DIR=/tmp/m /ops/restore.sh --yes /backups
docker exec "$run-db" psql --username shop --dbname scratch --tuples-only --command "SELECT count(*) FROM item" | grep -q 2 \
  || { echo "DRILL FAILED: scratch restore" >&2; exit 1; }

echo "DRILL PASSED"
