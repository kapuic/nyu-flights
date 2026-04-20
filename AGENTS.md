# Project AGENTS.md

## What this project is

This repository is for the Spring 2026 CS-UY 3083 Intro to Databases course project: an online Air Ticket Reservation System.

The project has 3 parts:

- Part 1: ER diagram design for the system.
- Part 2: relational schema, SQL table definitions, and database queries.
- Part 3: the actual full-stack web application built on top of the Part 2 database.

Part 3 is the main implementation phase and should be treated as a real product, not just a thin class demo.

## Roadmap requirement

Before making changes, always check `ROADMAP.md` to understand:

- implementation phases
- remaining requirements
- testing/demo expectations
- course deliverables still to prepare

Do not ignore the roadmap.

## Product mindset

Treat this project like a real production-ready startup product.

That means:

- prioritize correctness, UX, and maintainability
- do not aim for the bare minimum just because it is a class project
- build flows end-to-end, not just isolated pages
- keep the product responsive and polished on both desktop and mobile
- keep role separation and permissions strict
- design and implement with realistic product quality expectations

## Tech Direction

- TanStack Start
- React
- Tailwind CSS v4
- shadcn/ui base preset
- PostgreSQL from the project root `docker-compose.yml`
- Explicit SQL queries for professor-visible database logic
- `bcrypt` for password hashing
- server-side sessions with secure cookie-based auth
- TanStack DB for browser-local draft state where draft data is not in the DB schema

## Ground Rules

### Project constraints from spec

- Use the Part 2 table definitions unless a small, justified schema change is required.
- Keep the app demoable locally or remotely for the final test session.
- Implement separate role-aware experiences for traveler-facing users and airline staff.
- Return users to the correct home page after actions, with visible success or error feedback.
- Keep the interface usable and simple rather than over-designing it.

### Engineering rules

- Keep important database logic in real SQL statements.
- Avoid hiding core queries behind ORM convenience helpers.
- Reuse the Part 2 schema rather than inventing a new schema unless Part 3 requires schema changes.
- Keep the app structure simple and easy to demo.
- Enforce authorization on the server, not only in the client UI.
- Use prepared statements / parameterized SQL for all free-form inputs.
- Use session-based authentication with login, session validation, and logout.
- Rely on React's default escaped JSX rendering for normal text output, and avoid unsafe raw HTML rendering.
- Note the React/XSS protection choice explicitly in the final deliverables.

## Design source of truth

Use Stitch MCP to access the Skyward Airline Platform design views/files.

Always refer to those design views/files when implementing UI, but keep these important caveats in mind:

1. The design views are not in the shadcn/ui design system. The implementation must use shadcn/ui.
2. The views may not be fully consistent. Normalize them during implementation.
3. For public/customer pages, always use a top navbar layout.
4. For staff views, always use a left nav panel layout.
5. For the staff left-nav pattern, always use:
   - `bunx shadcn@latest add sidebar-07`
6. For sign in and sign up pages, use these specific shadcn block sets:
   - traveler-facing/public auth: `login-04` and `signup-04`
   - staff auth: `login-03` and `signup-03`
   These were chosen intentionally:
   - `login-04` / `signup-04` are broader and more product-facing, which fits the traveler experience better.
   - `login-03` / `signup-03` are more compact and restrained, which fits the internal staff tool better.
   Source catalogs:
   - <https://ui.shadcn.com/blocks/login>
   - <https://ui.shadcn.com/blocks/signup>
7. The design views are desktop-oriented, but the implementation must be fully responsive via Tailwind CSS.
8. Every page should be built carefully and deliberately. Do not rush page quality.
9. On mobile, the experience should feel native, not like a desktop page merely shrunk down.

## Traveler vs staff structure

Treat the product as two main experiences:

### Traveler-facing product

This unifies anonymous visitors and signed-in customers into one continuous experience.

- Search can be public.
- Booking, history, reviews, payment/account actions require sign-in.
- Authentication should act as progressive gating, not as a completely separate product.

### Staff-facing product

This is a true operations dashboard.

- It should use a dashboard-like information architecture.
- It should use a left navigation panel layout.
- It should feel like airline operations software, not a generic SaaS dashboard.

## Local draft data

For all draft features that are not represented in the real database schema, store drafts in browser local storage.

This includes drafts such as:

- draft reviews
- draft airlines
- draft flights
- and other draft entities not yet committed to the real DB

Do not invent DB schema changes just to store drafts.

Use a good local database/state solution on top of local storage, specifically:

- TanStack DB

## Implementation quality bar

When building pages or flows:

- use shadcn/ui components wherever appropriate
- keep layouts coherent across the app
- keep public/customer pages visually related
- keep staff pages structurally consistent with the left-nav dashboard pattern
- design all important empty, loading, error, and success states
- make responsive behavior intentional
- put real effort into each page

A page is not done just because it renders. It must be good.
