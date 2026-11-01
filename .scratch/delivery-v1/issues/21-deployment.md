# 21: Deployment

**What to build:** The site runs on the developer's free-tier Oracle Ampere A1 (ARM) server with HTTPS on the shop's domain, images are built for ARM in GitHub Actions, and Postgres and photos are backed up nightly with a tested restore.

**Blocked by:** 01–20

**Status:** ready-for-human

- [ ] Docker Compose on the server with Caddy for automatic HTTPS on the shop's domain
- [ ] ARM images built by GitHub Actions, never on the server
- [ ] Production settings and secrets supplied through environment variables, not committed
- [ ] Nightly backups of Postgres and photos to Oracle Object Storage plus one copy off Oracle
- [ ] A restore has been tested end to end
- [ ] Handover note: the shop's data lives in the developer's personal Oracle account; document how to hand it over or move it
- [ ] Needs from the shop: domain name, display name, logo and brand colour (if any)
