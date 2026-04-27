# Booking Flow — Playbook

## Creative Direction

The booking flow is a continuous extension of the search experience — same dark globe background, same glass aesthetic, no jarring context switches. From the moment a user searches to the moment they see a confirmation, the globe stays mounted, the camera smoothly transitions, and the UI layers slide in and out like panels in a cockpit.

**Mood:** Seamless. Purposeful. One continuous journey from search to seat.

## Architecture

### Shared globe via pathless layout route

All booking-flow routes share a single `_globe.tsx` pathless layout. This layout renders:
- The `GlobeBackground` component (never unmounts across route transitions)
- The frosted glass navbar
- The auth modal (available from any child route)
- An `<Outlet />` for the active child route

```
routes/
  _globe.tsx              ← Globe + navbar + auth modal + Outlet
  _globe/
    index.tsx             ← Search (/)
    checkout.tsx          ← Payment form (/checkout)
```

Client-side navigation between these routes keeps the globe alive — no remount, no flicker. The globe camera reads from the booking store and animates to the appropriate state for the current step.

### State management: Zustand + sessionStorage

A single `useBookingStore` (zustand with `persist` middleware → sessionStorage) holds:

```ts
{
  // Search context (restored on refresh)
  searchFrom: AirportSelection | null
  searchTo: AirportSelection | null
  departureDate: string
  returnDate: string
  tripType: 'one_way' | 'round_trip'

  // Flight selections
  selectedOutbound: FlightOption | null
  selectedReturn: FlightOption | null    // round-trip only

  // Payment draft (partial — never store full card number)
  paymentDraft: {
    cardType: 'credit' | 'debit'
    nameOnCard: string
  } | null

  // Confirmation result
  confirmation: {
    ticketIds: number[]
    flights: FlightOption[]
    totalPrice: number
  } | null
}
```

**Why zustand**: Lightweight (1.2KB), persist middleware to sessionStorage gives refresh resilience, clean actions API, no context boilerplate.

**What NOT to persist**: Full card numbers and expiration dates. Only persist card type and name on card (non-sensitive draft state).

### Globe camera derivation

The globe does not persist its own camera state. Instead, it derives camera position from the booking store:

| Store state | Globe camera |
|---|---|
| No airports selected | `idle` — auto-rotate, ambient arcs |
| `searchFrom` set, no `searchTo` | `origin-focus` — zoom to origin |
| Both airports set | `route-focus` — zoom to show both |
| `selectedOutbound` set | `route-focus` — arc between airports, tighter zoom |
| On `/checkout` | `route-focus` — hold position, pulsing dots at both airports |
| `confirmation` set | `route-focus` — celebratory pulse at destination |

## Flow

### One-way

```
Search → results → [Book] → (auth gate if needed) → /checkout → [Confirm & Pay] → confirmation
```

### Round-trip

```
Search → outbound results (with return hints) →
  [Book] on outbound → return flight picker →
    [Book] on return → (auth gate if needed) → /checkout → [Confirm & Pay] → confirmation
```

## Search Page Changes

### Round-trip two-phase selection

**Phase 1 — Outbound results:**
- Round-trip search shows outbound cards identical to one-way
- Each outbound card gains a **return flight preview row** at the bottom:
  - Shows up to 3 eligible return flights in a horizontal `grid-cols-3` layout
  - Each mini-card shows: departure time, price, airline
  - If >3 eligible returns, show count: "+4 more return flights"
  - Eligible = departs after this outbound arrives; if return date is set, also filtered to that date
  - If 0 eligible returns: show "No return flights available" in muted text
- "Book" button on each outbound card

**Phase 2 — Return selection (round-trip only):**
- When user clicks "Book" on an outbound:
  - The outbound card is stored in `selectedOutbound` in the booking store
  - The results area transitions:
    - A **pinned summary card** of the selected outbound appears at top (compact: route, time, price, "Change" link)
    - Below: "Select your return flight" header
    - Full return flight cards (same `FlightResultCard` component)
    - Filtered: only flights departing after outbound arrival
    - If return date was provided: additionally filtered to that date
    - If no return date: show all eligible future dates, grouped by date
  - "Change" link resets `selectedOutbound` and returns to phase 1
- User clicks "Book" on a return → stored in `selectedReturn` → auth gate check → `/checkout`

### Return date behavior

- In round-trip mode, the return date field is **optional**
- If omitted: all future return flights shown (after outbound arrival)
- If provided: return flights filtered to that date
- Validation: return date before departure date → inline error under the field
- Validation: same from/to airport → inline error: "Origin and destination must differ"

### Validation rules (search level)

| Rule | When checked | UX |
|---|---|---|
| From = To | On airport selection | Inline red error below To field. Block search. |
| Return date < departure date | On date selection | Inline red error below Return field. Block search. |
| Round-trip, no outbound selected | On "Book" of return | Impossible — UI enforces outbound-first |
| Flight sold out (0 seats) | On card render | "Sold out" badge, Book button disabled |

## Auth Modal

### Trigger

When user clicks "Book" and is not logged in, a **modal dialog** appears over the current page. The search page / return selection stays visible but dimmed behind the modal backdrop.

### Design

Tabbed dialog with two tabs: **Sign In** | **Create Account**

The modal reuses extracted form components from the standalone login/register pages:
- `<LoginFormContent onSuccess={...} />` — email, password fields + submit
- `<RegisterFormContent onSuccess={...} />` — multi-step registration (step 1: identity, step 2: profile)

On success:
1. Modal closes
2. Router invalidates (refreshes `currentUser` in context)
3. The booking flow continues — navigate to `/checkout` with the selected flight(s) in the store

### Login/Register refactoring

The existing login/register pages have deeply nested `form.Field` render props (register.tsx nests 12 levels). Refactor:

1. **Extract `<LoginFormContent />`**: Owns its own `useForm`, renders email/password fields, handles submit. Takes `onSuccess` callback.
2. **Extract `<RegisterFormContent />`**: Owns its own `useForm`, renders multi-step form, handles submit. Takes `onSuccess` callback.
3. **Standalone pages** (`/login`, `/register`): Become thin wrappers — render the extracted component inside the existing Card + hero image layout.
4. **Auth modal**: Renders both components in a tabbed dialog, without the Card/hero image wrapper.

The extracted components must NOT depend on route context. They should accept `onSuccess: () => void` and handle their own form state internally (no prop-drilling of field values).

## Checkout Page (`/checkout`)

### Route guard

- Requires `selectedOutbound` in the booking store. If missing, redirect to `/`.
- Requires `currentUser` (auth). If missing, redirect to `/` (the auth modal should have caught this earlier, but defense in depth).

### Layout (desktop)

```
┌─────────────────────────────────────────────────────────────────┐
│  [logo]    ● Search   ○ Trips              [avatar] ← navbar  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌── left column (payment) ──────┐  ┌── right column ──────┐  │
│   │                               │  │  (sticky sidebar)    │  │
│   │  Complete Your Booking        │  │                      │  │
│   │  ─────────────────────        │  │  Flight Summary      │  │
│   │                               │  │  ┌──────────────┐   │  │
│   │  ┌─ Payment ─────────────┐   │  │  │ JFK → LAX    │   │  │
│   │  │                       │   │  │  │ Mar 3, 1:15p │   │  │
│   │  │  [● Credit] [○ Debit] │   │  │  │ $420         │   │  │
│   │  │                       │   │  │  └──────────────┘   │  │
│   │  │  Card Number          │   │  │                      │  │
│   │  │  ┌─────────────────┐  │   │  │  (return flight if   │  │
│   │  │  │ 0000 0000 0000  │  │   │  │   round-trip)        │  │
│   │  │  └─────────────────┘  │   │  │                      │  │
│   │  │                       │   │  │  ─────────────────   │  │
│   │  │  Expiration  Name     │   │  │  Total: $420         │  │
│   │  │  ┌──────┐  ┌──────┐  │   │  │                      │  │
│   │  │  │ MM/YY│  │ Name │  │   │  │  [Confirm & Pay]     │  │
│   │  │  └──────┘  └──────┘  │   │  │                      │  │
│   │  └───────────────────────┘   │  └──────────────────────┘  │
│   └───────────────────────────────┘                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Glass styling

All form elements use the dark glass aesthetic matching the search cluster:
- Card: `bg-white/[0.04] border-white/[0.08] backdrop-blur-xl`
- Inputs: transparent bg, white text, `border-white/10`
- Labels: `text-white/40 uppercase tracking-widest text-[10px]`
- Buttons: glass pill or gradient

### Payment form fields

| Field | Type | Validation |
|---|---|---|
| Card type | Toggle pills (Credit / Debit) | Required, default: credit |
| Card number | Masked input (`0000 0000 0000 0000`) | Min 12 digits |
| Expiration | Masked input (`MM/YY`) | Required, format check |
| Name on card | Text input | Min 2 chars |

Use `react-imask` (already installed — used in signup form) for card number and expiration masking.

### Flight summary sidebar

- Sticky (`position: sticky; top: ...`)
- Shows selected outbound flight details: route, date, times, airline, price
- For round-trip: shows both outbound and return
- Price summary: individual flight prices + total
- "Confirm & Pay" button at bottom of sidebar
- "Back to search" link

### Submit behavior

1. Validate payment form (client-side via TanStack Form + Zod)
2. Call `purchaseTicketFn` for outbound
3. For round-trip: call `purchaseTicketFn` again for return (sequential, not parallel — each is a transaction)
4. On success: set `confirmation` in booking store, render confirmation state
5. On error: show inline error with retry button. Do NOT navigate away.

### Error handling

- "Flight is full" → show error, offer to go back to search
- "Flight not found" → show error, suggest searching again
- Network error → show retry button
- If outbound succeeds but return fails (round-trip): show partial success — "Outbound booked, return failed" with ticket ID for outbound and retry for return

## Confirmation State

After successful purchase, the checkout page transforms inline into a confirmation view (no route change):

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│                    ✓ Booking Confirmed                          │
│                                                                 │
│          Your tickets have been secured.                        │
│                                                                 │
│   ┌─ Ticket #1042 ───────────────────────────────────────────┐  │
│   │  JFK → LAX  ·  Mar 3  ·  1:15 PM – 4:30 PM  ·  $420   │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│   (return ticket card if round-trip)                            │
│                                                                 │
│              Total charged: $420                                │
│                                                                 │
│   [View My Trips]            [Search More Flights]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

- Glass cards for each ticket
- "View My Trips" → `/customer` (when dashboard is built)
- "Search More Flights" → resets booking store → navigates to `/`
- Globe shows celebratory state: pulsing rings at destination, route arc visible

## Animation Inventory

| Animation | Trigger | Duration | Properties |
|---|---|---|---|
| Return flight mini-cards fade in | Outbound card renders | 200ms stagger | opacity, translateY(4px) |
| Phase 2 transition (outbound → return picker) | Click "Book" on outbound | 400ms | results cross-fade, pinned card slides in from top |
| Auth modal enter | Book click (unauthed) | 300ms | backdrop opacity, modal scale(0.95→1) + opacity |
| Auth modal exit | Login success / close | 200ms | reverse of enter |
| Route transition (/ → /checkout) | Navigate | 300ms | content cross-fade (globe stays) |
| Confirmation reveal | Purchase success | 600ms | checkmark scale, cards stagger in |
| Globe camera to checkout | Navigate to /checkout | 1200ms | camera zoom tightens |
| Globe celebration pulse | Confirmation | 2s loop | rings at destination, brighter arc |

## Edge Cases

| Scenario | Behavior |
|---|---|
| User refreshes on /checkout | Zustand restores from sessionStorage. If selectedOutbound exists, re-render checkout. If not, redirect to /. |
| User navigates directly to /checkout (no prior search) | No selectedOutbound → redirect to /. |
| User opens /checkout in new tab | sessionStorage is per-tab, so no state → redirect to /. But if same tab, state persists. |
| Flight sells out between search and checkout | purchaseTicketFn returns error "flight is full". Show error with link back to search. |
| Round-trip: outbound succeeds, return fails | Show partial confirmation: outbound ticket confirmed, return failed with retry button. |
| User clicks browser back from /checkout | Client-side back to search page. Booking store retains selectedOutbound for easy re-entry. |
| Auth modal: user registers, then navigates to /checkout | currentUser is now set (router invalidated). Booking store still has selections. Checkout renders. |
| Payment validation fails | Inline field errors. No server call. |
| Double-click on "Confirm & Pay" | Disable button on first click (isSubmitting state). |
| Card number too short | Zod validation: min 12 digits after mask stripping. |
| Mobile viewport | Single column layout. Sidebar becomes a sticky bottom bar with price + confirm button. |

## Mobile (< 768px)

- Checkout: single column. Payment form fills width.
- Flight summary: collapses into a compact expandable section at top, or a sticky bottom bar showing total + "Confirm & Pay".
- Auth modal: full-screen sheet instead of centered dialog.
- Return flight mini-cards on outbound: stack vertically (1 per row) or hide behind "View X return flights" toggle.

## Tech Notes

- **TanStack Form** for the payment form on checkout (consistent with existing form patterns).
- **react-imask** for card number and expiration masking (already a dependency).
- **TanStack Router `useNavigate`** for all route transitions (client-side, no full reload).
- **Zustand persist middleware** uses `createJSONStorage(() => sessionStorage)` — data is per-tab and clears on tab close.
- The globe in `_globe.tsx` reads from `useBookingStore` to derive camera state. No prop drilling from child routes.
- `purchaseTicketFn` is called sequentially for round-trip (not parallel) because each is a DB transaction and the second depends on the first succeeding.
- The auth modal lives in `_globe.tsx` (the layout) and is controlled via a `showAuthModal` state in the booking store or a simple React state in the layout, toggled by child routes via a callback from context.
- On login/register success inside the modal, call `router.invalidate()` to refresh the `currentUser` from `__root.tsx`'s `beforeLoad`. Then continue the booking flow.

## Server-side Changes

No new server functions needed. The existing `purchaseTicketFn` handles everything. The existing `searchFlightsFn` returns both outbound and return options.

One minor change: the return flight search in `searchFlightsInternal` currently requires both `returnDate` AND both airport queries to be set. For the new flow where return date is optional, we need to adjust the condition so that return flights are fetched whenever `tripType === 'round-trip'` and both airports are known (even without a return date). When no return date is specified, fetch all future return flights (departing after the outbound date).
