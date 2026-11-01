# 01: Walking skeleton: shop info on the home page

**What to build:** The whole stack runs locally with one command, and a customer opening the site sees the customer top bar and a home page info strip (open or closed now, delivery hours, minimum order) that comes from Shop Settings in the database. This sets up the backend, frontend, reverse proxy, test harnesses and the shared design system that every later ticket builds on.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Docker Compose runs Postgres, Django (Django Ninja API) and Next.js (App Router); a reverse proxy sends `/api` to Django and everything else to Next.js on one domain
- [ ] Configuration comes from environment variables, all documented in `.env.example`
- [ ] Backend is managed with uv, frontend with pnpm, matching the repo layout in CLAUDE.md
- [ ] Shop Settings exists as one record with defaults: minimum order, delivery charge, opening time, closing time, shop phone, orders-per-hour limit, and timezone (default Asia/Kolkata); money is stored as whole paise
- [ ] Shop Settings answers "is the shop open now?" and "next opening time" in the shop timezone
- [ ] A public endpoint (no login) returns the shop info the customer site needs
- [ ] Design system in place: shared colour and type tokens for both the customer site and the admin, Inter served from our own server with tabular figures, Phosphor Icons, Tailwind CSS with shadcn/ui copied in and restyled (no Polaris, per ADR 0001), light mode only, 16 px customer body text and 16 px form inputs
- [ ] Customer top bar shows the shop name, a call-the-shop button and a "My orders" link (the link may lead to a placeholder until ticket 17)
- [ ] Home page shows the info strip: open/closed now, delivery hours, minimum order amount formatted as ₹
- [ ] pytest with pytest-django runs API tests against the real Postgres in Docker; tests cover the shop info endpoint and open/closed/next-opening logic, including the timezone
- [ ] Playwright runs against the full Compose stack on a phone-sized screen; one smoke test opens the home page and sees the info strip
- [ ] Accessibility baseline set in the shared styles: visible focus outline, 44 px minimum tap targets, AA contrast
