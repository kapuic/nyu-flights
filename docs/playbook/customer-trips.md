# Customer Trips & Reviews

## Overview

The customer trips page is the primary post-booking destination. It shows all purchased flights (upcoming and past), lets the user submit reviews for completed flights, and acts as the core "My Trips" experience.

## Navigation

### Shared navbar (`AppNavbar`)

Both the globe layout and the trips page use the same `AppNavbar` component — same pill tabs, same styling, same "Me" button.

```
[Logo]   Search   My Trips              [Avatar · Me]
```

- **Search** → `/` (globe search)
- **My Trips** → `/trips`
- **Me** pill → `/customer` (account hub, future scope)
- Avatar + "Me" text together in a pill-shaped ghost button with `border-white/10 bg-white/[0.06]`

When not logged in: "Sign in" link stays as-is, no "My Trips" or "Me".

`activeTab` prop highlights the correct pill per page.

## Routes

```
/trips                 → My Trips page (this spec, standalone route)
/customer              → account hub (future: profile, security, etc.)
```

## My Trips Page (`/trips`)

### Data

Uses `getCustomerDashboardFn` which returns:
- `currentUser: { displayName, email }`
- `upcomingFlights: CustomerFlight[]`
- `pastFlights: CustomerFlight[]`

Each `CustomerFlight` includes:
- `airlineName`, `flightNumber`, `departureDatetime`, `arrivalDatetime`
- `departureAirportCode`, `departureAirportName`, `departureCity`
- `arrivalAirportCode`, `arrivalAirportName`, `arrivalCity`
- `basePrice`, `status` (`on_time` | `delayed`)
- `purchaseDatetime`
- `canReview` (boolean — true if past and no review yet)
- `rating` (number | null)
- `comment` (string | null)

### Filter tabs

Three tabs using shadcn `Tabs` with `variant="line"`:

| Tab | Content |
|-----|---------|
| **All** (default) | Two sections: "Upcoming" heading + cards, then "Past Journeys" heading + cards |
| **Upcoming** | Only upcoming flights |
| **Past** | Only past flights |

### Trip card

Each trip is a shadcn `Card` using `@container` queries for responsive layout.

**Date sidebar** (shown when card is `@min-sm` wide): month + day + year stacked, separated by a right border.

**Card body**:
- **Top row**: status badge + flight number + airline (left), date inline (narrow only)
- **Center**: two-column departure → arrival layout
  - Left column: airport code (large), city name, time
  - Center: horizontal lines with plane icon
  - Right column: airport code (large), city name, time (right-aligned)
- **Bottom row**: price (muted, de-emphasized) on left, review button or stars on right

### Review status indicators (past flights only)

| State | Display |
|-------|---------|
| `canReview = true` | "Review Flight" button |
| `rating !== null` | Filled stars + truncated comment preview |

### Empty states

- No upcoming: "No upcoming flights. Ready to plan your next trip?" with "Explore Flights" link to `/`
- No past: "No past journeys yet."
- No flights at all: "You haven't booked any flights yet." with "Search Flights" link

## Review Dialog / Drawer

Responsive container:
- `md+` (≥768px): shadcn `Dialog` — centered modal
- `<md`: shadcn `Drawer` (vaul) — slides up from bottom

### Review form contents

1. **Flight context header**: "SFO → LHR · Flight AP-204 · Sep 12, 2024"
2. **Star rating**: 5 clickable stars (1–5), required
3. **Comment textarea**: "Share your feedback on the flight, crew, or amenities…" (optional, max 500 chars)
4. **Actions**: "Submit Review" primary button + "Cancel" ghost button
5. **Validation**: Rating required. Uses `reviewSchema` from schemas.ts.

### Submission

Calls `submitReviewFn` with `{ airlineName, flightNumber, departureDatetime, rating, comment }`.
On success: toast, close dialog, invalidate router data so the card updates to show the submitted rating.

## Components

- `src/components/app-navbar.tsx` — shared navbar used by globe layout and trips page
- `src/components/ui/drawer.tsx` — shadcn drawer (vaul)
- `src/components/review-dialog.tsx` — responsive review dialog/drawer
- Trip card is inline in the route file (`TripCard` component)

## Responsive behavior

- Card uses `@container` queries: date sidebar appears at `@min-sm` container width
- Content max-width: `max-w-3xl` (matches globe search page)
- Mobile: cards stack vertically, date inline in top row
- Review dialog → drawer on mobile
- Tab bar stays horizontal, scrollable if needed
