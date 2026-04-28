"use client";

import { useMemo, useRef, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { getCode, getData as getCountries } from "country-list";
import { Check, Pencil, X } from "lucide-react";

import type {InlineComboboxMode, InlineControls, InlineFieldVariant} from "@/components/ui/inline-field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  
  
  InlineField,
  
  InlinePhoneField,
  InlineStateField
} from "@/components/ui/inline-field";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { CountryFlag } from "@/components/country-flag";
import { DatePickerField } from "@/components/date-time-picker";
import { getCustomerProfileFn, updateCustomerFieldFn } from "@/lib/queries";
import { cn } from "@/lib/utils";

import { formatPlainDate } from "@/lib/temporal"

export const Route = createFileRoute("/account/")({
  loader: () => getCustomerProfileFn(),
  component: ProfilePage,
});

type CountryOption = { code: string; label: string };
const COUNTRY_OPTIONS: Array<CountryOption> = getCountries()
  .map((c) => ({ code: c.code, label: c.name }))
  .sort((a, b) => a.label.localeCompare(b.label));

async function saveField(field: string, value: string) {
  await updateCustomerFieldFn({ data: { field, value } });
}

function formatDisplayDate(value: string) {
  if (!value) return "";
  return formatPlainDate(value);
}

function countryToCode(name: string): string {
  return (
    getCode(name) ??
    COUNTRY_OPTIONS.find((c) => c.label.toLowerCase() === name.toLowerCase())?.code ??
    ""
  );
}

function InlineFieldWrapper({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
}) {
  return (
    <div className="group space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Ghost text overlay — renders inside ComboboxInput children (within InputGroup which is relative). */
function GhostOverlay({ input, suffix }: { input: string; suffix: string }) {
  if (!suffix) return null;
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden px-2.5 text-base md:text-sm">
      <span className="invisible whitespace-pre">{input}</span>
      <span className="whitespace-pre text-muted-foreground/40">{suffix}</span>
    </div>
  );
}

function InlineDateField({
  controls,
  label,
  onSave,
  readOnly = false,
  value,
  variant,
}: {
  controls: InlineControls;
  label: string;
  onSave?: (v: string) => Promise<void>;
  readOnly?: boolean;
  value: string;
  variant: InlineFieldVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (readOnly || !onSave) {
    return (
      <InlineFieldWrapper label={label}>
        <div className="flex min-h-8 items-center rounded-md px-2.5 py-1 text-sm">
          <span className={value ? "" : "italic text-muted-foreground"}>
            {formatDisplayDate(value) || "Not set"}
          </span>
        </div>
      </InlineFieldWrapper>
    );
  }

  async function handleDateSelect(newValue: string) {
    if (newValue === value || !onSave) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(newValue);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <DatePickerField
              value={value}
              onChange={handleDateSelect}
              defaultOpen
              className={cn("h-8", variant === "filled" ? "dark:bg-input/30" : "bg-transparent")}
            />
          </div>
          {controls === "external" && (
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError("");
              }}
              disabled={saving}
              className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </InlineFieldWrapper>
    );
  }

  return (
    <InlineFieldWrapper label={label}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setError("");
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(true);
        }}
        className="flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors hover:bg-muted"
      >
        <span className={value ? "" : "italic text-muted-foreground"}>
          {formatDisplayDate(value) || "Not set"}
        </span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  );
}

function InlineCountryField({
  controls,
  label,
  mode,
  onSave,
  value,
  variant,
}: {
  controls: InlineControls;
  label: string;
  mode: InlineComboboxMode;
  onSave: (v: string) => Promise<void>;
  value: string;
  variant: InlineFieldVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inputText, setInputText] = useState("");
  const [highlightedItem, setHighlightedItem] = useState<CountryOption | undefined>(undefined);
  const selectingRef = useRef(false);
  const code = countryToCode(value);
  const selected =
    COUNTRY_OPTIONS.find(
      (c) => c.label === value || c.code === value || c.label.toLowerCase() === value.toLowerCase(),
    ) ?? null;

  // Ghost shows the completion for the currently highlighted item, not a static first-match
  const ghost = useMemo(() => {
    if (mode !== "strict" || !inputText || !highlightedItem) return "";
    const countryLabel = highlightedItem.label;
    if (!countryLabel.toLowerCase().startsWith(inputText.toLowerCase())) return "";
    return countryLabel.slice(inputText.length);
  }, [mode, inputText, highlightedItem]);
  // Sort startsWith matches first so autoHighlight aligns with ghost text
  const filteredCountries = useMemo(() => {
    if (!inputText) return COUNTRY_OPTIONS;
    const lower = inputText.toLowerCase();
    const starts: Array<CountryOption> = [];
    const contains: Array<CountryOption> = [];
    for (const c of COUNTRY_OPTIONS) {
      if (c.label.toLowerCase().startsWith(lower)) {
        starts.push(c);
      } else if (`${c.label} ${c.code}`.toLowerCase().includes(lower)) {
        contains.push(c);
      }
    }
    return [...starts, ...contains];
  }, [inputText]);

  function cancel() {
    setEditing(false);
    setError("");
  }

  async function handleSelect(country: CountryOption | null) {
    if (!country) return; // input cleared, not a selection
    selectingRef.current = true;
    if (country.label === value) {
      cancel();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(country.label);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFreeform() {
    const trimmed = inputText.trim();
    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error}>
        <div className="flex items-center gap-1.5">
          <div className="flex-1">
            <Combobox
              items={filteredCountries}
              value={selected}
              defaultOpen
              autoHighlight={mode === "strict"}
              itemToStringValue={(c) => `${c.label} ${c.code}`}
              onValueChange={handleSelect}
              onInputValueChange={(text) => setInputText(text)}
              onItemHighlighted={(item) => setHighlightedItem(item)}
              onOpenChange={(isOpen) => {
                if (!isOpen) {
                  setTimeout(() => {
                    if (!selectingRef.current) {
                      if (mode === "freeform") {
                        void saveFreeform();
                      } else {
                        cancel();
                      }
                    }
                    selectingRef.current = false;
                  }, 0);
                }
              }}
            >
              <ComboboxInput
                placeholder="Search countries"
                showClear={controls === "internal"}
                showTrigger={controls === "internal"}
                className={cn(
                  "w-full h-8",
                  variant === "outline" && "dark:!bg-transparent !shadow-none",
                )}
                autoFocus
              >
                {mode === "strict" && <GhostOverlay input={inputText} suffix={ghost} />}
              </ComboboxInput>
              <ComboboxContent>
                <ComboboxEmpty>No countries found.</ComboboxEmpty>
                <ComboboxList>
                  {(c) => (
                    <ComboboxItem key={c.code} value={c}>
                      <CountryFlag countryCode={c.code} size={16} />
                      <span className="truncate">{c.label}</span>
                      <span className="text-xs text-muted-foreground">{c.code}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          {controls === "external" && (
            <>
              {mode === "freeform" && (
                <button
                  type="button"
                  data-inline-action="save"
                  onClick={() => void saveFreeform()}
                  disabled={saving}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Check className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                data-inline-action="cancel"
                onClick={cancel}
                disabled={saving}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            </>
          )}
        </div>
      </InlineFieldWrapper>
    );
  }

  return (
    <InlineFieldWrapper label={label}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setError("");
          setEditing(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") setEditing(true);
        }}
        className="flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm cursor-pointer transition-colors hover:bg-muted"
      >
        <span className={cn("flex items-center gap-2", !value && "italic text-muted-foreground")}>
          {code && <CountryFlag countryCode={code} size={16} />}
          {value || "Not set"}
        </span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  );
}

function ProfilePage() {
  const profile = Route.useLoaderData();
  const router = useRouter();
  async function save(field: string, value: string) {
    await saveField(field, value);
    void router.invalidate();
  }

  const V: InlineFieldVariant = "filled";
  const C: InlineControls = "external";
  const M: InlineComboboxMode = "strict";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your personal information.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField
            variant={V}
            label="Name"
            value={profile.name}
            onSave={(v) => save("name", v)}
          />
          <InlineField variant={V} label="Email" value={profile.email} readOnly />
          <InlinePhoneField
            controls={C}
            label="Phone"
            value={profile.phoneNumber}
            onSave={(v) => save("phoneNumber", v)}
          />
          <InlineDateField
            variant={V}
            controls={C}
            label="Date of Birth"
            value={profile.dateOfBirth}
            readOnly
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField
            variant={V}
            label="Street"
            value={profile.street}
            onSave={(v) => save("street", v)}
          />
          <InlineField
            variant={V}
            label="Building #"
            value={profile.buildingNumber}
            onSave={(v) => save("buildingNumber", v)}
          />
          <InlineField
            variant={V}
            label="City"
            value={profile.city}
            onSave={(v) => save("city", v)}
          />
          <InlineStateField
            variant={V}
            controls={C}
            mode={M}
            label="State"
            value={profile.state}
            onSave={(v) => save("state", v)}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Passport</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <InlineField
            variant={V}
            label="Passport #"
            value={profile.passportNumber}
            onSave={(v) => save("passportNumber", v)}
          />
          <InlineDateField
            variant={V}
            controls={C}
            label="Expiration"
            value={profile.passportExpiration}
            onSave={(v) => save("passportExpiration", v)}
          />
          <InlineCountryField
            variant={V}
            controls={C}
            mode={M}
            label="Country"
            value={profile.passportCountry}
            onSave={(v) => save("passportCountry", v)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
