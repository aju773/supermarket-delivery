#!/usr/bin/env bash
# Run backup.sh every night at BACKUP_HOUR (default 02, in the container's TZ).
set -uo pipefail

hour="${BACKUP_HOUR:-02}"
while true; do
  now=$(date +%s)
  next=$(date -d "today ${hour}:00" +%s)
  [ "$next" -gt "$now" ] || next=$(date -d "tomorrow ${hour}:00" +%s)
  echo "next backup at $(date -d "@$next")"
  sleep $((next - now))
  /ops/backup.sh || echo "backup run failed" >&2
done
