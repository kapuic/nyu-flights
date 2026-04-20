# Part 3 Roadmap

## Goal

Build the Part 3 full-stack web app on top of the existing airline reservation database from Part 2.

## Phase 1: Foundation

- [x] Set up the app shell and routing.
- [ ] Configure environment variables for PostgreSQL.
- [ ] Add Drizzle with a PostgreSQL driver.
- [ ] Add a small database layer for running `sql`` queries.
- [ ] Verify the app can connect to the existing database.

## Phase 2: Public + Customer Flows

### Public Home Page

- [ ] Build a not-logged-in home page.
- [ ] Implement public future-flight search by source city/airport, destination city/airport, and departure date.
- [ ] Support both one-way and round-trip search.
- [ ] Add customer registration.
- [ ] Add airline staff registration.
- [ ] Add customer login.
- [ ] Add airline staff login.
- [ ] Show clear login failure states.

### Customer Home Page + Use Cases

- [ ] Build a customer-only home page with only customer-relevant actions.
- [ ] Show future flights by default in `View My Flights`.
- [ ] Support filtering purchased flights by date range and optional source/destination.
- [ ] Implement customer flight search from the logged-in experience too.
- [ ] Implement ticket purchase with card type, card number, name on card, expiration date, and purchase timestamp.
- [ ] Enforce seat availability before purchase using ticket count versus airplane capacity.
- [ ] Restrict ticket purchase to logged-in customers only.
- [ ] Implement ratings and comments for completed past flights only.
- [ ] Add customer logout.

## Phase 3: Airline Staff Flows

- [ ] Build an airline-staff-only home page with only staff-relevant actions.
- [ ] Show future flights for the next 30 days by default.
- [ ] Support staff flight filtering by date range, source, and destination.
- [ ] Show all customers for a selected flight.
- [ ] Implement create-flight flow.
- [ ] Restrict create-flight to authorized staff only.
- [ ] Implement flight status updates between `on_time` and `delayed`.
- [ ] Implement add-airplane flow.
- [ ] Restrict add-airplane to authorized staff only.
- [ ] Show all airplanes owned by the staff member's airline after airplane creation.
- [ ] Implement flight ratings view with average rating plus all comments.
- [ ] Implement reports for ticket sales by date range.
- [ ] Implement summary reports for last month and last year.
- [ ] Implement month-wise ticket sales in a bar chart or table.
- [ ] Add staff logout.

## Phase 4: UI Polish

- [ ] Landing page / dashboard.
- [ ] Form validation and error states.
- [ ] Loading states and empty states.
- [ ] Responsive layout for desktop and mobile.

## Phase 4: Auth, Security, and Validation

- [ ] Hash passwords with `bcrypt`.
- [ ] Create a shared session guard for customer routes.
- [ ] Create a shared session guard for airline staff routes.
- [ ] Validate all form inputs on the server.
- [ ] Prevent SQL injection by using parameterized queries everywhere.
- [ ] Avoid `dangerouslySetInnerHTML` for comments and other user-provided text.
- [ ] Prevent users from accessing staff-only mutations without staff authorization checks.
- [ ] Prevent customers from rating flights they have not completed.

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
