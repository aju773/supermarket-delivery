# Supermarket delivery

Delivery ordering website for a local supermarket. See `CLAUDE.md` for the repo layout and `.scratch/delivery-v1/spec.md` for the spec.

## Run locally

Needs Docker with Compose, plus uv and pnpm for working outside the containers.

```bash
cp .env.example .env
docker compose up --build
```

The site is at http://localhost:8090 (`PROXY_PORT` in `.env`). The proxy sends `/api` to Django and everything else to Next.js.

## Tests and checks

```bash
docker compose run --rm api pytest      # API tests against Postgres
cd web && pnpm test:e2e                 # Playwright, phone-sized, against the running stack
cd web && pnpm check:tokens             # no hard-coded values outside web/src/styles/tokens.css
cd web && pnpm check:contrast           # every text/background token pair meets WCAG AA
cd web && pnpm test:unit && pnpm typecheck
```

Playwright needs its browser once: `cd web && pnpm exec playwright install chromium`.
