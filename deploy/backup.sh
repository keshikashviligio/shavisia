#!/bin/sh
# Nightly Postgres backup with 7-day rotation.
# Installed on the droplet at /opt/shavisia/backup.sh, run from root's crontab.
set -eu

BACKUP_DIR=/opt/shavisia/backups
mkdir -p "$BACKUP_DIR"

cd /opt/shavisia
docker compose exec -T db pg_dump -U shavisia shavisia \
  | gzip > "$BACKUP_DIR/shavisia-$(date +%F).sql.gz.tmp"
mv "$BACKUP_DIR/shavisia-$(date +%F).sql.gz.tmp" \
   "$BACKUP_DIR/shavisia-$(date +%F).sql.gz"

find "$BACKUP_DIR" -name 'shavisia-*.sql.gz' -mtime +7 -delete
