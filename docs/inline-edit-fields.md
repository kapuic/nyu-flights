# Inline Edit Fields

A family of components for editing single values in-place, without navigating to a separate form. Click a value to reveal the editor, save or cancel inline.

## Components

| Component | Use case | Editor control |
|---|---|---|
| `InlineField` | Plain text, numbers | `<input>` |
| `InlineDateField` | Dates | `DatePickerField` (calendar popover) |
| `InlineCountryField` | Country selection | `Combobox` with flag icons |
| `InlineStateField` | US state selection | `Combobox` |
| `InlinePhoneField` | Phone numbers | `PhoneInput` with country picker |

All components live in `src/routes/account.index.tsx` (co-located with the profile page). `InlineField` is extracted to `src/components/ui/inline-field.tsx`.

## Shared Behavior

Every inline field follows the same interaction pattern:

1. **Display mode** — shows the current value with a pencil icon on hover.
2. **Edit mode** — replaces the display with an editor. Triggered by click or Enter key.
3. **Save** — calls `onSave(value)`, an async function that persists to the server.
4. **Cancel** — reverts to the original value. Triggered by Escape or the X button.
5. **Error** — caught from `onSave` and displayed below the field.

After a successful save, the parent should call `router.invalidate()` to refresh loader data.

## Required Props

All inline fields require explicit configuration — there are no defaults for behavioral props.

### `variant: "filled" | "outline"`

Controls the input background in edit mode.

- `"filled"` — subtle background fill (`dark:bg-input/30 shadow-xs`). Use for fields inside cards.
- `"outline"` — transparent background. Use for fields on plain surfaces.

```tsx
<InlineField variant="filled" label="Name" value={name} onSave={save} />
<InlineField variant="outline" label="Name" value={name} onSave={save} />
```

### `controls: "internal" | "external"`

Determines where save/cancel buttons appear. Applies to combobox and phone fields.

- `"internal"` — the editor's own chrome handles dismissal (combobox clear/trigger buttons). No external X/check buttons.
- `"external"` — save (check) and cancel (X) buttons render outside the editor, beside it.

```tsx
<InlineCountryField controls="external" ... />  // ✓ Check and ✗ buttons next to combobox
<InlineCountryField controls="internal" ... />  // Combobox handles its own clear/trigger
```

### `mode: "freeform" | "strict"`

Determines how combobox selection behaves. Applies to `InlineCountryField` and `InlineStateField`.

- `"strict"` — user must select from the list. Enables `autoHighlight` and ghost completion text. Click-away cancels.
- `"freeform"` — user can type arbitrary text. Click-away saves whatever is typed. Shows save button when `controls="external"`.

```tsx
<InlineStateField mode="strict" ... />    // Must pick from US_STATES
<InlineCountryField mode="freeform" ... /> // Can type a custom country name
```

## Usage

```tsx
import { InlineField } from "@/components/ui/inline-field"

function ProfilePage() {
  const profile = Route.useLoaderData()
  const router = useRouter()

  async function save(field: string, value: string) {
    await updateCustomerFieldFn({ data: { field, value } })
    void router.invalidate()
  }

  return (
    <Card>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <InlineField
          variant="filled"
          label="Name"
          value={profile.name}
          onSave={(v) => save("name", v)}
        />
        <InlineField
          variant="filled"
          label="Email"
          value={profile.email}
          readOnly
        />
      </CardContent>
    </Card>
  )
}
```

### Date field

```tsx
<InlineDateField
  variant="filled"
  controls="external"
  label="Passport Expiration"
  value={profile.passportExpiration}      // "2027-06-15" (YYYY-MM-DD string)
  onSave={(v) => save("passportExpiration", v)}
/>
```

The calendar opens immediately when entering edit mode (`defaultOpen`). Selecting a date saves and exits automatically.

### Combobox field

```tsx
<InlineCountryField
  variant="filled"
  controls="external"
  mode="strict"
  label="Country"
  value={profile.passportCountry}
  onSave={(v) => save("passportCountry", v)}
/>
```

### Phone field

```tsx
<InlinePhoneField
  controls="external"
  label="Phone"
  value={profile.phoneNumber}
  onSave={(v) => save("phoneNumber", v)}
/>
```

## Read-only fields

Pass `readOnly` to `InlineField` or `InlineDateField` to disable editing. The pencil icon is hidden and the cursor stays default.

```tsx
<InlineField variant="filled" label="Email" value={email} readOnly />
<InlineDateField variant="filled" controls="external" label="Date of Birth" value={dob} readOnly />
```

## Keyboard shortcuts

| Key | Action |
|---|---|
| Enter | Start editing (display mode) or save (edit mode) |
| Escape | Cancel editing |
| Tab | Move focus; blur saves the current value |

## Implementation Details

### Blur handling

All fields auto-save on blur, but portaled popups (combobox dropdowns, phone country picker) cause false blurs. This is handled with:

- **`data-inline-action`** — save/cancel buttons set this attribute. `onBlur` checks `e.relatedTarget.dataset.inlineAction` to avoid saving when clicking buttons.
- **`selectingRef`** — combobox fields track whether a selection is in progress. `onOpenChange` defers its check with `setTimeout` to let `onValueChange` fire first.
- **`pickerOpenRef`** — phone field uses `requestAnimationFrame` to defer blur check until after the country picker's `onOpenChange` fires.

### Ghost completion text

In `strict` mode, combobox fields show semi-transparent ghost text after the user's input, previewing the currently highlighted item. This is driven by `onItemHighlighted`, not a static first-match. Filtered items are sorted with `startsWith` matches first to keep the ghost aligned with `autoHighlight`.

### `InlineFieldWrapper`

A shared wrapper that renders the label and error. All specialized fields use it:

```tsx
<InlineFieldWrapper label="Country" error={error}>
  {/* editor content */}
</InlineFieldWrapper>
```

---

## Best Practices

### Choosing the right editor

| Data type | Editor | Why |
|---|---|---|
| Short text (name, street, ID numbers) | `InlineField` | Plain input is sufficient. No overhead. |
| Date | `InlineDateField` | Always use a date picker. Never use a text input for dates — parsing ambiguity, locale issues, validation headaches. |
| Phone number | `InlinePhoneField` | Wraps a dedicated phone input with country detection and formatting. Text inputs cannot reliably handle international phone numbers. |
| Single selection from known set | Combobox (`strict` mode) | User must pick from the list. Ghost text and auto-highlight provide fast keyboard selection. |
| Single selection with custom entry | Combobox (`freeform` mode) | User can type something not in the list. Less common — use only when the set is genuinely incomplete. |
| Boolean / toggle | **Don't use inline fields.** Use a `Switch` or `Checkbox`. | Inline edit adds unnecessary interaction overhead for binary values. |
| Long text (bio, notes) | **Don't use inline fields.** Use a modal or expandable `<textarea>`. | Inline text inputs aren't suited for multi-line content. |
| Multi-select from known set | **Don't use inline fields.** Use a multi-select combobox, tag input, or checkbox group in a popover. | Inline edit is designed for single-value changes. Multi-select needs dedicated affordances for adding/removing items. |
| Multi-select with custom entry | **Don't use inline fields.** Use a tag input with autocomplete. | Combining free-form entry with multi-select requires a purpose-built component. |
| File / image | **Don't use inline fields.** Use a file upload dropzone. | Binary data doesn't fit the text-in/text-out inline model. |

### Strict vs freeform combobox

Use **strict** when the set is closed and canonical (US states, ISO countries, currencies). The user cannot invent new values.

Use **freeform** when the set is open or advisory (city names, tags, company names). The user should be able to type something not in the list.

Default to strict. Only reach for freeform when you can articulate why the list is incomplete.

### Controls placement

Use **external** controls when the editor is compact and the save/cancel buttons fit naturally beside it. This is the standard choice for inline editing.

Use **internal** controls when the editor already has its own dismiss affordance (e.g., a combobox with a clear button and dropdown trigger) and external buttons would be redundant.

### When not to use inline editing

- **Forms with cross-field validation** — if field A's validity depends on field B, inline per-field editing breaks down. Use a traditional form.
- **Onboarding / creation flows** — inline editing assumes the record already exists. For new records, use a form or wizard.
- **Dangerous or irreversible changes** — if changing a value has significant consequences (deleting data, billing changes), add a confirmation step. Inline edit's instant-save pattern is too casual.
- **More than ~8 editable fields in one view** — if almost everything is editable, the page becomes a form pretending not to be one. Use a real form with a single save button.

### General rules

1. **One save per field.** Each inline field hits the server independently. Batch saves across fields are a different pattern (traditional forms).
2. **Optimistic display, pessimistic save.** Show the new value immediately in the input, but don't update the display value until the server confirms. On error, revert.
3. **Always call `router.invalidate()` after save.** This refreshes the loader data so the display value stays consistent with the server.
4. **Validation belongs on the server.** The `onSave` callback should throw on invalid input. The field catches it and shows the error. Client-side validation (min length, regex) is a convenience, not a substitute.
5. **Never default behavioral props.** `variant`, `controls`, and `mode` must be passed explicitly. This prevents silent behavior changes when components are reused in new contexts.
