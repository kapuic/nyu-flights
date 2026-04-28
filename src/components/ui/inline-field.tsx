import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import type { Value as PhoneValue } from "react-phone-number-input";

import { PhoneInput } from "@/components/ui/phone-input";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { US_STATES } from "@/lib/schemas";

import { cn } from "@/lib/utils";

export type InlineControls = "internal" | "external";
export type InlineFieldVariant = "filled" | "outline";

type InlineFieldProps = {
  ariaLabel?: string;
  error?: string;
  label: string;
  onSave?: (value: string) => Promise<void>;
  readOnly?: boolean;
  type?: "text" | "date";
  value: string;
  variant: InlineFieldVariant;
};

export function InlineField({
  ariaLabel,
  error: externalError,
  label,
  onSave,
  readOnly = false,
  type = "text",
  value: currentValue,
  variant,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(currentValue);
  }, [currentValue, editing]);

  function startEditing() {
    if (readOnly || !onSave) return;
    setDraft(currentValue);
    setError("");
    setEditing(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  async function save() {
    if (saving || !onSave) return;
    const trimmed = draft.trim();
    if (trimmed === currentValue) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(currentValue);
    setError("");
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    }
    if (e.key === "Escape") {
      cancel();
    }
  }

  const displayError = error || externalError;

  if (editing) {
    return (
      <div className="group space-y-1">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1.5">
          <input
            aria-label={ariaLabel ?? label}
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              const related = e.relatedTarget as HTMLElement | null;
              if (related?.dataset.inlineAction) return;
              void save();
            }}
            disabled={saving}
            className={cn(
              "h-8 flex-1 rounded-md border border-input px-2.5 text-sm outline-none transition-colors",
              "focus:border-ring focus:ring-1 focus:ring-ring/50",
              "disabled:opacity-50",
              variant === "filled" ? "dark:bg-input/30 shadow-xs" : "bg-transparent",
            )}
          />
          <button
            type="button"
            data-inline-action="save"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            data-inline-action="cancel"
            onClick={cancel}
            disabled={saving}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
        {displayError && <p className="text-xs text-destructive">{displayError}</p>}
      </div>
    );
  }

  return (
    <div className="group space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div
        aria-label={ariaLabel ?? label}
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onClick={readOnly ? undefined : startEditing}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === "Enter") startEditing();
              }
        }
        className={cn(
          "flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm transition-colors",
          readOnly ? "cursor-default" : "cursor-pointer hover:bg-muted",
        )}
      >
        <span className={currentValue ? "" : "italic text-muted-foreground"}>
          {currentValue || "Not set"}
        </span>
        {!readOnly && (
          <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        )}
      </div>
      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}

type InlinePhoneFieldProps = {
  controls: InlineControls;
  displayValue?: string;
  label: string;
  onSave: (value: string) => Promise<void>;
  showLabel?: boolean;
  value: string;
  variant?: InlineFieldVariant;
};

export function InlinePhoneField({
  controls,
  displayValue,
  label,
  onSave,
  showLabel = true,
  value,
  variant = "filled",
}: InlinePhoneFieldProps) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(value);
  const pickerOpenRef = useRef(false);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  function startEditing() {
    setDraft(value);
    setError("");
    setEditing(true);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    setError("");
  }

  async function save() {
    if (saving) return;
    const trimmed = draft.trim();
    if (!trimmed || trimmed === value) {
      cancel();
      return;
    }

    setSaving(true);
    setError("");
    try {
      await onSave(trimmed);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  const fieldClassName = cn(
    "h-8 [&_button]:h-8 [&_input]:h-8",
    variant === "outline" && "[&_input]:bg-transparent",
  );

  if (editing) {
    return (
      <div className="group space-y-1">
        {showLabel ? (
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        ) : null}
        <div
          className="flex items-center gap-1.5"
          onBlur={(event) => {
            const related = event.relatedTarget as HTMLElement | null;
            if (related?.dataset.inlineAction) return;
            if (event.currentTarget.contains(related)) return;
            requestAnimationFrame(() => {
              if (pickerOpenRef.current) return;
              void save();
            });
          }}
        >
          <div className="flex-1">
            <PhoneInput
              defaultCountry="US"
              value={draft as PhoneValue}
              onChange={(nextValue: PhoneValue) => setDraft(nextValue ?? "")}
              placeholder="(555) 000-0000"
              className={fieldClassName}
              pickerOpenRef={pickerOpenRef}
            />
          </div>
          {controls === "external" ? (
            <>
              <button
                type="button"
                data-inline-action="save"
                onClick={() => void save()}
                disabled={saving}
                className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Check className="size-3.5" />
              </button>
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
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="group space-y-1">
      {showLabel ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
      <div
        aria-label={label}
        role="button"
        tabIndex={0}
        onClick={startEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") startEditing();
        }}
        className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted"
      >
        <span className={value ? "" : "italic text-muted-foreground"}>
          {displayValue || value || "Not set"}
        </span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export type InlineComboboxMode = "freeform" | "strict";
type StateOption = { label: string };

const STATE_OPTIONS: Array<StateOption> = US_STATES.map((state) => ({ label: state }));

function InlineFieldWrapper({
  children,
  error,
  label,
  showLabel = true,
}: {
  children: React.ReactNode;
  error?: string;
  label: string;
  showLabel?: boolean;
}) {
  return (
    <div className="group space-y-1">
      {showLabel ? (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      ) : null}
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function GhostOverlay({ input, suffix }: { input: string; suffix: string }) {
  if (!suffix) return null;
  return (
    <div className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden px-2.5 text-base md:text-sm">
      <span className="invisible whitespace-pre">{input}</span>
      <span className="whitespace-pre text-muted-foreground/40">{suffix}</span>
    </div>
  );
}

export function InlineStateField({
  controls,
  className,
  label,
  mode,
  onSave,
  showLabel = true,
  value,
  variant,
}: {
  controls: InlineControls;
  className?: string;
  label: string;
  mode: InlineComboboxMode;
  onSave: (value: string) => Promise<void>;
  showLabel?: boolean;
  value: string;
  variant: InlineFieldVariant;
}) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [inputText, setInputText] = useState("");
  const [highlightedItem, setHighlightedItem] = useState<StateOption | undefined>(undefined);
  const selectingRef = useRef(false);
  const selected =
    STATE_OPTIONS.find((state) => state.label.toLowerCase() === value.toLowerCase()) ?? null;

  const ghost = useMemo(() => {
    if (mode !== "strict" || !inputText || !highlightedItem) return "";
    const label = highlightedItem.label;
    if (!label.toLowerCase().startsWith(inputText.toLowerCase())) return "";
    return label.slice(inputText.length);
  }, [mode, inputText, highlightedItem]);
  const filteredStates = useMemo(() => {
    if (!inputText) return STATE_OPTIONS;
    const lower = inputText.toLowerCase();
    const starts: Array<StateOption> = [];
    const contains: Array<StateOption> = [];
    for (const state of STATE_OPTIONS) {
      if (state.label.toLowerCase().startsWith(lower)) {
        starts.push(state);
        continue;
      }
      if (state.label.toLowerCase().includes(lower)) contains.push(state);
    }
    return [...starts, ...contains];
  }, [inputText]);

  function cancel() {
    setEditing(false);
    setError("");
  }

  async function handleSelect(state: StateOption | null) {
    if (!state) return;
    selectingRef.current = true;
    if (state.label === value) {
      cancel();
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(state.label);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <InlineFieldWrapper label={label} error={error} showLabel={showLabel}>
        <div className={cn("flex items-center gap-1.5", className)}>
          <div className="flex-1">
            <Combobox
              items={filteredStates}
              value={selected}
              defaultOpen
              autoHighlight={mode === "strict"}
              itemToStringValue={(state) => state.label}
              onValueChange={handleSelect}
              onInputValueChange={(text) => setInputText(text)}
              onItemHighlighted={(item) => setHighlightedItem(item)}
              onOpenChange={(isOpen) => {
                if (isOpen) return;
                setTimeout(() => {
                  if (!selectingRef.current) {
                    if (mode === "freeform") void saveFreeform();
                    else cancel();
                  }
                  selectingRef.current = false;
                }, 0);
              }}
            >
              <ComboboxInput
                placeholder="Search states"
                showClear={controls === "internal"}
                showTrigger={controls === "internal"}
                className={cn(
                  "h-8 w-full",
                  variant === "outline" && "!shadow-none dark:!bg-transparent",
                )}
                autoFocus
              >
                {mode === "strict" ? <GhostOverlay input={inputText} suffix={ghost} /> : null}
              </ComboboxInput>
              <ComboboxContent>
                <ComboboxEmpty>No states found.</ComboboxEmpty>
                <ComboboxList>
                  {(state) => (
                    <ComboboxItem key={state.label} value={state}>
                      <span className="truncate">{state.label}</span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          {controls === "external" ? (
            <>
              {mode === "freeform" ? (
                <button
                  type="button"
                  data-inline-action="save"
                  onClick={() => void saveFreeform()}
                  disabled={saving}
                  className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Check className="size-3.5" />
                </button>
              ) : null}
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
          ) : null}
        </div>
      </InlineFieldWrapper>
    );
  }

  return (
    <InlineFieldWrapper label={label} showLabel={showLabel}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          setError("");
          setEditing(true);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") setEditing(true);
        }}
        className="flex min-h-8 cursor-pointer items-center justify-between rounded-md px-2.5 py-1 text-sm transition-colors hover:bg-muted"
      >
        <span className={value ? "" : "italic text-muted-foreground"}>{value || "Not set"}</span>
        <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
      </div>
    </InlineFieldWrapper>
  );
}
