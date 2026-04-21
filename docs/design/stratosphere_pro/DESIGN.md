# Design System: Aeronautical Precision

## 1. Overview & Creative North Star
**The Creative North Star: "The Flight Path"**
This design system moves away from the whimsical, rounded aesthetics of consumer tech and anchors itself in the high-stakes world of aviation engineering. It is a "Product-Grade" system—meaning it prioritizes utility, clarity, and structural integrity. 

We break the "template" look by utilizing **Editorial Asymmetry**. Instead of perfectly centered containers, we use offset layouts and varied column widths to guide the eye, mimicking the way a pilot scans a cockpit or an architect reads a blueprint. The experience should feel like a premium printed flight manifest: authoritative, crisp, and undeniably intentional.

---

## 2. Colors: The Tonal Horizon
Our palette is split between two operational modes: **Traveler** (High-contrast, calm, expansive) and **Staff** (Dense, utilitarian, authoritative).

### The "No-Line" Rule
To achieve a premium, editorial feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined through background color shifts.
*   **Sectioning:** Use `surface-container-low` for secondary content areas sitting on a `surface` background.
*   **Depth:** Instead of a stroke, use a 4px or 8px vertical offset in background color to denote a change in context.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use the Material surface tiers to define importance without adding visual noise:
*   **Lowest (`#ffffff`):** For primary interactive cards and modals that need to "pop."
*   **Surface (`#f7f9fb`):** The standard canvas for the Traveler experience.
*   **Container High/Highest (`#e6e8ea` / `#e0e3e5`):** Reserved for Staff dashboards to group high-density data modules.

### Signature Textures
While we avoid "glass," we introduce visual "soul" through **Tonal Gradients**. Main CTAs should utilize a subtle linear gradient from `primary` (#000000) to `primary_container` (#131b2e). This provides a "weighted" feel that flat black cannot achieve.

---

## 3. Typography: The Information Architecture
We pair **Manrope** (Display/Headlines) with **Inter** (Body/Labels) to balance modern character with technical precision.

*   **Display & Headlines (Manrope):** Set with tight letter-spacing (-0.02em). These are the "Wayfinding" elements. Use `display-lg` for hero search moments and `headline-sm` for section headers.
*   **Body & Titles (Inter):** These are for "Information Delivery." Inter’s high x-height ensures readability in dense Staff tables and flight itineraries.
*   **The Scale:** 
    *   `display-lg` (3.5rem): Use for destination prices and major marketing hooks.
    *   `label-sm` (0.6875rem): Set in All-Caps with +0.05em tracking for flight numbers and status tags to imply authority.

---

## 4. Elevation & Depth: Tonal Layering
Traditional drop shadows are distracting in a high-density airline product. We rely on **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by "stacking." Place a `surface-container-lowest` card on a `surface-container-low` section. This creates a soft, natural lift.
*   **Ambient Shadows:** If a floating element (like a flight-picker dropdown) is required, use an extra-diffused shadow: `shadow: 0 20px 40px -10px rgba(25, 28, 30, 0.08)`. The shadow color must be a tint of `on_surface`, never pure gray.
*   **The "Ghost Border":** For high-density Staff grids where color shifts aren't enough, use a "Ghost Border": `outline-variant` (#c6c6cd) at 15% opacity. It provides a "hint" of a line without breaking the editorial flow.

---

## 5. Components: Engineered Utility

### Buttons (The Primary Action)
*   **Shape:** `border-radius: 0.25rem` (Refined, not pill-shaped).
*   **Primary:** Solid `primary` background. In "Traveler" mode, use the signature gradient.
*   **Secondary:** `surface-container-high` background with `on_surface` text. No border.

### Search & Input Fields
*   **Traveler Mode:** Large, airy inputs using `surface-container-lowest`. Focus state is a 2px `primary` bottom-border only.
*   **Staff Mode:** Compact heights using `surface-variant`. Focus state is a subtle `outline` (#76777d) highlight.

### Data Tables (Staff-Centric)
*   **Layout:** Strictly forbidden to use divider lines. Use `surface-container-low` for alternating rows or `surface-container-high` for the header row.
*   **Typography:** Use `body-sm` for data cells to maximize information density.

### Chips & Status Tags
*   **Design:** Rectangular with `0.125rem` (sm) radius.
*   **Colors:** Use functional accents (`error_container` for delays, `tertiary_fixed` for on-time). Avoid heavy saturation; keep the background soft and the text high-contrast.

---

## 6. Do's and Don'ts

### Do:
*   **Do** use vertical white space (32px, 48px, 64px) to separate major sections instead of horizontal rules.
*   **Do** use `on_surface_variant` (#45464d) for secondary metadata to create a clear visual hierarchy.
*   **Do** align all text to a strict baseline grid to maintain "Product-Grade" rhythm.

### Don't:
*   **Don't** use Glassmorphism or backdrop-blurs. This system is about solid, dependable surfaces.
*   **Don't** use "Pill" shapes for buttons or tags. Stick to the `0.25rem` default or `0.125rem` for smaller elements.
*   **Don't** use pure `#000000` for text; use `on_surface` (#191c1e) to reduce eye strain in high-density environments.
*   **Don't** use standard 1px borders. If a boundary is needed, rethink the background color hierarchy first.

---

## 7. Tailwind v4 / shadcn Logic
When extending shadcn/ui components, override the default `@theme` block: