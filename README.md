# Sri Lanka Navigator

Trip planner and local-guide marketplace for international visitors to Sri Lanka. This repo is **Phase 1** of [Website-Plan.md](Website-Plan.md): the planning tool plus a read-only, admin-curated provider directory. Bidding, escrow and in-app booking come in later phases.

## What's here

| Package | What it is |
|---|---|
| `apps/web` | Next.js 16 (App Router, Tailwind v4). Mobile-first UI following the mockups in `UI/`. PWA manifest and offline service worker. |
| `apps/api` | NestJS 11 + Prisma 6 + PostgreSQL. REST API under `/api`. |
| `packages/core` | Shared TypeScript: budget maths, leg estimates, route ordering, seasons. The browser (live updates) and the API (saved trips) use the same code, so the numbers always match. |

Phase 1 features:

- Visual onboarding (interests, trip length, budget) that builds a starter route
- Planner: map, drag-to-reorder route rail, nights per stop, transport mode per leg, "near X, add Y" suggestions, monsoon overlay
- Live budget in 8 currencies, with sliders for stays, food, guide days and buffer
- "Book it myself" per-leg mode comparison (informational until Phase 3)
- Planning without an account (saved locally, imported on sign-up)
- My Trips: rename, duplicate, archive, delete
- 43 curated places with seasons, fees, hours, safety and accessibility notes; 5 themed itineraries
- Guide directory showing only approved profiles, with verification and "new provider" badges
- Admin console: add, edit, approve or reject providers; fact-check location fees and hours. Every action is audit-logged.

## Getting started

Requires Node 22+ and PostgreSQL 16+.

```bash
npm install
cp apps/api/.env.example apps/api/.env               # then fill in JWT_SECRET and the seed passwords
cp apps/web/.env.local.example apps/web/.env.local   # optional: Google Maps key
createdb sri_lanka_navigator
npm run db:migrate
npm run db:seed
npm run dev          # core (watch) + API on :4000 + web on :3000
```

Open http://localhost:3000. Sign in to `/admin` with the `SEED_ADMIN_*` account from `apps/api/.env`.

### Google Maps

- **Browser map:** set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (Maps JavaScript API) in `apps/web/.env.local`. Without it, the app draws its built-in stylised island map. That fallback is fully usable for development.
- **Drive times:** set `GOOGLE_MAPS_SERVER_KEY` (Routes API) in `apps/api/.env`. Without it, legs use terrain-aware estimates, marked "~" in the UI. Trains and buses always use estimates, because Google has no reliable Sri Lankan transit data.

## Tests

```bash
npm test                        # core + API unit tests
createdb sri_lanka_navigator_test
cp apps/api/.env.test.example apps/api/.env.test
npm run test:e2e -w api         # API end-to-end tests (auth, trip ownership, admin gating) against the test DB
```

## Notes

- **Content accuracy:** place fees and opening hours are approximate. They show "not yet verified" until an admin marks them checked in `/admin`. Seeded providers are flagged `isSample` and labelled "Sample profile" in the UI. Replace them before launch.
- **NTFS volume:** the repo currently sits on an NTFS (Tuxera) disk. There, Turbopack's dev server keeps losing its own manifest files (`ENOENT`/`EBADF` on rename) and eventually hangs. So `npm run dev` uses webpack, which is stable there, and Turbopack's dev cache is off (`NEXT_DEV_FS_CACHE`). On an APFS or ext4 disk, use `npm run dev:turbo -w web` for faster reloads. Don't run `npm run build` while `npm run dev` is running; they share `apps/web/.next`.
- **Not in Phase 1:** trip posting and bidding, messaging, escrow payments, reviews, provider self-registration, transport ticketing. See [Website-Plan.md](Website-Plan.md) §4.
