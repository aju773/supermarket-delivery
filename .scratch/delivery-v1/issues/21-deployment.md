# 21: Deployment

**What to build:** The site runs on the developer's free-tier Oracle Ampere A1 (ARM) server with HTTPS on the shop's domain, images are built for ARM in GitHub Actions, and Postgres and photos are backed up nightly with a tested restore.

**Blocked by:** 01–20

**Status:** ready-for-human

- [x] (repo side: `compose.prod.yaml`, `proxy/Caddyfile.prod`; server not set up) Docker Compose on the server with Caddy for automatic HTTPS on the shop's domain
- [x] (workflow added, not yet run on GitHub) ARM images built by GitHub Actions, never on the server
- [x] (`.env.prod.example`; real `.env.prod` is yours to fill on the server) Production settings and secrets supplied through environment variables, not committed
- [x] (`ops/`; buckets and keys are yours to create) Nightly backups of Postgres and photos to Oracle Object Storage plus one copy off Oracle
- [ ] A restore has been tested end to end (local `ops/drill.sh` passes; the run against the real buckets on the server is still to do, see `docs/deployment.md`)
- [x] (`docs/deployment.md`) Handover note: the shop's data lives in the developer's personal Oracle account; document how to hand it over or move it
- [ ] Needs from the shop: domain name, display name, logo and brand colour (if any)

## Remaining for the human

Create and open the server, point the domain, create the Oracle and off-Oracle buckets and keys, fill `.env.prod`, first deploy, run the on-server restore test, and get the shop's domain, name, logo and colour. Steps are in `docs/deployment.md`.
