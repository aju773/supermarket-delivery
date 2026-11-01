# Supermarket delivery

Website for a local supermarket: customers browse the catalog and place delivery orders; staff manage orders and the catalog from an admin under `/admin`.

## Layout

- `api/`: Django + Django Ninja backend, PostgreSQL, managed with uv
- `web/`: Next.js App Router frontend (customer site and staff admin) plus Playwright end-to-end tests, managed with pnpm
- `docs/`: agent workflow docs and ADRs
- `.scratch/`: specs and tickets (see Issue tracker below)

The current spec is `.scratch/delivery-v1/spec.md`.

## Agent skills

### Issue tracker

Specs and tickets are local markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default labels, written as a `Status:` line in each ticket. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
