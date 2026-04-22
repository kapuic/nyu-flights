import { getData as getCountries } from "country-list"
import { faker } from "@faker-js/faker"
import { addYears, format } from "date-fns"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  Eye,
  UserRoundPlus,
} from "lucide-react"
import { IMaskInput } from "react-imask"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { APP_NAME } from "@/lib/app-config"
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images"
import { cn } from "@/lib/utils"

type SignupFormProps = {
  className?: string
  error: string | null
  fieldErrors?: Partial<Record<keyof SignupFormProps["fields"], string | null>>
  heroImageUrl?: string
  fields: {
    name: { value: string; onChange: (v: string) => void }
    email: { value: string; onChange: (v: string) => void }
    password: { value: string; onChange: (v: string) => void }
    dateOfBirth: { value: string; onChange: (v: string) => void }
    phoneNumber: { value: string; onChange: (v: string) => void }
    street: { value: string; onChange: (v: string) => void }
    buildingNumber: { value: string; onChange: (v: string) => void }
    city: { value: string; onChange: (v: string) => void }
    state: { value: string; onChange: (v: string) => void }
    passportNumber: { value: string; onChange: (v: string) => void }
    passportCountry: { value: string; onChange: (v: string) => void }
    passportExpiration: { value: string; onChange: (v: string) => void }
  }
  isSubmitting: boolean
  onSubmit: (e: React.FormEvent) => void
}

type RegionOption = {
  code: string
  label: string
  flag?: string
}

const maskedInputClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

const US_STATE_OPTIONS: Array<RegionOption> = [
  { code: "AL", label: "Alabama" },
  { code: "AK", label: "Alaska" },
  { code: "AZ", label: "Arizona" },
  { code: "AR", label: "Arkansas" },
  { code: "CA", label: "California" },
  { code: "CO", label: "Colorado" },
  { code: "CT", label: "Connecticut" },
  { code: "DE", label: "Delaware" },
  { code: "FL", label: "Florida" },
  { code: "GA", label: "Georgia" },
  { code: "HI", label: "Hawaii" },
  { code: "ID", label: "Idaho" },
  { code: "IL", label: "Illinois" },
  { code: "IN", label: "Indiana" },
  { code: "IA", label: "Iowa" },
  { code: "KS", label: "Kansas" },
  { code: "KY", label: "Kentucky" },
  { code: "LA", label: "Louisiana" },
  { code: "ME", label: "Maine" },
  { code: "MD", label: "Maryland" },
  { code: "MA", label: "Massachusetts" },
  { code: "MI", label: "Michigan" },
  { code: "MN", label: "Minnesota" },
  { code: "MS", label: "Mississippi" },
  { code: "MO", label: "Missouri" },
  { code: "MT", label: "Montana" },
  { code: "NE", label: "Nebraska" },
  { code: "NV", label: "Nevada" },
  { code: "NH", label: "New Hampshire" },
  { code: "NJ", label: "New Jersey" },
  { code: "NM", label: "New Mexico" },
  { code: "NY", label: "New York" },
  { code: "NC", label: "North Carolina" },
  { code: "ND", label: "North Dakota" },
  { code: "OH", label: "Ohio" },
  { code: "OK", label: "Oklahoma" },
  { code: "OR", label: "Oregon" },
  { code: "PA", label: "Pennsylvania" },
  { code: "RI", label: "Rhode Island" },
  { code: "SC", label: "South Carolina" },
  { code: "SD", label: "South Dakota" },
  { code: "TN", label: "Tennessee" },
  { code: "TX", label: "Texas" },
  { code: "UT", label: "Utah" },
  { code: "VT", label: "Vermont" },
  { code: "VA", label: "Virginia" },
  { code: "WA", label: "Washington" },
  { code: "WV", label: "West Virginia" },
  { code: "WI", label: "Wisconsin" },
  { code: "WY", label: "Wyoming" },
]

function parseDateValue(value: string) {
  if (!value) return undefined
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
}

function formatDateValue(date: Date | undefined) {
  if (!date) return ""
  return format(date, "yyyy-MM-dd")
}

function getFlagEmoji(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

function DatePickerField({
  id,
  onChange,
  placeholder,
  value,
}: {
  id: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  const selectedDate = parseDateValue(value)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            variant="outline"
            data-empty={!selectedDate}
            className="w-full justify-between text-left font-normal data-[empty=true]:text-muted-foreground"
          />
        }
      >
        <CalendarIcon data-icon="inline-start" />
        {selectedDate ? (
          format(selectedDate, "PPP")
        ) : (
          <span>{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selectedDate}
          onSelect={(date) => onChange(formatDateValue(date))}
        />
      </PopoverContent>
    </Popover>
  )
}

function RegionCombobox({
  ariaLabel,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string
  onChange: (value: string) => void
  options: Array<RegionOption>
  placeholder: string
  value: string
}) {
  const selectedOption =
    options.find((option) => option.label === value || option.code === value) ??
    null

  return (
    <Combobox
      items={options}
      itemToStringValue={(option) => `${option.label} ${option.code}`}
      value={selectedOption}
      onValueChange={(option) => onChange(option?.label ?? "")}
    >
      <ComboboxInput
        aria-label={ariaLabel}
        placeholder={placeholder}
        showClear
      />
      <ComboboxContent>
        <ComboboxEmpty>No matches found.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.code} value={option}>
              <span className="flex min-w-0 items-center gap-2">
                {option.flag ? <span aria-hidden>{option.flag}</span> : null}
                <span className="truncate">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.code}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

export function SignupForm({
  className,
  error,
  fieldErrors,
  fields,
  heroImageUrl = TRAVELER_AUTH_IMAGE_URLS[1],
  isSubmitting,
  onSubmit,
  ...props
}: SignupFormProps & Omit<React.ComponentProps<"div">, keyof SignupFormProps>) {
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const countryOptions = useMemo<Array<RegionOption>>(
    () =>
      getCountries().map((country) => ({
        code: country.code,
        flag: getFlagEmoji(country.code),
        label: country.name,
      })),
    []
  )

  function handleFillRandomDetails() {
    const country = faker.helpers.arrayElement(countryOptions)
    const state = faker.helpers.arrayElement(US_STATE_OPTIONS)
    const birthDate = faker.date.birthdate({ max: 65, min: 21, mode: "age" })
    const passportExpiration = faker.date.between({
      from: addYears(new Date(), 2),
      to: addYears(new Date(), 8),
    })

    fields.buildingNumber.onChange(faker.location.buildingNumber())
    fields.city.onChange(faker.location.city())
    fields.dateOfBirth.onChange(format(birthDate, "yyyy-MM-dd"))
    fields.passportCountry.onChange(country.label)
    fields.passportExpiration.onChange(format(passportExpiration, "yyyy-MM-dd"))
    fields.passportNumber.onChange(
      faker.string.alphanumeric({ casing: "upper", length: 9 })
    )
    fields.phoneNumber.onChange(
      faker.helpers.replaceSymbols("+1 (###) ###-####")
    )
    fields.state.onChange(state.label)
    fields.street.onChange(faker.location.streetAddress())
  }

  function handleContinue() {
    setStep(2)
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
                  <UserRoundPlus className="size-5" />
                </div>
                <h1 className="text-2xl font-bold">
                  {step === 1 ? "Create your account" : "One more step…"}
                </h1>
                <p className="text-sm text-balance text-muted-foreground">
                  {step === 1
                    ? `Join ${APP_NAME} to book flights and manage trips.`
                    : "We need the remaining required profile details before creating your account."}
                </p>
              </div>

              {step === 1 ? (
                <>
                  <Field data-invalid={Boolean(fieldErrors?.name)}>
                    <FieldLabel htmlFor="signup-name">Full Name</FieldLabel>
                    <Input
                      aria-invalid={Boolean(fieldErrors?.name)}
                      id="signup-name"
                      onChange={(e) => fields.name.onChange(e.target.value)}
                      placeholder="John Smith"
                      required
                      value={fields.name.value}
                    />
                    {fieldErrors?.name ? (
                      <FieldDescription className="text-destructive">
                        {fieldErrors.name}
                      </FieldDescription>
                    ) : null}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors?.email)}>
                    <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                    <Input
                      aria-invalid={Boolean(fieldErrors?.email)}
                      id="signup-email"
                      onChange={(e) => fields.email.onChange(e.target.value)}
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={fields.email.value}
                    />
                    {fieldErrors?.email ? (
                      <FieldDescription className="text-destructive">
                        {fieldErrors.email}
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        We&apos;ll use this to send booking confirmations.
                      </FieldDescription>
                    )}
                  </Field>

                  <Field data-invalid={Boolean(fieldErrors?.password)}>
                    <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        aria-invalid={Boolean(fieldErrors?.password)}
                        autoComplete="new-password"
                        className="pr-10"
                        id="signup-password"
                        onChange={(e) =>
                          fields.password.onChange(e.target.value)
                        }
                        placeholder="••••••••"
                        required
                        type={showPassword ? "text" : "password"}
                        value={fields.password.value}
                      />
                      <Button
                        className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowPassword(!showPassword)}
                        size="icon-sm"
                        type="button"
                        variant="ghost"
                      >
                        <Eye className="size-4" />
                      </Button>
                    </div>
                    {fieldErrors?.password ? (
                      <FieldDescription className="text-destructive">
                        {fieldErrors.password}
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        Must be at least 8 characters long.
                      </FieldDescription>
                    )}
                  </Field>
                </>
              ) : null}

              {step === 2 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">
                        Personal details
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Tell us who is traveling.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-dob">
                          Date of Birth
                        </FieldLabel>
                        <DatePickerField
                          id="signup-dob"
                          onChange={fields.dateOfBirth.onChange}
                          placeholder="Select date"
                          value={fields.dateOfBirth.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-phone">Phone</FieldLabel>
                        <IMaskInput
                          id="signup-phone"
                          className={maskedInputClassName}
                          mask="+{1} (000) 000-0000"
                          onAccept={(value) =>
                            fields.phoneNumber.onChange(String(value))
                          }
                          placeholder="+1 (555) 000-0000"
                          value={fields.phoneNumber.value}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">
                        Home address
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        This address is stored on your traveler profile.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-street">Street</FieldLabel>
                        <Input
                          id="signup-street"
                          onChange={(e) =>
                            fields.street.onChange(e.target.value)
                          }
                          placeholder="123 Main St"
                          required
                          value={fields.street.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-building">
                          Building #
                        </FieldLabel>
                        <Input
                          id="signup-building"
                          onChange={(e) =>
                            fields.buildingNumber.onChange(e.target.value)
                          }
                          placeholder="4A"
                          required
                          value={fields.buildingNumber.value}
                        />
                      </Field>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-city">City</FieldLabel>
                        <Input
                          id="signup-city"
                          onChange={(e) => fields.city.onChange(e.target.value)}
                          placeholder="New York"
                          required
                          value={fields.city.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-state">State</FieldLabel>
                        <RegionCombobox
                          ariaLabel="State"
                          onChange={fields.state.onChange}
                          options={US_STATE_OPTIONS}
                          placeholder="Search state"
                          value={fields.state.value}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">
                        Passport details
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Required by the current database schema for traveler
                        accounts.
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-passport">
                          Passport #
                        </FieldLabel>
                        <Input
                          id="signup-passport"
                          onChange={(e) =>
                            fields.passportNumber.onChange(e.target.value)
                          }
                          placeholder="Required for international"
                          required
                          value={fields.passportNumber.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-passport-country">
                          Passport Country
                        </FieldLabel>
                        <RegionCombobox
                          ariaLabel="Passport country"
                          onChange={fields.passportCountry.onChange}
                          options={countryOptions}
                          placeholder="Search country"
                          value={fields.passportCountry.value}
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="signup-passport-exp">
                        Passport Expiration
                      </FieldLabel>
                      <DatePickerField
                        id="signup-passport-exp"
                        onChange={fields.passportExpiration.onChange}
                        placeholder="Select date"
                        value={fields.passportExpiration.value}
                      />
                    </Field>
                  </div>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Field>
                {step === 1 ? (
                  <Button
                    className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                    onClick={handleContinue}
                    type="button"
                  >
                    Continue
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        className="sm:w-auto"
                        onClick={() => setStep(1)}
                        type="button"
                        variant="outline"
                      >
                        <ChevronLeft data-icon="inline-start" />
                        Back
                      </Button>
                      <Button
                        className="sm:w-auto"
                        onClick={handleFillRandomDetails}
                        type="button"
                        variant="secondary"
                      >
                        Fill Form with Randomized Details
                      </Button>
                    </div>
                    <Button
                      className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                      disabled={isSubmitting}
                      type="submit"
                    >
                      {isSubmitting ? "Creating account…" : "Create Account"}
                    </Button>
                  </div>
                )}
                <div className="space-y-2 text-center text-sm text-muted-foreground">
                  <p>
                    Already have an account?{" "}
                    <a
                      className="font-medium text-foreground underline underline-offset-4"
                      href="/login"
                    >
                      Sign in
                    </a>
                  </p>
                  <p>
                    Staff member?{" "}
                    <a
                      className="font-medium text-foreground underline underline-offset-4"
                      href="/staff/register"
                    >
                      Create staff account
                    </a>
                  </p>
                </div>
              </Field>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-slate-100 md:block">
            <img
              alt="Traveler signup"
              className="absolute inset-0 h-full w-full object-cover"
              src={heroImageUrl}
            />
            <div className="absolute inset-0 bg-black/20" />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        By continuing, you agree to our <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
