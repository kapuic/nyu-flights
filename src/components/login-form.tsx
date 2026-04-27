import { useForm } from "@tanstack/react-form"
import { useRouter } from "@tanstack/react-router"
import { Eye, Lock } from "lucide-react"
import { useId, useState } from "react"

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
import { APP_NAME } from "@/lib/app-config"
import { loginFn } from "@/lib/auth"
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images"
import { cn } from "@/lib/utils"

/**
 * Self-contained login form that owns its own useForm + submit logic.
 * Used by both the standalone /login page and the auth modal.
 */
export function LoginFormFields({
  onSuccess,
  heading = "Welcome back",
  description,
  footer,
}: {
  onSuccess: () => void
  heading?: string
  description?: string
  footer?: React.ReactNode
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const formId = useId()

  const form = useForm({
    defaultValues: { username: "", password: "" },
    onSubmit: async ({ value }) => {
      const result = await loginFn({
        data: {
          password: value.password,
          role: "customer",
          username: value.username,
        },
      })
      if (result.error) throw new Error(result.error)
      await router.invalidate()
      onSuccess()
    },
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="mb-2 inline-flex size-10 items-center justify-center rounded-md bg-slate-950 text-white">
            <Lock className="size-5" />
          </div>
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-balance text-muted-foreground">
            {description ?? `Sign in to continue with ${APP_NAME}`}
          </p>
        </div>

        <form.Field name="username">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.value
              }
            >
              <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
              <Input
                aria-invalid={
                  field.state.meta.isTouched && !field.state.value
                }
                autoComplete="email"
                id={`${formId}-email`}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder="name@example.com"
                required
                type="email"
                value={field.state.value}
              />
              {field.state.meta.isTouched && !field.state.value ? (
                <FieldDescription className="text-destructive">
                  Email is required.
                </FieldDescription>
              ) : null}
            </Field>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.value
              }
            >
              <div className="flex items-center">
                <FieldLabel htmlFor={`${formId}-password`}>Password</FieldLabel>
                <a
                  className="ms-auto text-sm underline-offset-4 hover:underline"
                  href="#"
                >
                  Forgot your password?
                </a>
              </div>
              <div className="relative">
                <Input
                  aria-invalid={
                    field.state.meta.isTouched && !field.state.value
                  }
                  autoComplete="current-password"
                  className="pr-10"
                  id={`${formId}-password`}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="••••••••"
                  required
                  type={showPassword ? "text" : "password"}
                  value={field.state.value}
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
              {field.state.meta.isTouched && !field.state.value ? (
                <FieldDescription className="text-destructive">
                  Password is required.
                </FieldDescription>
              ) : null}
            </Field>
          )}
        </form.Field>

        {error ? (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Field>
              <Button
                className="bg-gradient-to-r from-slate-950 to-slate-800 hover:opacity-90"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Signing in…" : "Sign In"}
              </Button>
            </Field>
          )}
        </form.Subscribe>

        {footer ?? (
          <>
            <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
              Or
            </FieldSeparator>
            <Field>
              <div className="space-y-2 text-center text-sm text-muted-foreground">
                <p>
                  Don&apos;t have an account?{" "}
                  <a
                    className="font-medium text-foreground underline underline-offset-4"
                    href="/register"
                  >
                    Create one
                  </a>
                </p>
                <p>
                  Staff member?{" "}
                  <a
                    className="font-medium text-foreground underline underline-offset-4"
                    href="/staff/login"
                  >
                    Staff sign in
                  </a>
                </p>
              </div>
            </Field>
          </>
        )}
      </FieldGroup>
    </form>
  )
}

/**
 * Full login page component with Card + hero image layout.
 * Used by the standalone /login route.
 */
export function LoginForm({
  className,
  heroImageUrl = TRAVELER_AUTH_IMAGE_URLS[0],
  onSuccess,
  ...props
}: {
  className?: string
  heroImageUrl?: string
  onSuccess: () => void
} & Omit<React.ComponentProps<"div">, "className" | "onSuccess">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <LoginFormFields onSuccess={onSuccess} />
          </div>
          <div className="relative hidden bg-slate-100 md:block">
            <img
              alt="Traveler authentication"
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
