import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/app-config"
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, UserRoundPlus } from "lucide-react"
import { useState } from "react"

type SignupFormProps = {
  className?: string
  error: string | null
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

export function SignupForm({
  className,
  error,
  fields,
  heroImageUrl = TRAVELER_AUTH_IMAGE_URLS[1],
  isSubmitting,
  onSubmit,
  ...props
}: SignupFormProps & Omit<React.ComponentProps<"div">, keyof SignupFormProps>) {
  const [showPassword, setShowPassword] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)

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
                <h1 className="text-2xl font-bold">{step === 1 ? "Create your account" : "One more step…"}</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  {step === 1
                    ? `Join ${APP_NAME} to book flights and manage trips.`
                    : "We need the remaining required profile details before creating your account."}
                </p>
              </div>

              <Field>
                <FieldLabel htmlFor="signup-name">Full Name</FieldLabel>
                <Input
                  id="signup-name"
                  onChange={(e) => fields.name.onChange(e.target.value)}
                  placeholder="John Smith"
                  required
                  value={fields.name.value}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                <Input
                  id="signup-email"
                  onChange={(e) => fields.email.onChange(e.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={fields.email.value}
                />
                <FieldDescription>
                  We&apos;ll use this to send booking confirmations.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                <div className="relative">
                    <Input
                      autoComplete="new-password"
                      className="pr-10"
                      id="signup-password"
                      onChange={(e) => fields.password.onChange(e.target.value)}
                      placeholder="••••••••"
                      required
                      type={showPassword ? "text" : "password"}
                      value={fields.password.value}
                    />
                  <Button
                    className="absolute right-1 top-1/2 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Eye className="size-4" />
                  </Button>
                </div>
                <FieldDescription>
                  Must be at least 8 characters long.
                </FieldDescription>
              </Field>
              {step === 2 ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">Personal details</h2>
                      <p className="text-sm text-muted-foreground">Tell us who is traveling.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-dob">Date of Birth</FieldLabel>
                        <Input
                          id="signup-dob"
                          inputMode="numeric"
                          onChange={(e) => fields.dateOfBirth.onChange(e.target.value)}
                          placeholder="YYYY-MM-DD"
                          required
                          value={fields.dateOfBirth.value}
                        />
                        <FieldDescription>
                          Use the format YYYY-MM-DD.
                        </FieldDescription>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-phone">Phone</FieldLabel>
                        <Input
                          id="signup-phone"
                          onChange={(e) => fields.phoneNumber.onChange(e.target.value)}
                          placeholder="+1 555-0000"
                          required
                          value={fields.phoneNumber.value}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">Home address</h2>
                      <p className="text-sm text-muted-foreground">This address is stored on your traveler profile.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-street">Street</FieldLabel>
                        <Input
                          id="signup-street"
                          onChange={(e) => fields.street.onChange(e.target.value)}
                          placeholder="123 Main St"
                          required
                          value={fields.street.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-building">Building #</FieldLabel>
                        <Input
                          id="signup-building"
                          onChange={(e) => fields.buildingNumber.onChange(e.target.value)}
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
                        <Input
                          id="signup-state"
                          onChange={(e) => fields.state.onChange(e.target.value)}
                          placeholder="NY"
                          required
                          value={fields.state.value}
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-4 border-t border-slate-200 pt-4">
                    <div className="space-y-1">
                      <h2 className="text-sm font-semibold text-slate-950">Passport details</h2>
                      <p className="text-sm text-muted-foreground">Required by the current database schema for traveler accounts.</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="signup-passport">Passport #</FieldLabel>
                        <Input
                          id="signup-passport"
                          onChange={(e) => fields.passportNumber.onChange(e.target.value)}
                          placeholder="Required for international"
                          required
                          value={fields.passportNumber.value}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="signup-passport-country">Passport Country</FieldLabel>
                        <Input
                          id="signup-passport-country"
                          onChange={(e) => fields.passportCountry.onChange(e.target.value)}
                          placeholder="US"
                          required
                          value={fields.passportCountry.value}
                        />
                      </Field>
                    </div>
                    <Field>
                      <FieldLabel htmlFor="signup-passport-exp">Passport Expiration</FieldLabel>
                      <Input
                        id="signup-passport-exp"
                        inputMode="numeric"
                        onChange={(e) => fields.passportExpiration.onChange(e.target.value)}
                        placeholder="YYYY-MM-DD"
                        required
                        value={fields.passportExpiration.value}
                      />
                      <FieldDescription>
                        Use the format YYYY-MM-DD.
                      </FieldDescription>
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
                  <Button
                    className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                    disabled={isSubmitting}
                    type="submit"
                  >
                    {isSubmitting ? "Creating account…" : "Create Account"}
                  </Button>
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
        By continuing, you agree to our{" "}
        <a href="#">Terms of Service</a> and{" "}
        <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
