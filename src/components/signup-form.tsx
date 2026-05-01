import { getData as getCountries } from "country-list";
import { faker } from "@faker-js/faker";
import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";
import { Calendar as CalendarIcon, ChevronLeft, Eye, UserRoundPlus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import type { ComponentProps, FormEvent, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { CountryFlag } from "@/components/country-flag";
import { Calendar } from "@/components/ui/calendar";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { APP_NAME } from "@/lib/app-config";
import { registerCustomerFn } from "@/lib/auth";
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images";
import { US_STATES, customerRegistrationSchema } from "@/lib/schemas";
import { cn, getErrorMessage } from "@/lib/utils";

import {
  formatPickerDate,
  jsDateToPlainDateString,
  plainDateToJsDate,
  todayPlusYearsString,
} from "@/lib/temporal";

type RegionOption = {
  code: string;
  label: string;
};

const US_STATE_OPTIONS: Array<RegionOption> = US_STATES.map((state) => ({
  code: state,
  label: state,
}));

function parseDateValue(value: string) {
  if (!value) return undefined;
  return plainDateToJsDate(value);
}

function formatDateValue(date: Date | undefined) {
  if (!date) return "";
  return jsDateToPlainDateString(date);
}

function DatePickerField({
  id,
  onBlur,
  onChange,
  placeholder,
  value,
}: {
  id: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  const selectedDate = parseDateValue(value);

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
        {selectedDate ? formatPickerDate(value) : <span>{placeholder}</span>}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          captionLayout="dropdown"
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            onChange(formatDateValue(date));
            onBlur?.();
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function RegionCombobox({
  ariaLabel,
  onBlur,
  onChange,
  options,
  placeholder,
  value,
}: {
  ariaLabel: string;
  onBlur?: () => void;
  onChange: (value: string) => void;
  options: Array<RegionOption>;
  placeholder: string;
  value: string;
}) {
  const selectedOption =
    options.find((option) => option.label === value || option.code === value) ?? null;

  return (
    <Combobox
      items={options}
      itemToStringLabel={(option) => option.label}
      itemToStringValue={(option) => `${option.label} ${option.code}`}
      value={selectedOption}
      onValueChange={(option) => {
        onChange(option?.code ?? option?.label ?? "");
        onBlur?.();
      }}
    >
      <ComboboxInput aria-label={ariaLabel} placeholder={placeholder} showClear />
      <ComboboxContent>
        <ComboboxEmpty>No matches found.</ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem key={option.code || option.label} value={option}>
              <span className="flex min-w-0 items-center gap-2">
                {option.code && option.code !== option.label ? (
                  <CountryFlag countryCode={option.code} size={16} />
                ) : null}
                <span className="truncate">{option.label}</span>
                {option.code && option.code !== option.label ? (
                  <span className="text-xs text-muted-foreground">{option.code}</span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

/**
 * Self-contained signup form that owns its own useForm + submit logic.
 * Eliminates the 12-level deep form.Field nesting from the old implementation.
 */
export function SignupFormFields({
  onSuccess,
  footer,
}: {
  onSuccess: () => void;
  footer?: ReactNode;
}) {
  const router = useRouter();
  const formId = useId();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [stepOneSubmissionAttempted, setStepOneSubmissionAttempted] = useState(false);

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
      const result = await registerCustomerFn({ data: value });
      if (result.error) {
        throw new Error(result.error);
      }
      await router.invalidate();
      onSuccess();
    },
  });

  const countryOptions = useMemo<Array<RegionOption>>(
    () =>
      getCountries().map((country) => ({
        code: country.code,
        label: country.name,
      })),
    [],
  );

  function handleFillRandomDetails() {
    const country = faker.helpers.arrayElement(countryOptions);
    const state = faker.helpers.arrayElement(US_STATE_OPTIONS);
    const birthDate = faker.date.birthdate({ max: 65, min: 21, mode: "age" });
    const passportExpiration = todayPlusYearsString(5);

    form.setFieldValue("buildingNumber", faker.location.buildingNumber());
    form.setFieldValue("city", faker.location.city());
    form.setFieldValue("dateOfBirth", jsDateToPlainDateString(birthDate));
    form.setFieldValue("passportCountry", country.code);
    form.setFieldValue("passportExpiration", passportExpiration);
    form.setFieldValue("passportNumber", faker.string.alphanumeric({ casing: "upper", length: 9 }));
    form.setFieldValue("phoneNumber", `+1202555${faker.string.numeric({ length: 4 })}`);
    form.setFieldValue("state", state.label);
    form.setFieldValue("street", faker.location.streetAddress());
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);

    try {
      await form.handleSubmit();
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
    }
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        if (step === 1) {
          e.preventDefault();
          e.stopPropagation();

          setStepOneSubmissionAttempted(true);

          void Promise.all([
            form.validateField("name", "submit"),
            form.validateField("email", "submit"),
            form.validateField("password", "submit"),
          ]).then(([nameErrors, emailErrors, passwordErrors]) => {
            if (
              nameErrors.length === 0 &&
              emailErrors.length === 0 &&
              passwordErrors.length === 0
            ) {
              setError(null);
              setStep(2);
            }
          });
          return;
        }

        void handleSubmit(e);
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
            <form.Field
              name="name"
              validators={{
                onChange: customerRegistrationSchema.shape.name,
                onSubmit: customerRegistrationSchema.shape.name,
              }}
            >
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || stepOneSubmissionAttempted) &&
                  !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`${formId}-name`}>Full Name</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={`${formId}-name`}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="John Smith"
                      required
                      value={field.state.value}
                    />
                    {isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="email"
              validators={{
                onChange: customerRegistrationSchema.shape.email,
                onSubmit: customerRegistrationSchema.shape.email,
              }}
            >
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || stepOneSubmissionAttempted) &&
                  !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
                    <Input
                      aria-invalid={isInvalid}
                      id={`${formId}-email`}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={field.state.value}
                    />
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <FieldDescription>
                        We&apos;ll use this to send booking confirmations.
                      </FieldDescription>
                    )}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field
              name="password"
              validators={{
                onChange: customerRegistrationSchema.shape.password,
                onSubmit: customerRegistrationSchema.shape.password,
              }}
            >
              {(field) => {
                const isInvalid =
                  (field.state.meta.isTouched || stepOneSubmissionAttempted) &&
                  !field.state.meta.isValid;

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={`${formId}-password`}>Password</FieldLabel>
                    <div className="relative">
                      <Input
                        aria-invalid={isInvalid}
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
                    {isInvalid ? (
                      <FieldError errors={field.state.meta.errors} />
                    ) : (
                      <FieldDescription>Must be at least 8 characters long.</FieldDescription>
                    )}
                  </Field>
                );
              }}
            </form.Field>
          </>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Personal details</h2>
                <p className="text-sm text-muted-foreground">Tell us who is traveling.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="dateOfBirth">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-dob`}>Date of Birth</FieldLabel>
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
                      <PhoneInput
                        id={`${formId}-phone`}
                        defaultCountry="US"
                        onChange={(value: string) => field.handleChange(value)}
                        onBlur={field.handleBlur}
                        placeholder="(555) 000-0000"
                        value={
                          field.state.value as React.ComponentProps<typeof PhoneInput>["value"]
                        }
                      />
                      {field.state.meta.isTouched && !field.state.meta.isValid ? (
                        <FieldError errors={field.state.meta.errors} />
                      ) : null}
                    </Field>
                  )}
                </form.Field>
              </div>
            </div>

            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Home address</h2>
                <p className="text-sm text-muted-foreground">
                  This address is stored on your traveler profile.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="street">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-street`}>Street</FieldLabel>
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
                      <FieldLabel htmlFor={`${formId}-building`}>Building #</FieldLabel>
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

            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-foreground">Passport details</h2>
                <p className="text-sm text-muted-foreground">
                  Required by the current database schema for traveler accounts.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <form.Field name="passportNumber">
                  {(field) => (
                    <Field>
                      <FieldLabel htmlFor={`${formId}-passport`}>Passport #</FieldLabel>
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
                    <FieldLabel htmlFor={`${formId}-passport-exp`}>Passport Expiration</FieldLabel>
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
                <Button className="w-full" type="submit">
                  Continue
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="sm:w-auto"
                      onClick={() => {
                        setError(null);
                        setStep(1);
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
                  <Button className="w-full" disabled={isSubmitting} type="submit">
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
  );
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
  className?: string;
  heroImageUrl?: string;
  onSuccess: () => void;
} & Omit<ComponentProps<"div">, "className" | "onSuccess">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <SignupFormFields onSuccess={onSuccess} />
          </div>
          <div className="relative hidden bg-muted md:block">
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
  );
}
