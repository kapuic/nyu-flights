"use client"

import { useState } from "react"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { format } from "date-fns"
import { getData as getCountries, getCode } from "country-list"
import { Pencil, X } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineField } from "@/components/ui/inline-field"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { CountryFlag } from "@/components/country-flag"
import { DatePickerField } from "@/components/date-time-picker"
import { getCustomerProfileFn, updateCustomerFieldFn } from "@/lib/queries"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/account/")({
  loader: () => getCustomerProfileFn(),
  component: ProfilePage,
})

type CountryOption = { code: string; label: string }
const COUNTRY_OPTIONS: Array<CountryOption> = getCountries()
  .map((c) => ({ code: c.code, label: c.name }))
  .sort((a, b) => a.label.localeCompare(b.label))

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut",
  "Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois",
  "Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts",
  "Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada",
  "New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota",
  "Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina",
  "South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington",
  "West Virginia","Wisconsin","Wyoming",
] as const
type StateOption = { label: string }
const STATE_OPTIONS: Array<StateOption> = US_STATES.map((s) => ({ label: s }))

async function saveField(field: string, value: string) {
  await updateCustomerFieldFn({ data: { field, value } })
}

function formatDisplayDate(value: string) {
  if (!value) return ""
  const d = new Date(value.includes("T") ? value : `${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? value : format(d, "PPP")
}

function countryToCode(name: string): string {
  return getCode(name) ?? COUNTRY_OPTIONS.find((c) => c.label.toLowerCase() === name.toLowerCase())?.code ?? ""
}

function InlineFieldWrapper({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  return (
    <div className="group space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function InlineDateField({ label, value, onSave, readOnly = false }: { label: string; onSave?: (v: string) => Promise<void>; readOnly?: boolean; value: string }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  if (readOnly || !onSave) {
    return (
      <InlineFieldWrapper label={label}>
        <div className="flex min-h-8 items-center rounded-md px-2.5 py-1 text-sm">
          <span>{formatDisplayDate(value) || "Not set"}</span>
        </div>
      </InlineFieldWrapper>
    )
  }

  async function handleDateSelect(newValue: string) {
    if (newValue === value || !onSave) { setEditing(false); return }
    setSaving(true)
    setError("")
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <DatePickerField value={value} onChange={handleDateSelect} />
          </div>
          <button type="button" onClick={() => { setEditing(false); setError("") }} disabled={saving} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </InlineFieldWrapper>
    )
  }

  return (
    <InlineFieldWrapper label={label}>
      <div role="button" tabIndex={0} onClick={() => { setError(""); setEditing(true) }} onKeyDown={(e) => { if (e.key === "Enter") setEditing(true) }} className="flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors hover:bg-muted/50">
        <span className={value ? "" : "italic text-muted-foreground"}>{formatDisplayDate(value) || "Not set"}</span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  )
}

function InlineCountryField({ label, value, onSave }: { label: string; onSave: (v: string) => Promise<void>; value: string }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const code = countryToCode(value)
  const selected = COUNTRY_OPTIONS.find((c) => c.label === value || c.code === value || c.label.toLowerCase() === value.toLowerCase()) ?? null

  async function handleSelect(country: CountryOption | null) {
    const newValue = country?.label ?? ""
    if (!newValue || newValue === value) { setEditing(false); return }
    setSaving(true)
    setError("")
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Combobox items={COUNTRY_OPTIONS} value={selected} defaultOpen itemToStringValue={(c) => `${c.label} ${c.code}`} onValueChange={handleSelect}>
              <ComboboxInput placeholder="Search countries" showClear className="w-full h-8 bg-transparent" autoFocus />
              <ComboboxContent><ComboboxEmpty>No countries found.</ComboboxEmpty><ComboboxList>{(c) => <ComboboxItem key={c.code} value={c}><CountryFlag countryCode={c.code} size={16} /><span className="truncate">{c.label}</span><span className="text-xs text-muted-foreground">{c.code}</span></ComboboxItem>}</ComboboxList></ComboboxContent>
            </Combobox>
          </div>
          <button type="button" onClick={() => { setEditing(false); setError("") }} disabled={saving} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </InlineFieldWrapper>
    )
  }

  return (
    <InlineFieldWrapper label={label}>
      <div role="button" tabIndex={0} onClick={() => { setError(""); setEditing(true) }} onKeyDown={(e) => { if (e.key === "Enter") setEditing(true) }} className="flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors hover:bg-muted/50">
        <span className={cn("flex items-center gap-2", !value && "italic text-muted-foreground")}>{code && <CountryFlag countryCode={code} size={16} />}{value || "Not set"}</span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  )
}

function InlineStateField({ label, value, onSave }: { label: string; onSave: (v: string) => Promise<void>; value: string }) {
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const selected = STATE_OPTIONS.find((s) => s.label.toLowerCase() === value.toLowerCase()) ?? null

  async function handleSelect(state: StateOption | null) {
    const newValue = state?.label ?? ""
    if (!newValue || newValue === value) { setEditing(false); return }
    setSaving(true)
    setError("")
    try {
      await onSave(newValue)
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Combobox items={STATE_OPTIONS} value={selected} defaultOpen itemToStringValue={(s) => s.label} onValueChange={handleSelect}>
              <ComboboxInput placeholder="Search states" showClear className="w-full h-8 bg-transparent" autoFocus />
              <ComboboxContent><ComboboxEmpty>No states found.</ComboboxEmpty><ComboboxList>{(s) => <ComboboxItem key={s.label} value={s}><span className="truncate">{s.label}</span></ComboboxItem>}</ComboboxList></ComboboxContent>
            </Combobox>
          </div>
          <button type="button" onClick={() => { setEditing(false); setError("") }} disabled={saving} className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
      </InlineFieldWrapper>
    )
  }

  return (
    <InlineFieldWrapper label={label}>
      <div role="button" tabIndex={0} onClick={() => { setError(""); setEditing(true) }} onKeyDown={(e) => { if (e.key === "Enter") setEditing(true) }} className="flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors hover:bg-muted/50">
        <span className={value ? "" : "italic text-muted-foreground"}>{value || "Not set"}</span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  )
}

function ProfilePage() {
  const profile = Route.useLoaderData()
  const router = useRouter()
  async function save(field: string, value: string) { await saveField(field, value); void router.invalidate() }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField label="Name" value={profile.name} onSave={(v) => save("name", v)} />
          <InlineField label="Email" value={profile.email} readOnly />
          <InlineField label="Phone" value={profile.phoneNumber} onSave={(v) => save("phoneNumber", v)} />
          <InlineDateField label="Date of Birth" value={profile.dateOfBirth} readOnly />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Address</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField label="Building Number" value={profile.buildingNumber} onSave={(v) => save("buildingNumber", v)} />
          <InlineField label="Street" value={profile.street} onSave={(v) => save("street", v)} />
          <InlineField label="City" value={profile.city} onSave={(v) => save("city", v)} />
          <InlineStateField label="State" value={profile.state} onSave={(v) => save("state", v)} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Passport</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField label="Passport Number" value={profile.passportNumber} onSave={(v) => save("passportNumber", v)} />
          <InlineDateField label="Expiration" value={profile.passportExpiration} onSave={(v) => save("passportExpiration", v)} />
          <InlineCountryField label="Country" value={profile.passportCountry} onSave={(v) => save("passportCountry", v)} />
        </CardContent>
      </Card>
    </div>
  )
}
