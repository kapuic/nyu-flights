import { useEffect, useRef, useState } from "react"
import { Check, Pencil, X } from "lucide-react"

import { cn } from "@/lib/utils"

export type InlineFieldVariant = "filled" | "outline"

type InlineFieldProps = {
  error?: string
  label: string
  onSave?: (value: string) => Promise<void>
  readOnly?: boolean
  type?: "text" | "date"
  value: string
  variant: InlineFieldVariant
}

export function InlineField({
  error: externalError,
  label,
  onSave,
  readOnly = false,
  type = "text",
  value: currentValue,
  variant,
}: InlineFieldProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(currentValue)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!editing) setDraft(currentValue)
  }, [currentValue, editing])

  function startEditing() {
    if (readOnly || !onSave) return
    setDraft(currentValue)
    setError("")
    setEditing(true)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  async function save() {
    if (saving || !onSave) return
    const trimmed = draft.trim()
    if (trimmed === currentValue) {
      setEditing(false)
      return
    }
    setSaving(true)
    setError("")
    try {
      await onSave(trimmed)
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  function cancel() {
    setDraft(currentValue)
    setError("")
    setEditing(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      void save()
    }
    if (e.key === "Escape") {
      cancel()
    }
  }

  const displayError = error || externalError

  if (editing) {
    return (
      <div className="group space-y-1">
        <span className="text-xs font-medium text-muted-foreground">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <input
            ref={inputRef}
            type={type}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={(e) => {
              const related = e.relatedTarget as HTMLElement | null
              if (related?.dataset.inlineAction) return
              void save()
            }}
            disabled={saving}
            className={cn(
              "h-8 flex-1 rounded-md border border-input px-2.5 text-sm outline-none transition-colors",
              "focus:border-ring focus:ring-1 focus:ring-ring/50",
              "disabled:opacity-50",
              variant === "filled"
                ? "dark:bg-input/30 shadow-xs"
                : "bg-transparent"
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
        {displayError && (
          <p className="text-xs text-destructive">{displayError}</p>
        )}
      </div>
    )
  }

  return (
    <div className="group space-y-1">
      <span className="text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onClick={readOnly ? undefined : startEditing}
        onKeyDown={
          readOnly
            ? undefined
            : (e) => {
                if (e.key === "Enter") startEditing()
              }
        }
        className={cn(
          "flex min-h-8 items-center justify-between rounded-md px-2.5 py-1 text-sm transition-colors",
          readOnly
            ? "cursor-default"
            : "cursor-pointer hover:bg-muted/50"
        )}
      >
        <span className={currentValue ? "" : "italic text-muted-foreground"}>
          {currentValue || "Not set"}
        </span>
        {!readOnly && (
          <Pencil className="size-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
        )}
      </div>
      {displayError && (
        <p className="text-xs text-destructive">{displayError}</p>
      )}
    </div>
  )
}
