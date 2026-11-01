# Supermarket delivery

Website for a local supermarket: customers browse the catalog and place delivery orders; staff manage orders and the catalog from an admin under `/admin`.

## Layout

- `api/`: Django + Django Ninja backend, PostgreSQL, managed with uv
- `web/`: Next.js App Router frontend (customer site and staff admin) plus Playwright end-to-end tests, managed with pnpm
- `docs/`: agent workflow docs and ADRs
- `.scratch/`: specs and tickets (see Issue tracker below)

The current spec is `.scratch/delivery-v1/spec.md`.

## Commands

- Stack: `docker compose up --build` (needs `.env`, copied from `.env.example`); site on `http://localhost:8090`
- API tests: `docker compose run --rm api pytest` (Postgres in Docker; no host database)
- Web, from `web/`: `pnpm typecheck`, `pnpm check:tokens`, `pnpm check:contrast`, `pnpm test:unit`, `pnpm test:e2e` (needs the stack running)

## Design tokens

- Every colour, size, radius, shadow, spacing, layer and timing value comes from the one token file, `web/src/styles/tokens.css`. Never hard-code hex/rgb/hsl colours, pixel values or square-bracket Tailwind values anywhere else; add a named token instead. A CI check enforces this, with no exceptions.
- Tailwind's built-in colour palette is removed (ADR 0002). Use the names by purpose: shadcn/ui's own (`background`, `card`, `primary`, `muted`, `accent` = hover background, ...) plus ours (`page`, `topbar`, `brand`, `status-*`).
- Stitch screenshots are in `docs/design/`. The spec wins on what a screen contains; screenshots guide layout only. Don't copy values from them.

## Agent skills

### Issue tracker

Specs and tickets are local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, written as a `Status:` line in each ticket. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
