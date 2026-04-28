import * as React from "react"
import * as RPNInput from "react-phone-number-input"
import { CheckIcon, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CountryFlag } from "@/components/country-flag"
import { cn } from "@/lib/utils"

// ---------------------------------------------------------------------------
// PhoneInput — wraps react-phone-number-input with shadcn styling
// ---------------------------------------------------------------------------

type PhoneInputProps = Omit<
  React.ComponentProps<"input">,
  "onChange" | "value" | "ref"
> & {
  onChange?: (value: RPNInput.Value) => void
  value?: RPNInput.Value
}

const PhoneInput = React.forwardRef<
  React.ComponentRef<typeof RPNInput.default>,
  PhoneInputProps
>(({ className, onChange, value, ...props }, ref) => {
  return (
    <RPNInput.default
      ref={ref}
      className={cn("flex", className)}
      flagComponent={FlagComponent}
      countrySelectComponent={CountrySelect}
      inputComponent={InputComponent}
      smartCaret={false}
      international
      value={value || undefined}
      onChange={(v) => onChange?.(v || ("" as RPNInput.Value))}
      {...props}
    />
  )
})
PhoneInput.displayName = "PhoneInput"

// ---------------------------------------------------------------------------
// InputComponent — renders our shadcn Input inside react-phone-number-input
// ---------------------------------------------------------------------------

const InputComponent = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, ...props }, ref) => (
  <Input
    className={cn("rounded-s-none rounded-e-lg", className)}
    {...props}
    ref={ref}
  />
))
InputComponent.displayName = "InputComponent"

// ---------------------------------------------------------------------------
// FlagComponent — uses our circle-flags instead of react-phone-number-input SVGs
// ---------------------------------------------------------------------------

function FlagComponent({ country }: RPNInput.FlagProps) {
  return (
    <span className="flex size-5 items-center justify-center overflow-hidden rounded-full bg-foreground/20">
      {country && <CountryFlag countryCode={country} size={20} />}
    </span>
  )
}

// ---------------------------------------------------------------------------
// CountrySelect — popover with scrollable country list
// ---------------------------------------------------------------------------

type CountryEntry = { label: string; value: RPNInput.Country | undefined }

type CountrySelectProps = {
  disabled?: boolean
  value: RPNInput.Country
  options: CountryEntry[]
  onChange: (country: RPNInput.Country) => void
}

function CountrySelect({
  disabled,
  value: selectedCountry,
  options: countryList,
  onChange,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const filtered = React.useMemo(() => {
    if (!search) return countryList
    const lower = search.toLowerCase()
    return countryList.filter(
      (c) =>
        c.value &&
        (c.label.toLowerCase().includes(lower) ||
          c.value.toLowerCase().includes(lower))
    )
  }, [countryList, search])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="flex gap-1 rounded-e-none rounded-s-lg border-r-0 px-3 focus:z-10"
            disabled={disabled}
          />
        }
      >
        <FlagComponent
          country={selectedCountry}
          countryName={selectedCountry}
        />
        <ChevronsUpDown
          className={cn(
            "-mr-2 size-4 opacity-50",
            disabled ? "hidden" : "opacity-100"
          )}
        />
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search country..."
            className="h-8 w-full rounded-md border border-input bg-transparent px-2.5 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring/50"
            autoFocus
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No country found.
            </p>
          )}
          {filtered.map(({ value, label }) =>
            value ? (
              <button
                key={value}
                type="button"
                className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onChange(value)
                  setOpen(false)
                  setSearch("")
                }}
              >
                <FlagComponent country={value} countryName={label} />
                <span className="flex-1 text-left">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {`+${RPNInput.getCountryCallingCode(value)}`}
                </span>
                <CheckIcon
                  className={cn(
                    "ml-auto size-4",
                    value === selectedCountry ? "opacity-100" : "opacity-0"
                  )}
                />
              </button>
            ) : null
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export { PhoneInput }
export type { PhoneInputProps }
