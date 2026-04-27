import { getData as getCountries } from "country-list"
import { faker } from "@faker-js/faker"
import { useForm } from "@tanstack/react-form"
import { Link, useRouter } from "@tanstack/react-router"
import { addYears, format } from "date-fns"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  Eye,
  UserRoundPlus,
} from "lucide-react"
import { IMaskInput } from "react-imask"
import { type ComponentProps, type FormEvent, type ReactNode, useId, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { CountryFlag } from "@/components/country-flag"
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
  FieldError,
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
import { registerCustomerFn } from "@/lib/auth"
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images"
import { customerRegistrationSchema } from "@/lib/schemas"
import { cn, getErrorMessage } from "@/lib/utils"

type RegionOption = {
  code: string
  label: string
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



function DatePickerField({
  id,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  id: string
  onBlur?: () => void
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
            type="button"
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
          onSelect={(date) => {
            onChange(formatDateValue(date))
            onBlur?.()
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

function RegionCombobox({
  ariaLabel,
  onBlur,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string
  onBlur?: () => void
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
      onValueChange={(option) => {
        onChange(option?.label ?? "")
        onBlur?.()
      }}
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
                {option.code ? <CountryFlag countryCode={option.code} size={16} /> : null}
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

/**
 * Self-contained signup form that owns its own useForm + submit logic.
 * Eliminates the 12-level deep form.Field nesting from the old implementation.
 */
export function SignupFormFields({
  onSuccess,
  footer,
}: {
  onSuccess: () => void
  footer?: ReactNode
}) {
  const router = useRouter()
  const formId = useId()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

  const form = useForm({
    defaultValues: {
      buildingNumber: "",
      city: "",
      dateOfBirth: "",
      email: "",
      name: "",
      passportCountry: "",
      passportExpiration: "",
      passportNumber: "",
      password: "",
      phoneNumber: "",
      state: "",
      street: "",
    },
    validators: {
      onSubmit: customerRegistrationSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await registerCustomerFn({ data: value })
      if (result.error) {
        throw new Error(result.error)
      }
      await router.invalidate()
      onSuccess()
    },
  })

  const countryOptions = useMemo<Array<RegionOption>>(
    () =>
      getCountries().map((country) => ({
        code: country.code,
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

    form.setFieldValue("buildingNumber", faker.location.buildingNumber())
    form.setFieldValue("city", faker.location.city())
    form.setFieldValue("dateOfBirth", format(birthDate, "yyyy-MM-dd"))
    form.setFieldValue("passportCountry", country.label)
    form.setFieldValue(
      "passportExpiration",
      format(passportExpiration, "yyyy-MM-dd")
    )
    form.setFieldValue(
      "passportNumber",
      faker.string.alphanumeric({ casing: "upper", length: 9 })
    )
    form.setFieldValue(
      "phoneNumber",
      faker.helpers.replaceSymbols("+1 (###) ###-####")
    )
    form.setFieldValue("state", state.label)
    form.setFieldValue("street", faker.location.streetAddress())
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)

    try {
      await form.handleSubmit()
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."))
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (step === 1) {
          e.preventDefault()
          e.stopPropagation()

          const values = form.state.values
          const stepOneValid = customerRegistrationSchema
            .pick({
              email: true,
              name: true,
              password: true,
            })
            .safeParse({
              email: values.email,
              name: values.name,
              password: values.password,
            })

          if (stepOneValid.success) {
            setError(null)
            setStep(2)
            return
          }

          setError(stepOneValid.error.issues.map((issue) => issue.message).join(" "))
          return
        }

        void handleSubmit(e)
      }}
    >
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
            <form.Field name="name">
              {(field) => (
                <Field
                  data-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                >
                  <FieldLabel htmlFor={`${formId}-name`}>Full Name</FieldLabel>
                  <Input
                    id={`${formId}-name`}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="John Smith"
                    required
                    value={field.state.value}
                  />
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : null}
                </Field>
              )}
            </form.Field>

            <form.Field name="email">
              {(field) => (
                <Field
                  data-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                >
                  <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
                  <Input
                    id={`${formId}-email`}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="name@example.com"
                    required
                    type="email"
                    value={field.state.value}
                  />
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <FieldDescription>
                      We&apos;ll use this to send booking confirmations.
                    </FieldDescription>
                  )}
                </Field>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <Field
                  data-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                >
                  <FieldLabel htmlFor={`${formId}-password`}>
                    Password
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      autoComplete="new-password"
                      className="pr-10"
                      id={`${formId}-password`}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                    <Button
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                      className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      size="icon-sm"
                      type="button"
                      variant="ghost"
                    >
                      <Eye className="size-4" />
                    </Button>
                  </div>
                  {field.state.meta.isTouched && !field.state.meta.isValid ? (
                    <FieldError errors={field.state.meta.errors} />
                  ) : (
                    <FieldDescription>
                      Must be at least 8 characters long.
                    </FieldDescription>
                  )}
                </Field>
              )}
            </form.Field>
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
                <form.Field name="dateOfBirth">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-dob`}>
                        Date of Birth
                      </FieldLabel>
                      <DatePickerField
                        id={`${formId}-dob`}
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        placeholder="Select date"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="phoneNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-phone`}>Phone</FieldLabel>
                      <IMaskInput
                        id={`${formId}-phone`}
                        className={maskedInputClassName}
                        mask="+{1} (000) 000-0000"
                        onAccept={(value) => field.handleChange(String(value))}
                        onBlur={field.handleBlur}
                        placeholder="+1 (555) 000-0000"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
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
                <form.Field name="street">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-street`}>
                        Street
                      </FieldLabel>
                      <Input
                        id={`${formId}-street`}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="123 Main St"
                        required
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="buildingNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-building`}>
                        Building #
                      </FieldLabel>
                      <Input
                        id={`${formId}-building`}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="4A"
                        required
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="city">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-city`}>City</FieldLabel>
                      <Input
                        id={`${formId}-city`}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="New York"
                        required
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="state">
                  {(field) => (
                    <Field>
                      <FieldLabel>State</FieldLabel>
                      <RegionCombobox
                        ariaLabel="State"
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        options={US_STATE_OPTIONS}
                        placeholder="Search state"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-950">
                  Passport details
                </h2>
                <p className="text-sm text-muted-foreground">
                  Required by the current database schema for traveler accounts.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="passportNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-passport`}>
                        Passport #
                      </FieldLabel>
                      <Input
                        id={`${formId}-passport`}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Required for international"
                        required
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
                <form.Field name="passportCountry">
                  {(field) => (
                    <Field>
                      <FieldLabel>Passport Country</FieldLabel>
                      <RegionCombobox
                        ariaLabel="Passport country"
                        onBlur={field.handleBlur}
                        onChange={field.handleChange}
                        options={countryOptions}
                        placeholder="Search country"
                        value={field.state.value}
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
              </div>
              <form.Field name="passportExpiration">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={`${formId}-passport-exp`}>
                      Passport Expiration
                    </FieldLabel>
                    <DatePickerField
                      id={`${formId}-passport-exp`}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                      placeholder="Select date"
                      value={field.state.value}
                    />
                    {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                    ) : null}
                  </Field>
                )}
              </form.Field>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Field>
              {step === 1 ? (
                <Button
                  className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                  type="submit"
                >
                  Continue
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="sm:w-auto"
                      onClick={() => {
                        setError(null)
                        setStep(1)
                      }}
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
              {footer ?? (
                <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>
                  Already have an account?{" "}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/login"
                  >
                    Sign in
                  </Link>
                </p>
                <p>
                  Staff member?{" "}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/staff/register"
                  >
                    Create staff account
                  </Link>
                </p>
                </div>
              )}
            </Field>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  )
}

/**
 * Full signup page component with Card + hero image layout.
 */
export function SignupForm({
  className,
  heroImageUrl = TRAVELER_AUTH_IMAGE_URLS[1],
  onSuccess,
  ...props
}: {
  className?: string
  heroImageUrl?: string
  onSuccess: () => void
} & Omit<ComponentProps<"div">, "className" | "onSuccess">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <SignupFormFields onSuccess={onSuccess} />
          </div>
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
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </FieldDescription>
    </div>
  )
}
