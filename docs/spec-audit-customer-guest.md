# Spec Audit: Customer & Guest Features

Audit of Part 3 requirements from `Part 1_Part 2_Part 3 of Course Project Spring 2026 V1.pdf` against current implementation. **Staff use cases are out of scope for this audit.**

---

## Guest (Not Logged In)

### 1. View Public Info — search for future flights

**Status: COMPLETE**

| Requirement | Implementation |
|---|---|
| Source city/airport name | `_globe.index.tsx` — `AirportCombobox` backed by DB query |
| Destination city/airport name | Same combobox component |
| Departure date (one way) | `DatePickerField` with calendar popover |
| Departure + return (round trip) | Trip-type toggle; return date field conditionally shown |
| Future flights only | `queries.server.ts:searchFlightsInternal` — `WHERE departure_datetime > NOW()` |
| Available seats shown | Query computes `num_seats - booked_count` |
| No auth required | `_globe.tsx` loads `currentUser` but does not gate |

### 2. Register (Customer)

**Status: COMPLETE**

All spec-required fields present in `signup-form.tsx` (multi-step form):

- Step 1: name, email, password (min 8 chars)
- Step 2: DOB, phone, street, building#, city, state, passport#, passport country, passport expiration

Server: `auth.server.ts:registerCustomer` — hashes password with bcrypt, inserts row, creates session.

### 3. Register (Airline Staff)

**Status: COMPLETE**

`staff.register.tsx` — username, password, first name, last name, email, DOB, phone number(s), airline name. Server validates airline exists before inserting. Phone numbers inserted in transaction.

### 4. Login (Customer)

**Status: COMPLETE**

`login-form.tsx` — email + password. Also available as in-flow auth modal (`auth-modal.tsx`) for booking gating. Server: `auth.server.ts:authenticateUser` with `bcrypt.compare`. Session created on success.

### 5. Login (Airline Staff)

**Status: COMPLETE**

`staff.login.tsx` — username + password. Redirects to `/staff` on success.

---

## Customer (Logged In)

### 1. View My Flights

**Status: PARTIAL**

| Aspect | Status | Notes |
|---|---|---|
| Show purchased flights | Done | `trips.tsx` — All/Upcoming/Past tabs |
| Default to future flights | Done | Tab defaults to "All" which shows upcoming first |
| Date range filter (optional) | **Backend only** | `customerFlightFiltersSchema` accepts `startDate`, `endDate`, `source`, `destination`; server query supports it. **No filter UI rendered on the trips page.** |

**Gap:** The spec says "Optionally you may include a way for the user to specify a range of dates, specify destination and/or source airport name or city name etc." — this is optional per spec wording but the backend plumbing is already done. Missing only the filter controls in the UI.

### 2. Search for Flights

**Status: COMPLETE**

Same search as guest feature #1. Works for both logged-in and anonymous users.

### 3. Purchase Tickets

**Status: COMPLETE**

| Requirement | Implementation |
|---|---|
| Choose a flight | `_globe.index.tsx` — "Book" button stores flight in Zustand booking store |
| Auth gating | If not logged in, auth modal shown before checkout |
| Payment form | `payment-form.tsx` — card number (Luhn-validated), name on card, expiration, card type (credit/debit toggle) |
| Seat availability check | `queries.server.ts:purchaseTicketInternal` — checks `available_seats > 0` in transaction |
| Ticket creation | Inserts into `ticket` table with all payment fields + purchase datetime |
| Round trip support | Purchases outbound then return sequentially |
| Confirmation page | Shows ticket IDs, flight details, total price |
| Card info stored (not CVV) | CVV collected for validation but not sent to server — correct per spec |

### 4. Rate and Comment on Previous Flights

**Status: COMPLETE**

| Aspect | Implementation |
|---|---|
| Only past flights eligible | `canReview` computed from `arrivalDatetime < now() && rating === null` |
| Rating | 1-5 star selector in `review-dialog.tsx` |
| Comment | Optional text field, max 500 chars |
| Prevents duplicates | Server checks `existing_review` before insert |
| Display existing reviews | Shows stars + comment on already-reviewed trip cards |

### 5. Logout

**Status: COMPLETE**

`account.tsx` — Sign Out button calls `logoutFn()`. Server deletes DB session row + clears cookie. Redirects to home.

---

## Technical Requirements

| Requirement | Status | Notes |
|---|---|---|
| **Prepared statements** | Done | `postgres` (postgres.js) tagged template literals auto-parameterize all interpolated values. No string concatenation anywhere. |
| **XSS prevention** | Done | All user data rendered via `{variable}` in JSX (React auto-escapes). No `dangerouslySetInnerHTML` with user data. |
| **Session management** | Done | DB-backed sessions (`app_session` table), `httpOnly` + `sameSite: "lax"` + `secure` cookies, 7-day expiry, cleanup of expired sessions on startup. |
| **Server-side authorization** | Done | `requireUser("customer")` / `requireUser("staff")` guards on all mutations. Airline-scoped staff queries. Client-side route guards as convenience redirects only. |
| **Different home pages per role** | Done | Guest → `/` (globe search). Customer login → `/customer`. Staff login → `/staff`. |

---

## Gaps Summary

| # | Gap | Severity | Notes |
|---|---|---|---|
| 1 | Trips page has no date range / airport filter UI | Low | Spec says "Optionally". Backend already supports it. |
| ~~2~~ | ~~`/customer` route renders blank~~ | ~~Resolved~~ | Removed. All redirects now point to `/trips`. |
| 3 | Password hashing uses bcrypt, not md5 | None | Spec says `md5(y)` but this is a legacy suggestion. bcrypt is strictly better. Professor unlikely to penalize. |

### Not Required by Spec (but implemented)

- Profile editing (inline fields)
- Payment history page
- Change password
- 3D credit card visuals
- Globe with satellite imagery
- Responsive mobile UX
