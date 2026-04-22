# Part 3 Roadmap

## Goal

Build the Part 3 full-stack web app on top of the existing airline reservation database from Part 2.

## Phase 1: Foundation

- [x] Set up the app shell and routing.
- [x] Configure environment variables for PostgreSQL.
- [x] Add Drizzle with a PostgreSQL driver.
- [x] Add a small database layer for running `sql`` queries.
- [x] Verify the app can connect to the existing database.

## Phase 2: Public + Customer Flows

### Public Home Page

- [x] Build a not-logged-in home page.
- [x] Implement public future-flight search by source city/airport, destination city/airport, and departure date.
- [x] Support both one-way and round-trip search.
- [x] Add customer registration.
- [x] Add airline staff registration.
- [x] Add customer login.
- [x] Add airline staff login.
- [x] Show clear login failure states.

### Customer Home Page + Use Cases

- [x] Build a customer-only home page with only customer-relevant actions.
- [x] Show future flights by default in `View My Flights`.
- [x] Support filtering purchased flights by date range and optional source/destination.
- [x] Implement customer flight search from the logged-in experience too.
- [x] Implement ticket purchase with card type, card number, name on card, expiration date, and purchase timestamp.
- [x] Enforce seat availability before purchase using ticket count versus airplane capacity.
- [x] Restrict ticket purchase to logged-in customers only.
- [x] Implement ratings and comments for completed past flights only.
- [x] Add customer logout.

## Phase 3: Airline Staff Flows

- [x] Build an airline-staff-only home page with only staff-relevant actions.
- [x] Show future flights for the next 30 days by default.
- [x] Support staff flight filtering by date range, source, and destination.
- [x] Show all customers for a selected flight.
- [x] Implement create-flight flow.
- [x] Restrict create-flight to authorized staff only.
- [x] Implement flight status updates between `on_time` and `delayed`.
- [x] Implement add-airplane flow.
- [x] Restrict add-airplane to authorized staff only.
- [x] Show all airplanes owned by the staff member's airline after airplane creation.
- [x] Implement flight ratings view with average rating plus all comments.
- [x] Implement reports for ticket sales by date range.
- [x] Implement summary reports for last month and last year.
- [x] Implement month-wise ticket sales in a bar chart or table.
- [x] Add staff logout.

## Phase 4: UI Polish

- [x] Landing page / dashboard.
- [x] Form validation and error states.
- [x] Loading states and empty states.
- [x] Responsive layout for desktop and mobile.

### Post-audit action queue

- [x] Make the public home search control row stay on one line in its desktop presentation and keep the passenger/class controls visually compact.
- [x] Keep the public trip-type row in shadcn/ui semantics while aligning its spacing, density, and layout more closely to the Stitch composition.
- [x] Remove motion/hover affordances from non-clickable cards so only interactive elements signal interactivity.
- [x] Add a dedicated round-trip selection experience with outbound summary, return-step framing, and review progression instead of appending return results inline on `/`.
- [x] Upgrade the no-results state on `/` with actionable recovery controls such as adjusting dates and clearing filters.
- [x] Add a real traveler profile/details surface rather than overloading `My Trips` as the only account landing section.
- [x] Expand the traveler preferences UI into designed, non-persistent controls when the current PostgreSQL schema does not support storage, while keeping them out of live submission paths until backend support exists.
- [x] Add an account-security expansion plan for non-schema-backed features such as 2FA: implement the components and states, but keep them disconnected from live rendering and persistence until the product model supports them.
- [x] Replace the traveler checkout inline panel with a dedicated transactional checkout flow that supports passenger/contact details and a stronger booking summary.
- [ ] Decide intentionally which Stitch differences are product decisions versus parity gaps, especially branding and staff information architecture.
- [x] Add a dedicated staff passenger-manifest workspace with search/filter tools and bulk actions instead of rendering the manifest only inline under the dashboard table.
- [x] Add a deliberate staff status-update workflow screen if the product should favor operational review over the current one-click toggle.
- [x] Expand the staff fleet workspace with search, state filters, and richer aircraft status presentation without inventing unsupported database fields.
- [x] Expand the staff flight-creation UI with draft-oriented components and helper affordances, while keeping draft behavior local-only until the product has a supported persistence model.
- [ ] Replace all visible plain date inputs with the shadcn/ui base date-picker pattern and remove obsolete manual format hints.
- [ ] Add a real swap affordance to the public search row so the middle control both looks and behaves like a `From`/`To` switcher.
- [ ] Add debounced server-backed airport autocomplete for all visible `From`/`To` inputs, including airport code and city suggestions.
- [ ] Upgrade traveler signup step 2 so prior identity fields are hidden, add a back action, and add a randomized valid-detail filler for the remaining required fields.
- [ ] Replace editable phone inputs with masked inputs that preserve valid form values.
- [ ] Replace traveler `state` entry with a full US states combobox.
- [ ] Replace country inputs with comboboxes and show country flags in the option list.
- [ ] Strengthen TanStack Form-powered client validation and visible field errors across the touched auth and search flows.
- [ ] Refresh auth-page imagery with stronger airport, airplane, sky, beach, and vacation visuals.
- [ ] Add full visible TanStack Form validation coverage to the remaining public, customer, and staff search/report/create-flight flows.
- [ ] Add reusable date-time picker support for staff schedule creation and remove remaining native `datetime-local` controls.
- [ ] Add productized light, dark, and system theme support with a persistent theme picker and no-flash boot behavior.
- [ ] Replace critical hardcoded surface/text colors with semantic theme tokens across public, customer, auth, and staff shells before broad dark-mode rollout.
- [ ] Audit popovers, dropdowns, toasts, dialogs, and other overlay surfaces for theme consistency after the token migration.
- [ ] Compare Part 3 against `Coding/sapphyx` and document which optimization patterns are applicable versus intentionally out of scope.
- [ ] Evaluate a centralized query-key/query-options layer before any TanStack Query or local-first refactor.
- [ ] Add PWA/installability support only after theme and form work stabilize, including manifest, offline fallback, and service-worker update handling.
- [ ] Evaluate whether local-first cache/query refactors are justified for Part 3 flows and only apply them where the backend mutation model supports correct invalidation.

## Phase 4: Auth, Security, and Validation

- [x] Hash passwords with `bcrypt`.
- [x] Create a shared session guard for customer routes.
- [x] Create a shared session guard for airline staff routes.
- [x] Validate all form inputs on the server.
- [x] Prevent SQL injection by using parameterized queries everywhere.
- [x] Avoid `dangerouslySetInnerHTML` for comments and other user-provided text.
- [x] Prevent users from accessing staff-only mutations without staff authorization checks.
- [x] Prevent customers from rating flights they have not completed.

## Phase 5: Testing and Demo Readiness

- [ ] Test each use case with valid input.
- [ ] Test each use case with invalid input.
- [ ] Test unauthorized access attempts against staff-only actions.
- [ ] Test round-trip and one-way search flows.
- [ ] Test purchase failure when a flight is full.
- [ ] Test rating restrictions for future flights.
- [ ] Prepare a clean demo data set.
- [ ] Verify the app can be run on the host machine for the final demo.

## Deliverables and Course Admin

- [ ] Keep a work plan showing who is responsible for what.
- [ ] Prepare the mandatory progress report due on 2026-04-16.
- [ ] Keep all frontend and backend source code organized for final submission.
- [ ] Prepare a database backup with both schema and inserted data.
- [ ] Prepare a file inventory describing what each application file does.
- [ ] Prepare a separate use-case report listing each use case and its executed queries.
- [ ] Prepare a team contribution summary if this is a group project.
- [ ] Prepare for the final live demo and code explanation.

## Suggested Folder Structure

```text
src/
  components/
  routes/
  lib/
  db/
    index.ts
    queries/
      customers.ts
      flights.ts
      tickets.ts
      staff.ts
```

## Query Style

Use code shaped like this for real DB operations:

```ts
await db.execute(sql`
  select *
  from flight
  where departure_airport_code = ${departureCode}
    and arrival_airport_code = ${arrivalCode}
`)
```

## Immediate Next Steps

- [x] Read the Part 3 spec and turn it into concrete routes/pages.
- [ ] Add any missing tables or columns needed for ratings/comments and confirm schema deltas.
- [ ] Install the database packages.
- [ ] Create the database connection module.
- [ ] Implement the first end-to-end flow: public flight search.
