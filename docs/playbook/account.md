# Account / Me Page

## Overview

The account page is the customer's settings hub, accessed via the "Me" pill button in the navbar. It uses a sidebar layout with nested routes for profile, security, and payment history.

## Routes

```
/account              → layout route (auth guard, sidebar, AppNavbar, Outlet)
/account/             → profile page (default child)
/account/security     → change password
/account/payments     → payment history (cards from past ticket purchases)
```

## Layout

- Dark theme matching globe/trips pages
- `AppNavbar` at top (no activeTab — "Me" is separate)
- Left sidebar on `md+`, horizontal pill tabs on mobile
- Sidebar: Profile, Security, Payments, Sign Out
- Auth guard: redirect to `/login` if unauthenticated, `/staff` if staff

## Profile Page (`/account/`)

Three card sections with inline-editable fields:
- **Personal Information**: name (editable), email (read-only), phone (editable), DOB (read-only, date picker display)
- **Address**: building number, street, city (all text inline edit), state (US states combobox)
- **Passport**: number (text), expiration (date picker), country (country combobox with flags)

Inline editing uses `InlineField` for text, specialized components for dates/countries/states.

## Security Page (`/account/security`)

- Change password form (current + new + confirm)
- 2FA section (cosmetic, coming soon)

## Payments Page (`/account/payments`)

- Grid of 3D `CreditCardVisual` components showing cards from past ticket purchases
- Read-only (derived from ticket table)
- Link to `/trips` for receipts
