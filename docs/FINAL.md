# Part 3 Final Project Hand In

Ka Pui Cheung (they/them) <kc5931@nyu.edu>, team of one

Professor: Ratan Kumer Dey <ratan@nyu.edu>

GitHub: <https://github.com/kapuic/nyu-flights>

## Tech Stack

Since the professor was interested in knowing the tech stack used throughout the project:

- [TanStack Start](https://tanstack.com/start/latest): full-stack React framework for routing, layouts, and server functions.
- [React](https://react.dev/): UI library for all public, customer, and staff pages.
- [TypeScript](https://www.typescriptlang.org/): typed language (JavaScript superset) used across the whole codebase.
- [Tailwind CSS](https://tailwindcss.com/): utility-first CSS framework for styling and responsive layout.
- [shadcn/ui](https://ui.shadcn.com/): reusable UI component system, configured here with the `base-ui` / `base-vega` preset.
- [TanStack Query](https://tanstack.com/query/latest) (aka React Query): data fetching, caching, and invalidation for server-backed UI data.
- [TanStack Form](https://tanstack.com/form/latest): form state and validation management.
- [TanStack Table](https://tanstack.com/table/latest): table engine used for the staff/admin data tables.
- [Zustand](https://zustand-demo.pmnd.rs/): client-side store for booking and checkout flow state.

- [Zod](https://zod.dev/): schema validation library for forms and server inputs.
- [bcrypt](https://github.com/kelektiv/node.bcrypt.js): password hashing and password verification.
- [postgres.js](https://github.com/porsager/postgres): PostgreSQL client used for explicit parameterized SQL queries.

- [PostgreSQL](https://www.postgresql.org/): relational database for flights, customers, tickets, staff, reviews, and sessions.

- [Vite](https://vite.dev/): development server and build tool.

I picked those technologies based on my personal preference and familiarity.

## Source Files

### src

| File                   | Purpose                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `src/router.tsx`       | Creates the main TanStack Router instance and injects shared context such as the current user and query client. |
| `src/routeTree.gen.ts` | Auto-generated route tree file used by TanStack Router for file-based routing.                                  |
| `src/styles.css`       | Global stylesheet with Tailwind CSS imports, theme tokens, and shared app-wide styling.                         |

#### src/routes

| File                                         | Purpose                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/routes/__root.tsx`                      | Root document/layout for the whole app, including theme setup, query provider, error pages, service worker registration, and router shell. |
| `src/routes/_globe.tsx`                      | Shared traveler-facing layout route that wraps the globe-based search experience and auth modal.                                           |
| `src/routes/_globe.index.tsx`                | Public homepage route with flight search, airport/date inputs, round-trip flow, result sorting, and booking handoff.                       |
| `src/routes/_globe.checkout.tsx`             | Checkout route for purchasing one-way or round-trip tickets and showing booking confirmation.                                              |
| `src/routes/account.tsx`                     | Parent layout route for traveler account pages.                                                                                            |
| `src/routes/account.index.tsx`               | Traveler account overview/profile page.                                                                                                    |
| `src/routes/account.payments.tsx`            | Traveler payments page that shows previously used cards from ticket purchase history.                                                      |
| `src/routes/account.security.tsx`            | Traveler security/settings page for password change and future security controls.                                                          |
| `src/routes/login.tsx`                       | Public traveler login page.                                                                                                                |
| `src/routes/register.tsx`                    | Public traveler registration page.                                                                                                         |
| `src/routes/trips.tsx`                       | Customer trips page for upcoming/past purchased flights and flight review access.                                                          |
| `src/routes/staff.tsx`                       | Staff entry route that wraps the staff application area.                                                                                   |
| `src/routes/staff.login.tsx`                 | Airline staff login page.                                                                                                                  |
| `src/routes/staff.register.tsx`              | Airline staff registration page.                                                                                                           |
| `src/routes/staff._dashboard.tsx`            | Main staff dashboard layout with sidebar navigation, command palette, role-aware sections, and staff auth guard.                           |
| `src/routes/staff._dashboard.index.tsx`      | Staff dashboard homepage/overview.                                                                                                         |
| `src/routes/staff._dashboard.flights.tsx`    | Staff flight management page for viewing flights and updating flight data/status.                                                          |
| `src/routes/staff._dashboard.fleet.tsx`      | Staff fleet management page for airplanes and fleet-related actions.                                                                       |
| `src/routes/staff._dashboard.passengers.tsx` | Staff passenger manifest page for viewing customers on selected flights.                                                                   |
| `src/routes/staff._dashboard.reports.tsx`    | Staff reporting page for ticket sales summaries, charts, and review data.                                                                  |
| `src/routes/staff._dashboard.profile.tsx`    | Staff profile page for editable personal and airline staff account information.                                                            |
| `src/routes/staff._dashboard.security.tsx`   | Staff security/settings page for password changes.                                                                                         |
| `src/routes/staff._dashboard.airlines.tsx`   | Superadmin page for airline records and airline management.                                                                                |
| `src/routes/staff._dashboard.airports.tsx`   | Superadmin page for airport reference data and airport management.                                                                         |
| `src/routes/staff._dashboard.customers.tsx`  | Superadmin page for customer account browsing, editing, and oversight.                                                                     |
| `src/routes/staff._dashboard.staff.tsx`      | Superadmin page for staff account browsing and management.                                                                                 |

#### src/components

| File                                           | Purpose                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/components/airport-combobox.tsx`          | Client-side airport autocomplete input that filters airport options with keyboard navigation and suggestion dropdown behavior.                         |
| `src/components/app-navbar.tsx`                | Top navigation bar for the traveler-facing app with search, trips, and account/sign-in links.                                                          |
| `src/components/auth-modal.tsx`                | Dialog modal that prompts unauthenticated users to sign in or register before continuing a protected action.                                           |
| `src/components/combobox-fields.tsx`           | Reusable combobox form fields for airlines, airports, airplanes, and countries built on shared combobox primitives.                                    |
| `src/components/country-flag.tsx`              | Small wrapper around `react-circle-flags` that renders circular country flags for valid two-letter country codes.                                      |
| `src/components/dashboard-data-table.tsx`      | Large reusable data table system with search, sorting, faceted filters, selection, CSV export, virtualization, row actions, and inline editable cells. |
| `src/components/date-time-picker.tsx`          | Popover-based date and date-time picker fields that bridge shadcn calendar inputs with the app’s string-based date formats.                            |
| `src/components/delete-confirmation.tsx`       | Generic confirmation dialog/drawer for destructive actions, with a temporary “don’t ask again today” option.                                           |
| `src/components/dialog-globe.tsx`              | Smaller COBE-based globe component used inside dialogs to show markers and flight arcs.                                                                |
| `src/components/flight-result-card.tsx`        | Presentational card for flight search results showing route, timing, rating, seats, price, and booking action.                                         |
| `src/components/globe-background.tsx`          | Full-screen animated 3D globe background for the public traveler experience.                                                                           |
| `src/components/login-form.tsx`                | Traveler login form and card layout that validate credentials, call the auth server function, and route users after sign-in.                           |
| `src/components/responsive-modal.tsx`          | Wrapper that renders a Dialog on desktop and a Drawer on mobile for the same modal content.                                                            |
| `src/components/review-dialog.tsx`             | Responsive dialog/drawer for customers to submit star ratings and optional comments on completed flights.                                              |
| `src/components/signup-form.tsx`               | Two-step traveler registration form with validation, country/state pickers, optional fake-data autofill, and full-page hero card layout.               |
| `src/components/staff-phone-numbers-sheet.tsx` | Staff-side sheet for viewing and editing airline staff phone numbers.                                                                                  |

##### src/components/ui

| File                 | Purpose                                                                                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ui/` | Shared shadcn/base-ui primitive components used across the app, such as buttons, inputs, fields, dialogs, drawers, popovers, tables, tabs, sidebars, selects, badges, and payment-related UI pieces. |

#### src/data

| File                                | Purpose                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `src/data/airport-coordinates.json` | Static airport metadata and coordinates used for globe rendering and airport display helpers outside the relational database schema. |

#### src/hooks

| File                           | Purpose                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `src/hooks/use-media-query.ts` | Reusable hook for checking whether a CSS media query currently matches. |
| `src/hooks/use-mobile.ts`      | Convenience hook for detecting mobile-sized viewports.                  |

#### src/lib

| File                           | Purpose                                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/airports.ts`          | Loads static airport coordinate data and exposes typed airport options plus helpers for lookup and display/search formatting.                                        |
| `src/lib/app-config.ts`        | Stores shared application-level constants such as the app name.                                                                                                      |
| `src/lib/auth-images.ts`       | Centralizes image URLs used on the traveler authentication pages.                                                                                                    |
| `src/lib/auth.server.ts`       | Main server-side authentication layer for login, registration, password checking, session creation, and current-user lookup.                                         |
| `src/lib/auth.ts`              | Thin TanStack Start server-function wrappers and shared auth types for current-user lookup, login, logout, and registration.                                         |
| `src/lib/booking-store.ts`     | Persisted Zustand store that tracks public flight search context, selected itinerary, auth modal state, payment draft metadata, and checkout confirmation data.      |
| `src/lib/db.ts`                | PostgreSQL client setup plus lazy initialization for the persistent `app_session` table.                                                                             |
| `src/lib/env.ts`               | Minimal environment reader for app name, database URL, and session secret with local-development fallbacks.                                                          |
| `src/lib/format.ts`            | Shared formatting helpers for currency, dates, datetimes, and status text.                                                                                           |
| `src/lib/queries.server.ts`    | Main server-side business logic module containing SQL-backed search, booking, review, dashboard, profile, reporting, and admin/staff/customer management operations. |
| `src/lib/queries.ts`           | Shared data contract file that defines app-level query result types and exposes validated server functions for all major backend operations.                         |
| `src/lib/query-client.ts`      | Creates and reuses the TanStack Query client with shared cache defaults.                                                                                             |
| `src/lib/schemas.ts`           | Central Zod schema and validator collection for auth, flights, reports, profile fields, phone normalization, and admin/staff/customer mutations.                     |
| `src/lib/session.ts`           | Cookie-backed TanStack Start session configuration used by the authentication system.                                                                                |
| `src/lib/staff-permissions.ts` | Hardcoded staff permission model that maps usernames to permission tiers and decides whether a user can manage all airlines or only their own.                       |
| `src/lib/staff-queries.ts`     | React Query option factories for staff dashboards, passengers, reports, and superadmin listing pages.                                                                |
| `src/lib/temporal.ts`          | Temporal-based helper library for parsing, comparing, formatting, serializing, and converting date-only and datetime values across UI and SQL boundaries.            |
| `src/lib/utils.ts`             | General utility helpers such as class merging and reusable error-message parsing.                                                                                    |

## Miscellaneous Files

- `seed.sql`: SQL file that recreates the schema and inserts the professor test scenario data adapted to the project’s final schema choices.

- `.env`: local environment file for database connection and session-related configuration.
- `.gitignore`: tells Git which generated, local, or dependency files should not be tracked.
- `.prettierignore`: tells Prettier which files to skip formatting.
- `.prettierrc`: Prettier formatting configuration, including the Tailwind CSS plugin.
- `bun.lock`: Bun lockfile for dependency resolution when using Bun.
- `components.json`: shadcn/ui configuration file that defines aliases, styling, and the base-ui/base-vega preset setup.
- `docs/`: contains supporting project documentation such as the progress report, design references, implementation notes, and page playbooks.
- `eslint.config.js`: ESLint configuration for linting the TypeScript/React codebase.
- `package-lock.json`: npm lockfile for dependency resolution when using npm.
- `package.json`: lists project dependencies, development dependencies, and scripts for running, building, linting, testing, and type-checking the app.
- `public/`: contains static public assets such as app icons, flags, textures, the web app manifest, offline page, and service worker.
- `README.md`: starter/template readme from the original TanStack Start + shadcn/ui scaffold.
- `ROADMAP.md`: project roadmap and checklist for required features, polish work, testing, and final deliverables.
- `scripts/`: contains helper scripts for development/testing tasks, such as seeding authentication test users.
- `tsconfig.json`: TypeScript compiler configuration, including strictness settings and path aliases.
- `vite.config.ts`: Vite configuration file that wires together TanStack Start, React, Tailwind, Nitro, and path-alias plugins.
