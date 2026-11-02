# Deployment

The site runs on the developer's free-tier Oracle Ampere A1 (ARM) server with Docker Compose. Caddy gets the HTTPS certificate for the shop's domain by itself. Images are built for ARM by GitHub Actions (`.github/workflows/images.yml`) and pulled by the server; nothing is built there.

| Part | Where |
| --- | --- |
| `compose.prod.yaml` | Production stack: db, api, web, proxy (Caddy), backup |
| `proxy/Caddyfile.prod` | Caddy config; the domain comes from `SITE_DOMAIN` |
| `.env.prod` | Secrets and settings, on the server only, never committed (template: `.env.prod.example`) |
| `ops/` | Backup, restore and schedule scripts, and the restore drill |

## What the shop must give us

Domain name, display name, logo and brand colour (if any; green until then). Set `SHOP_NAME` in `.env.prod`. The logo and brand colour need a code change to the design tokens in `web/src/styles/tokens.css`.

## First-time server setup

Human steps; nothing here is automated.

1. **Server.** Create the Ampere A1 instance (Ubuntu, arm64). In the subnet's security list and the instance firewall, open TCP 80 and 443 (and 22 for you). Install Docker with the Compose plugin.
2. **Domain.** Point the shop domain's `A` record at the server's public IP. Caddy cannot get a certificate until this resolves.
3. **Images.** After the first push to `main`, the Images workflow publishes `ghcr.io/<owner>/<repo>/{api,web,backup}`. Make the packages public, or run `docker login ghcr.io` on the server with a token that has `read:packages`.
4. **Files on the server.** Copy `compose.prod.yaml` and `proxy/Caddyfile.prod` (keep the `proxy/` folder) and `.env.prod.example`:

   ```bash
   cp .env.prod.example .env.prod   # then fill in every value
   chmod 600 .env.prod
   ```

5. **Backup buckets.** Create an Oracle Object Storage bucket and a Customer Secret Key (user settings in the Oracle console), and a bucket on a second provider that is not Oracle (any S3-compatible service). Fill the `RCLONE_CONFIG_ORACLE_*` and `RCLONE_CONFIG_OFFSITE_*` values in `.env.prod`.
6. **Start.**

   ```bash
   docker compose -f compose.prod.yaml --env-file .env.prod up -d
   docker compose -f compose.prod.yaml --env-file .env.prod exec api python manage.py createsuperuser --email ""
   ```

   The api runs migrations on start. After that, staff add each other from `/admin`.

## Updating

Merging to `main` publishes new images. On the server:

```bash
docker compose -f compose.prod.yaml --env-file .env.prod pull
docker compose -f compose.prod.yaml --env-file .env.prod up -d
```

To roll back, set `IMAGE_TAG` in `.env.prod` to an earlier commit SHA and run `up -d` again. Migrations only move forward, so a rollback across a migration needs a restore.

## Backups

The `backup` service runs `ops/backup.sh` every night at `BACKUP_HOUR`. Each run uploads a folder named by UTC time (`20261102T203000Z/db.dump` and `media.tar.gz`) to every remote in `BACKUP_REMOTES`, then deletes backups older than `BACKUP_KEEP_DAYS`. The run exits non-zero if any remote failed; check `docker compose logs backup` weekly, and that new folders keep appearing in both buckets (an idle always-free Oracle server can be reclaimed, so the off-Oracle copy is the one that matters).

Run one by hand:

```bash
docker compose -f compose.prod.yaml --env-file .env.prod exec backup /ops/backup.sh
```

## Restore

Restoring replaces the live database and photos. Stop traffic first:

```bash
docker compose -f compose.prod.yaml --env-file .env.prod stop api web
docker compose -f compose.prod.yaml --env-file .env.prod exec backup /ops/restore.sh --yes oracle:shop-backups            # newest
docker compose -f compose.prod.yaml --env-file .env.prod exec backup /ops/restore.sh --yes offsite:shop-backups 20261102T203000Z   # a named one
docker compose -f compose.prod.yaml --env-file .env.prod start api web
```

If Oracle is gone, use the `offsite:` remote on a new server: do steps 1–5 of "First-time server setup", start only `db` and `backup` (`up -d db backup`), restore, then start everything.

### Testing a restore

Two levels, both required before go-live (ticket 21):

- **Anywhere, no cloud accounts:** `ops/drill.sh` starts a throwaway Postgres, backs up to a local folder, deletes the data, restores it and checks the rows and photo came back. Needs Docker only.
- **On the server, against the real buckets:** restore into a scratch database and folder so live data is untouched, and compare:

  ```bash
  docker compose -f compose.prod.yaml --env-file .env.prod exec -e RESTORE_DB=restore_test -e MEDIA_DIR=/tmp/media-test backup \
    /ops/restore.sh --yes offsite:shop-backups
  docker compose -f compose.prod.yaml --env-file .env.prod exec db psql -U supermarket -d restore_test -c "select count(*) from orders_order"
  ```

  Do this once for each remote, then drop it: `... exec db psql -U supermarket -d postgres -c "drop database restore_test"`.

## Handover

The shop's data (server, buckets, backups) lives in the developer's personal Oracle account. If that arrangement ends, either move the stack or hand over the account:

**Move to a new server** (the shop's own cloud account or any Linux ARM or x86 host):
1. Take a fresh backup (`exec backup /ops/backup.sh`) and note the stamp.
2. On the new host, do steps 1–5 of "First-time server setup", then start only the database and backup service: `docker compose -f compose.prod.yaml --env-file .env.prod up -d db backup`. For x86 hosts, run the Images workflow with the platform changed to `linux/amd64`.
3. Restore from the offsite remote as in "Restore", point the domain's `A` record at the new IP, and start everything. Caddy gets a new certificate on its own.
4. Give the shop's owner the `.env.prod` values (they must be able to rotate the secrets), the GitHub repository, the domain registrar login, and the bucket credentials, then rotate all of them.

**Hand over the Oracle account:** Oracle does not transfer personal accounts. Create the shop's own tenancy and follow "Move to a new server".

Keep a copy of `.env.prod` somewhere safe (a password manager): the backups restore data, but they do not contain the secret key, so a lost `.env.prod` means staff must sign in again and secrets must be reissued.
