import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Eye, Lock } from "lucide-react"
import { useState } from "react"

type LoginFormProps = {
  className?: string
  error: string | null
  isSubmitting: boolean
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (e: React.FormEvent) => void
  emailValue: string
  passwordValue: string
}

export function LoginForm({
  className,
  error,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  emailValue,
  passwordValue,
  ...props
}: LoginFormProps & Omit<React.ComponentProps<"div">, keyof LoginFormProps>) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <form className="p-6 md:p-8" onSubmit={onSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
                  <Lock className="size-5" />
                </div>
                <h1 className="text-2xl font-bold">Welcome back</h1>
                <p className="text-balance text-muted-foreground">
                  Sign in to complete your booking
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="login-email">Email</FieldLabel>
                <Input
                  id="login-email"
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder="name@example.com"
                  required
                  type="email"
                  value={emailValue}
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <a
                    className="ms-auto text-sm underline-offset-4 hover:underline"
                    href="#"
                  >
                    Forgot your password?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    className="pr-10"
                    id="login-password"
                    onChange={(e) => onPasswordChange(e.target.value)}
                    placeholder="••••••••"
                    required
                    type={showPassword ? "text" : "password"}
                    value={passwordValue}
                  />
                  <button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    type="button"
                  >
                    <Eye className="size-4" />
                  </button>
                </div>
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
                  {isSubmitting ? "Signing in…" : "Sign In"}
                </Button>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                Or
              </FieldSeparator>
              <Field>
                <FieldDescription className="text-center">
                  Don&apos;t have an account?{" "}
                  <a
                    className="font-medium text-foreground underline underline-offset-4"
                    href="/register"
                  >
                    Create one
                  </a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <div className="relative hidden bg-slate-100 md:block">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-10">
              <div className="flex size-16 items-center justify-center rounded-full bg-slate-200">
                <Lock className="size-8 text-slate-500" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-700">
                  Secure Booking
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Your connection is encrypted and your data is protected.
                </p>
              </div>
            </div>
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
