# Sri Lanka Navigator — Website Plan

**Status:** Draft v1 · 2026-09-30
**Sources:** `Project proposal/Sri Lanka Tour Booking Platform.pdf` (pitch deck), `Project proposal/Sri Lanka Tour Booking Platform — Product Plan.pdf` (Product Plan, 21 Sep 2026), `UI/` (Web and Mobile brand/UI mockups).
**Precedence:** Where the two PDFs disagree, the Product Plan (newer, more detailed) wins. Conflicts are listed in §13.

---

## 1. Summary

Sri Lanka Navigator is a three-sided marketplace for international tourists:

1. **Travelers** plan a whole trip in one place (map, locations, budget, transport).
2. They then either **post the trip for bids** from verified local guides and tour companies, or **self-book** vehicles, trains and buses.
3. **Guides and companies** get qualified, ready-to-quote trip requests.
4. The platform earns a commission and owns the trust layer (verification, blind mutual ratings, escrow).

The website is the primary product at launch. It is a mobile-first, responsive web app and PWA. Native apps come later.

## 2. Goals and success metrics

| Goal | Metric (initial target, to be confirmed) |
|---|---|
| Planning tool is sticky (Phase 1) | Saved-trip rate, 7- and 30-day return rate, trips with ≥5 stops |
| Supply will bid (Phase 2) | Verified providers, bids per posted trip (target ≥3), bid response time |
| Demand books on-platform | Post-to-booking conversion, off-platform leakage (messages flagged) |
| Trust holds | Dispute rate, review completion rate, refund rate |
| Revenue | GMV, take rate (10–15%), promoted-listing revenue |

Instrumentation (product analytics and error tracking) is part of launch, not an afterthought (see §9).

## 3. Users and roles

| Role | What they do on the site |
|---|---|
| **Traveler** | Browse locations, build and save trips, budget, post for bids, compare bids, pay into escrow, message, rate |
| **Tour guide** (freelance) | Register with ID, SLTDA licence, languages, specialties, areas; bid; manage calendar; get rated |
| **Tour company** | Business registration, insurance, fleet; multiple guides and vehicles under one account; bid on larger or group trips |
| **Transport operator** (optional role) | Car, van or tuk-tuk rental and private drivers; availability calendar, pricing |
| **Platform admin** | Verify providers, moderate reviews, mediate disputes, manage payouts and commission, support tickets, content |

A person can hold both Traveler and Guide accounts, but on **separate profiles and dashboards**. This keeps ratings clean, so a guide cannot rate themselves.

## 4. Scope by phase

The roadmap sequences the two riskiest builds (bidding marketplace and live transport booking) so they are not both due before real-user learning.

### Phase 1 — Planning tool and directory (no marketplace)
- Marketing site, traveler accounts, onboarding quiz
- Interactive map, location pages, recommendations
- Budget planner, transport info (informational only)
- Save and revisit trips ("My Trips")
- Read-only guide/company directory, **admin-entered** profiles to seed supply
- **Exit criterion:** people come back to the planner.

### Pilot (between Phase 1 and 2)
- Onboard about 20–50 guides/companies in one region
- Run bidding semi-manually before opening it platform-wide

### Phase 2 — Marketplace MVP
- Provider self-registration and admin verification queue
- Trip posting, bidding (48–72 h deadline), side-by-side comparison, in-app chat
- Escrow payments, mutual-blind ratings, dispute flow
- **Exit criterion:** guides bid and travelers book through the platform.

### Phase 3 — Self-planned booking
- Vehicle rental booking with availability calendars
- Train and bus timetables; ticketing only where a real API or partnership exists
- Combined-itinerary checkout

### Phase 4+ — Growth
- Featured/promoted listings, themed itineraries, multi-language (Sinhala/Tamil, then German/French/Chinese/Russian)
- Group/split-cost trips, referral program, provider analytics, instant-book, offline mode, SOS and live tracking, insurance upsell

**Out of scope (open question):** hotel/accommodation booking. It is a separate inventory problem and needs an explicit decision.

## 5. Information architecture (sitemap)

```
Public
├─ Home (hero, how it works, featured itineraries, trust signals)
├─ Explore
│  ├─ Map (clustered, filterable)
│  ├─ Locations list → Location detail
│  └─ Themed itineraries (P4)
├─ Plan a trip (planner: stops → route → budget → transport)
├─ Guides & companies (directory) → Provider profile
├─ How it works (travelers) / Become a guide (providers)
├─ Trust & safety, Cancellation & refund policy, Pricing/fees
├─ Blog / travel guides (SEO content)
└─ Help, Contact, Legal (Terms, Privacy, Cookies)

Traveler dashboard
├─ My Trips (drafts, posted, booked, archived; duplicate/rename)
├─ Bids on my trip (compare, shortlist, accept)
├─ Bookings (guided + transport tickets)
├─ Messages
├─ Payments & receipts
└─ Profile, currency, language, notifications

Provider dashboard (guide / company / transport)
├─ Profile & verification status
├─ Trip requests (matching) → Submit bid
├─ My bids, Bookings, Calendar
├─ Messages, Payouts, Reviews
├─ Team & fleet (company)
└─ Analytics (P4), Promotion (P4)

Admin (separate internal app)
├─ Verification queue
├─ Disputes, Reviews moderation
├─ Payouts & commission, Support tickets
└─ Content (locations, timetables), Audit log
```

## 6. Key pages and flows

### 6.1 Traveler onboarding
Short, visual: interests (wildlife, culture, beaches, adventure, food, wellness) → trip length → rough budget → personalized location suggestions. No blank map on first visit.

### 6.2 Trip planner (centerpiece)
- Map with clustering by region; filters by category, distance from itinerary, opening hours
- Drag-and-drop stop reordering; marker tap shows a quick-preview card; animated route line with drive times
- Suggestions ("you're near Ella — add Nine Arch Bridge")
- Live budget planner: per-category sliders (accommodation tier, transport, entry fees, food, guide fees, contingency), home-currency display with daily FX, cost-breakdown chart
- Transport options per segment (private car, self-drive, tuk-tuk, bus, train) with rough cost/duration
- Autosave as draft; revisit from My Trips as a plotted route

### 6.3 Fork: guide or self-book
One decision point at the end of planning:
- **Post for bids** → Phase 2 flow
- **Book myself** → Phase 3 flow (shares the same map, locations and budget)

### 6.4 Guided booking (Phase 2)
Post trip (dates, stops, group size, budget range, preferences) → matching providers notified → bids arrive in real time (WebSocket) → compare side by side (price, rating, response time, inclusions) → message shortlisted bidders → accept → escrow payment → losers auto-notified → trip → 3-day delayed blind review.

Progress indicator across: Plan → Post → Compare bids → Book.

### 6.5 Escrow state machine
`booking confirmed → trip start → trip end + hold window (24–48 h) → auto-release (minus commission) unless dispute opened`. The hold window and dispute cutoff need sign-off from support and legal before build.

### 6.6 Provider registration and verification
Sign up → documents (ID, SLTDA licence, business registration, insurance) → `pending` (invisible to travelers) → admin review (document check, registry validation, ideally a call) → `approved` (badge) or `rejected` (reason, resubmit). The VerificationStatus enum is pending / approved / rejected / resubmitted.

### 6.7 Self-planned checkout (Phase 3)
Mix modes (train Colombo→Kandy, car Kandy→Ella, bus Ella→Galle) and pay once. Each leg has its own confirmation and ticket. Commission applies only where the platform actually processes payment; train and bus legs stay informational until a payment integration exists.

### 6.8 Ratings and trust
- Travelers rate punctuality, knowledge/communication, value, safety, would-recommend, plus text and photos
- Providers rate travelers on clarity, respectfulness and payment reliability, as a private reputation score
- Reviews are only allowed on completed, paid bookings; blind until both submit or a deadline passes
- Displayed signals: verification badge, review count, response time, completion rate, years on platform, "new provider" label

## 7. Content plan

| Content | Source | Notes |
|---|---|---|
| Location pages | Curated at launch, enriched by reviews and guide contributions | Description, best time, fees, hours, photos, accessibility, safety, amenities (ATM, hospital, restrooms), typical duration |
| Themed itineraries | Editorial | e.g. 7-day Cultural Triangle, South Coast honeymoon |
| Seasonal/weather overlay | Editorial and data | West/south and east coast monsoons differ |
| Festival calendar | Editorial | Esala Perahera, Sinhala/Tamil New Year |
| SEO blog/guides | Editorial | Top-of-funnel: "Kandy to Ella train", "best time to visit…" |
| Policy pages | Legal | Cancellation/refund tiers, liability stance, verification method |
| Transport timetables/fares | Ops | Ongoing upkeep is an ops cost |

**Seed scope for Phase 1:** choose an initial region and location count (proposal: start with the Cultural Triangle, Hill Country and South Coast; ≥100 curated locations).

## 8. UI/UX direction

Mockups exist in `UI/Sri Lanka Navigator — UI Web.html` and `UI/Sri Lanka Navigator — UI Mobile.html` (titled "Brand & UI"). These are bundled single-file exports and the screen contents could not be read programmatically. **The design system (colors, type, components) should be taken from these files directly when the build starts. Nothing in this plan overrides them.**

Product Plan requirements (§13):
- **Mobile-first**, bottom navigation on mobile (Map, Trips, Messages, Profile), large tap targets
- Photo-forward, card-based layouts; real Sri Lankan imagery
- Light and dark mode; one accent colour, small consistent design system
- PWA: add-to-home-screen and offline saved itinerary
- Micro-interactions: skeleton loaders, button feedback, saved-trip confirmation, subtle bid badge (no intrusive alerts)
- Accessibility from day one: WCAG AA contrast, readable type, screen-reader markup

Suggested implementation: Tailwind CSS with shadcn/ui components.

## 9. Technical architecture

| Layer | Choice | Notes |
|---|---|---|
| Frontend | **Next.js (React)** + Tailwind + shadcn/ui | SSR/SSG for SEO pages, PWA for app feel |
| Backend | Node (NestJS) **or** Python (FastAPI/Django) | Pick what the team knows; REST or GraphQL |
| Database | PostgreSQL + PostGIS; Redis | Relational core, geo queries, cache, queues |
| Maps | Mapbox or Google Maps Platform | Geocoding, routing, drive times; compare cost at expected volume |
| Payments | Stripe Connect (+ PayHere for LKR if needed) | **Verify** Sri Lankan payouts and foreign-card acceptance first |
| Realtime | WebSockets (Socket.IO) | Bids and chat |
| Notifications | Email, SMS, WhatsApp, web push | Bid alerts, confirmations |
| Storage | S3-compatible, encrypted at rest, signed URLs, admin-only for verification docs | ID/passport/business docs are sensitive |
| Admin | Separate internal panel | Can start as a simple dashboard |
| Observability | Sentry + PostHog/Amplitude | Before launch |
| Hosting | PaaS (Vercel + Render/Railway + managed Postgres) for MVP | Move to AWS/GCP when scale proves out |
| i18n | next-intl (or equivalent) from day one | English first, structure ready for more locales |

### Data model
Entities (from the Product Plan): User, GuideProfile/CompanyProfile, Location, Trip, Bid, Booking, TransportBooking, Review, Payment, Message, Notification, AuditLog, Dispute.
Still to add when a real schema is cut: Trip–Location and Company–Guide join tables, normalized currency/locale fields, and the VerificationStatus enum.

## 10. Delivery plan

Estimates are rough and assume a small team (2–3 engineers, 1 designer, part-time ops). Adjust once the team is set.

| Stage | Weeks | Deliverables |
|---|---|---|
| 0. Foundations | 2–3 | Legal/liability stance, refund policy, PSP feasibility check, design system from `UI/` mockups, repo, CI, hosting, analytics |
| 1. Planning MVP | 8–10 | Marketing site, accounts, onboarding, map, location pages, budget planner, My Trips, directory (admin-seeded), PWA |
| Pilot | 4–6 | 20–50 providers in one region, manual matching, feedback loop |
| 2. Marketplace MVP | 10–12 | Provider registration, verification queue, trip posting, bidding, chat, escrow, reviews, disputes, admin panel |
| 3. Self-planned booking | 8–10 | Vehicle rental, timetables, ticketing where possible, combined checkout |
| 4. Growth | ongoing | Items from §4, prioritized by usage data |

## 11. Non-functional requirements

- **Performance:** Core pages fast on mid-range phones and patchy connections; image optimization, lazy-loaded map
- **SEO:** SSR location and provider pages, structured data, sitemap, multilingual `hreflang`
- **Security and privacy:** Encryption at rest for verification docs, role-based access, rate limits on new accounts, audit log, GDPR-style consent for EU travelers, PCI scope kept with the PSP
- **Reliability:** Error tracking, backups, payment webhooks idempotent and reconciled
- **Accessibility:** WCAG 2.1 AA
- **Fraud controls:** Reviews locked to paid bookings, new-account rate limits, basic sybil and fake-bid detection

## 12. Risks and open decisions

Resolve the legal and payment items first. They touch money and safety.

**Legal and liability**
1. Who is liable for injury, no-show or stranded travelers? A written liability and insurance stance is needed before guides take paying customers.
2. Verification must validate SLTDA licences against the real registry and confirm company registration and insurance. Decide who does it (this is recurring manual work).
3. Cancellation/refund tiers and no-show rules, before escrow goes live.
4. Local lawyer review: tour-operator licensing, platform registration, consumer protection.

**Financial**
5. FX: which currency the traveler pays in versus the provider's payout currency, and who absorbs movement.
6. Confirm Stripe Connect (or alternative) supports Sri Lankan bank payouts and foreign cards.
7. Confirm escrow hold window and dispute cutoff.

**Product and data**
8. Train/bus data: API, partnership or scraping? This affects Phase 3 timing and whether commission can apply.
9. Hotels/accommodation: in or out of scope?
10. Native apps versus web-only at launch (this plan assumes web and PWA first).
11. Operational headcount for verification, disputes and price/timetable upkeep.

## 13. Discrepancies between the pitch deck and the Product Plan

| Topic | Pitch deck | Product Plan | Used here |
|---|---|---|---|
| Commission | Flat 15% | 10–15%, tunable by category; smaller cut on self-planned bookings | Plan |
| Operator fees | "Premium features" for operators | Free at launch; subscription revisited later | Plan |
| Apps | Full iOS and Android apps in Q2–Q3 | Web-responsive and PWA first; native later | Plan |
| Timeline | MVP Q1 2024, AI recommendations Q4 2024+ | Phased roadmap, no dates | Plan (deck dates are stale) |
| Hotels | Not addressed (deck mentions eco-lodges as operators) | Open question | Open |
| Ads | Sponsored listings and ads | Featured/promoted listings, always labelled, never hiding ratings | Plan |

## 14. Immediate next steps

1. Confirm the open decisions in §12 (hotels, native apps, launch region, team).
2. Extract the design system (palette, type, components) from the `UI/` mockups into a token file.
3. Run the legal/PSP feasibility checks in parallel with design.
4. Finalize the Phase 1 backlog and begin Stage 0.
