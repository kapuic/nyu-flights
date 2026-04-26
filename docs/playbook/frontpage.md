# Frontpage — Playbook

## Creative Direction

Dark, premium, satellite-view globe as a living background. The page feels like a flight control interface crossed with a luxury travel app. Nothing about this should feel like a class project or a generic Booking.com clone.

**Mood:** Midnight satellite view. Ambient. Cinematic. Purposeful.

## Layout (Desktop)

```
┌─────────────────────────────────────────────────┐
│  [logo]    ● Search   ○ Trips   ○ Settings  [av]│  ← pill navbar, frosted glass
│                                                 │
│                                                 │
│        ┌─ glass search cluster ─────────────┐   │
│        │ From │⇆│ To │ Depart │ Return │ 🔍 │   │  ← centered, frosted glass card
│        └────────────────────────────────────┘   │
│        ○ Round trip  ○ One-way                  │  ← pill toggles below
│                                                 │
│         ╭───── 🌍 globe ─────────────────╮      │
│        ╱    satellite earth at night      ╲     │
│       │  gray arcs + ✈ moving along them   │    │  ← half-submerged, center-bottom
│       │         city lights visible         │    │
│        ╲                                  ╱     │
│         ╰────────────────────────────────╯      │
└─────────────────────────────────────────────────┘
```

**After search triggers:**

```
┌─────────────────────────────────────────────────┐
│  [logo]    ● Search   ○ Trips   ○ Settings  [av]│
│  ┌─ search cluster (compact, pinned top) ─────┐ │  ← animates up
│  └────────────────────────────────────────────┘ │
│                                                 │
│  ┌─ result card ──────────────────────────────┐ │
│  │ JB103  JFK → LAX   13:15–16:30   $420     │ │  ← staggered fade-in
│  └────────────────────────────────────────────┘ │
│  ┌─ result card ──────────────────────────────┐ │
│  │ JB101  JFK → PVG   08:00–21:00   $1200    │ │
│  └────────────────────────────────────────────┘ │
│         ╭───── 🌍 globe (zoomed) ────────╮      │  ← still visible, showing result routes
│         ╰────────────────────────────────╯      │
└─────────────────────────────────────────────────┘
```

## Component Inventory

| Component | Base | Notes |
|-----------|------|-------|
| `GlobeBackground` | react-globe.gl | Satellite texture, arc/point layers, camera control |
| `Navbar` | custom | Frosted glass bar, pill tabs, avatar |
| `SearchCluster` | custom + shadcn | Glass card with From/To comboboxes, date pickers, search btn |
| `AirportCombobox` | shadcn Combobox | Debounced server autocomplete via `searchAirportsFn` |
| `DatePickerButton` | shadcn Popover + Calendar | Glass-styled trigger button |
| `TripTypeToggle` | custom pills | One-way / Round-trip |
| `FlightResultCard` | custom + shadcn Card/Badge | Route, times, price, status, rating |
| `ResultsSkeleton` | shadcn Skeleton | Loading placeholder for results |

## Globe Specification

### Texture
NASA Earth at Night ("Black Marble"). Use the three-globe bundled texture or download a 2048px version to `public/textures/earth-night.jpg`. Dark ocean, visible city lights.

### Data sources
- **Airport coordinates**: Static JSON at `src/data/airport-coordinates.json`. Map IATA code → `{lat, lng}`. Sourced from OpenFlights/public datasets. Only needs to cover airports in our DB (JFK, PVG, LAX + extensible).
- **Routes for ambient animation**: New server function `getGlobeRoutesFn` → returns all distinct flight routes (departure_code, arrival_code) from the `flight` table. Fetched once on page load.
- **Result routes**: From search results data (already have departure/arrival codes).

### Globe positioning
- Globe center: `bottom: -35vh` (half-submerged effect). Achieved via CSS transform on the globe container, NOT by camera angle.
- Globe container: `position: fixed`, `inset: 0`, `pointer-events: none`, `z-index: 0`.
- Slow auto-rotation: `autoRotateSpeed: 0.3`.

### Arc animation (ambient/idle state)
- Load all routes from DB. Pick 5 random routes.
- Each route: fade in arc (opacity 0→0.4 over 800ms), animate a dot along the arc (3s), fade out (800ms).
- When one finishes, pick next random route. Continuous cycle.
- Arc color: `rgba(255, 255, 255, 0.15)`. Dot color: `rgba(255, 255, 255, 0.6)`.
- Arc altitude: auto (react-globe.gl default curve).

### Camera states (state machine)

| State | Camera | Globe content | Trigger |
|-------|--------|---------------|---------|
| `idle` | Auto-rotate, altitude ~2.5 | Ambient route cycle | Default / clear all |
| `origin-focus` | Zoom to origin coords, stop rotate | Pulsing dot at origin | Valid From selected |
| `route-focus` | Zoom to midpoint showing both airports | Arc between origin+dest, pulsing dots | Valid To selected |
| `results` | Hold route-focus position | Result flight arcs replace ambient | Search results loaded |

**Camera transitions**: Use `pointOfView()` with 1200ms duration. Easing is handled internally by react-globe.gl (linear interpolation). The zoom feels like a satellite descending.

### Pulsing dot
- `pointRadius: 0.4`, color `#ffffff`.
- CSS ring animation around the dot via `htmlElementsData` layer OR a custom points layer with animated ring.
- Alt: use `ringsData` layer — react-globe.gl has a built-in rings layer perfect for pulsing.

## Search Cluster

### Glass aesthetic
- Background: `rgba(255, 255, 255, 0.06)`.
- Border: `1px solid rgba(255, 255, 255, 0.1)`.
- Backdrop: `backdrop-blur-xl backdrop-saturate-150`.
- Border-radius: `rounded-2xl`.
- All inputs inside inherit glass look: transparent bg, white text, white/40 placeholder, no visible input border.

### Fields (left to right)

1. **From** — `AirportCombobox`. Icon: `MapPin`. Placeholder: "Select origin". Debounced autocomplete (300ms) hitting `searchAirportsFn`. Shows `City · CODE` in dropdown. On valid selection: fires `onOriginSelect(airport)`.
2. **Swap button** — Between From/To. Icon: `ArrowLeftRight`. Swaps values.
3. **To** — Same as From, placeholder: "Select destination". On valid selection: fires `onDestinationSelect(airport)`.
4. **Depart** — `DatePickerButton`. Icon: `Calendar`. Opens shadcn Calendar in Popover. Min date: today.
5. **Return** — Same. Disabled when trip type is one-way. Min date: departure date.
6. **Search button** — Large, white text on glass, arrow icon. Triggers explicit search.

### Field separators
Thin vertical lines (`border-r border-white/10`) between fields. On mobile, fields stack vertically.

### Auto-submit logic
- Auto-submit when **both** From and To are valid airports (regardless of dates).
- Dates narrow results. Changing a date re-submits.
- If only From OR only To: do NOT auto-submit, but DO trigger globe camera.
- Explicit Search button always submits with whatever is filled.

## Trip Type Toggle

- Two pills below search cluster: "Round trip" and "One-way".
- Default: one-way.
- Glass pill style: selected = `bg-white/15 text-white`, unselected = `text-white/50`.
- When switching to one-way, Return field fades out. Round-trip fades it in.

## Navbar

- Fixed top, full-width, frosted glass (`bg-white/5 backdrop-blur-md`).
- Left: Logo/app name (text, "Flights" or brand).
- Center: Pill tabs — Search (active on `/`), Trips (links to `/customer`), Settings.
- Right: Avatar circle if logged in, "Sign in" button if not.
- Pill active state: `bg-white/10 text-white`. Inactive: `text-white/50`.
- On scroll/results: navbar stays pinned.

## Flight Result Cards

- Glass card style matching search cluster.
- Layout per card:
  ```
  ┌──────────────────────────────────────────────────┐
  │  JB103 · Jet Blue                   ● On Time   │
  │                                                  │
  │  JFK ────────────────────────── LAX              │
  │  New York        3h 15m        Los Angeles       │
  │  1:15 PM                       4:30 PM           │
  │                                                  │
  │  $420            ★ 4.2 (3)     12 seats left     │
  │                                        [Book →]  │
  └──────────────────────────────────────────────────┘
  ```
- Status badge: green dot + "On Time" or amber dot + "Delayed".
- Price: large, white. Rating: stars or numeric. Seats: muted.
- Book button: glass pill, visible on hover or always on mobile.
- Cards stagger in: each card delays 60ms after previous. `opacity: 0, translateY(8px)` → `opacity: 1, translateY(0)`, 300ms ease-out.

## Animation Inventory

| Animation | Trigger | Duration | Easing | Properties |
|-----------|---------|----------|--------|------------|
| Globe ambient arcs | Page load, continuous | 800ms fade + 3s travel | ease-in-out | arc opacity, dot position |
| Globe camera zoom | Airport selected | 1200ms | linear (globe.gl internal) | camera lat/lng/alt |
| Globe route fade | Clear/new search | 600ms | ease-out | arc opacity → 0 |
| Search cluster slide up | Results loaded | 400ms | cubic-bezier(0.23, 1, 0.32, 1) | translateY |
| Result cards stagger | Results rendered | 300ms per card, 60ms stagger | ease-out | opacity, translateY(8px) |
| Return field show/hide | Trip type toggle | 200ms | ease-out | width, opacity |
| Navbar pill switch | Tab click | 150ms | ease | background-color, color |
| Search button press | Click | 100ms | ease-out | scale(0.97) |
| Pulsing ring on globe | Airport focused | 2s loop | ease-in-out | ring radius 0→3, opacity 1→0 |
| Autocomplete dropdown | Input focus + typing | 150ms | ease-out | opacity, scale(0.97→1) |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Invalid airport typed (no autocomplete match) | Red field ring. No globe zoom. Dropdown shows "No airports found". |
| From = To (same airport) | Show inline error "Origin and destination must differ". Don't submit. |
| No results for search | Show empty state: "No flights found" with suggestion pills to adjust dates or clear filters. |
| Only From filled + Search clicked | Submit partial search (backend supports it). Show flights departing from that airport. |
| Only To filled + Search clicked | Submit partial search. Show flights arriving at that airport. |
| Globe texture fails to load | Show dark gradient fallback (`bg-gradient-to-b from-zinc-950 to-black`). Globe component has error boundary. |
| Mobile (<768px) | Globe hidden (too heavy for mobile WebGL). Show dark gradient bg instead. Search fields stack vertically. Full-width cards. |
| User not logged in + clicks Book | Redirect to `/login` with `redirect` search param back to `/`. |
| Round-trip selected but no return date | Return field pulses/highlights. Explicit search still works (outbound only). |
| Autocomplete race condition | Cancel previous `searchAirportsFn` call on new keystroke (AbortController or ignore stale). |
| Screen resize during results | Globe repositions. Search cluster and cards reflow. |

## Data Requirements

### New server function needed
```ts
// Returns distinct flight routes for globe ambient animation
getGlobeRoutesFn: () => Array<{
  departureCode: string
  arrivalCode: string
}>
```
SQL: `SELECT DISTINCT departure_airport_code, arrival_airport_code FROM flight`

### Static data file needed
```ts
// src/data/airport-coordinates.json
{
  "JFK": { "lat": 40.6413, "lng": -73.7781, "name": "John F. Kennedy International" },
  "LAX": { "lat": 33.9425, "lng": -118.4081, "name": "Los Angeles International" },
  "PVG": { "lat": 31.1443, "lng": 121.8083, "name": "Shanghai Pudong International" }
}
```
Extensible — add more airports as they're added to the DB. For airports not in this file, the globe simply won't render a dot (graceful degradation).

### Earth texture
Download NASA Earth at Night (2048x1024) to `public/textures/earth-night.jpg`. Fallback: three-globe CDN URL.

## Mobile (< 768px)

- Globe: hidden entirely. Replace with `bg-gradient-to-b from-zinc-950 via-zinc-900 to-black`.
- Navbar: logo left, hamburger right. Pill tabs inside mobile menu sheet.
- Search cluster: full-width, fields stacked vertically. Each field is a full-width row.
- Results: full-width cards, no stagger (appear immediately for snappiness).
- Date pickers: use native date input on mobile? No — keep shadcn Calendar, it works well in sheets.

## Tech Notes

- `react-globe.gl` is a client-only component (WebGL). Wrap in `React.lazy` with `ssr: false` or dynamic import to prevent SSR crashes.
- Globe re-renders: memoize arc/point data arrays. react-globe.gl re-renders on prop change, so keep references stable.
- Camera transitions: call `globeRef.current.pointOfView({lat, lng, altitude}, transitionMs)`.
- Autocomplete debounce: 300ms. Use `useRef` for timeout ID. Cancel on unmount.
- Search results: use `useQuery` from TanStack Query for caching and deduplication.
- The search cluster's animated position (centered → top) should use `motion.div` with layout animation or explicit `translateY` transition.
