import { useForm } from "@tanstack/react-form"
import { Link, useRouter } from "@tanstack/react-router"
import { Eye, Lock } from "lucide-react"
import { type ComponentProps, type FormEvent, type ReactNode, useId, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { APP_NAME } from "@/lib/app-config"
import { loginFn } from "@/lib/auth"
import { TRAVELER_AUTH_IMAGE_URLS } from "@/lib/auth-images"
import { loginSchema } from "@/lib/schemas"
import { cn, getErrorMessage } from "@/lib/utils"

const customerLoginSchema = loginSchema.pick({ password: true }).extend({
  email: loginSchema.shape.username.email("Use a valid email address."),
})

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
  footer?: ReactNode
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const formId = useId()

  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: {
      onSubmit: customerLoginSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await loginFn({
        data: {
          password: value.password,
          role: "customer",
          username: value.email,
        },
      })
      if (result.error) {
        throw new Error(result.error)
      }
      await router.invalidate()
      onSuccess()
    },
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."))
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit}>
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

        <form.Subscribe selector={(s) => s.submissionAttempts}>
          {(submissionAttempts) => (
            <>
              <form.Field name="email">
                {(field) => {
                  const isInvalid =
                    (field.state.meta.isTouched || submissionAttempts > 0) &&
                    !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={`${formId}-email`}>Email</FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete="email"
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
                      ) : null}
                    </Field>
                  )
                }}
              </form.Field>

              <form.Field name="password">
                {(field) => {
                  const isInvalid =
                    (field.state.meta.isTouched || submissionAttempts > 0) &&
                    !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-center">
                        <FieldLabel htmlFor={`${formId}-password`}>
                          Password
                        </FieldLabel>
                        <a
                          className="ms-auto text-sm underline-offset-4 hover:underline"
                          href="#"
                        >
                          Forgot your password?
                        </a>
                      </div>
                      <div className="relative">
                        <Input
                          aria-invalid={isInvalid}
                          autoComplete="current-password"
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
                      ) : null}
                    </Field>
                  )
                }}
              </form.Field>
            </>
          )}
        </form.Subscribe>

        {error ? (
          <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <Field>
              <Button
                className="w-full"
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
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/register"
                  >
                    Create one
                  </Link>
                </p>
                <p>
                  Staff member?{" "}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/staff/login"
                  >
                    Staff sign in
                  </Link>
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
} & Omit<ComponentProps<"div">, "className" | "onSuccess">) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden p-0">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-6 md:p-8">
            <LoginFormFields onSuccess={onSuccess} />
          </div>
          <div className="relative hidden bg-muted md:block">
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
