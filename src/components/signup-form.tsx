import { Button } from "@/components/ui/button"
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
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Join AeroPrecision to book flights and manage trips.
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

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="signup-dob">Date of Birth</FieldLabel>
                  <Input
                    id="signup-dob"
                    onChange={(e) => fields.dateOfBirth.onChange(e.target.value)}
                    required
                    type="date"
                    value={fields.dateOfBirth.value}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-phone">Phone</FieldLabel>
                  <Input
                    id="signup-phone"
                    onChange={(e) => fields.phoneNumber.onChange(e.target.value)}
                    placeholder="+1 555-0000"
                    value={fields.phoneNumber.value}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="signup-street">Street</FieldLabel>
                  <Input
                    id="signup-street"
                    onChange={(e) => fields.street.onChange(e.target.value)}
                    placeholder="123 Main St"
                    value={fields.street.value}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-building">Building #</FieldLabel>
                  <Input
                    id="signup-building"
                    onChange={(e) => fields.buildingNumber.onChange(e.target.value)}
                    placeholder="4A"
                    value={fields.buildingNumber.value}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="signup-city">City</FieldLabel>
                  <Input
                    id="signup-city"
                    onChange={(e) => fields.city.onChange(e.target.value)}
                    placeholder="New York"
                    value={fields.city.value}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-state">State</FieldLabel>
                  <Input
                    id="signup-state"
                    onChange={(e) => fields.state.onChange(e.target.value)}
                    placeholder="NY"
                    value={fields.state.value}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="signup-passport">Passport #</FieldLabel>
                  <Input
                    id="signup-passport"
                    onChange={(e) => fields.passportNumber.onChange(e.target.value)}
                    placeholder="Required for international"
                    value={fields.passportNumber.value}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-passport-country">Passport Country</FieldLabel>
                  <Input
                    id="signup-passport-country"
                    onChange={(e) => fields.passportCountry.onChange(e.target.value)}
                    placeholder="US"
                    value={fields.passportCountry.value}
                  />
                </Field>
              </div>

              <Field>
                <FieldLabel htmlFor="signup-passport-exp">Passport Expiration</FieldLabel>
                <Input
                  id="signup-passport-exp"
                  onChange={(e) => fields.passportExpiration.onChange(e.target.value)}
                  type="date"
                  value={fields.passportExpiration.value}
                />
              </Field>

              {error ? (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              ) : null}

              <Field>
                <Button
                  className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? "Creating account…" : "Create Account"}
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <a
                    className="font-medium text-foreground underline underline-offset-4"
                    href="/login"
                  >
                    Sign in
                  </a>
                </FieldDescription>
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
