import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { loginFn } from "@/lib/auth"
import { getErrorMessage } from "@/lib/utils"
function normalizeUsername(value: string) {
  return value.trim()
}

const staffLoginSchema = z.object({
  password: z.string().min(1, "Password is required."),
  username: z
    .string()
    .refine(
      (value) => normalizeUsername(value).length > 0,
      "Username is required."
    ),
})

export const Route = createFileRoute("/staff/login")({
  component: StaffLoginPage,
})

function StaffLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { password: "", username: "" },
    validators: {
      onSubmit: staffLoginSchema,
    },
    onSubmit: async ({ value }) => {
      const result = await loginFn({
        data: {
          password: value.password,
          role: "staff",
          username: normalizeUsername(value.username),
        },
      })
      if (result.error) {
        setError(result.error)
        return
      }
      await router.invalidate()
      toast.success("Signed in.")
      await router.navigate({ to: result.redirectTo ?? "/staff" })
    },
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(getErrorMessage(err, "Login failed."))
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="pt-6">
            <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
              <FieldGroup>
                <div className="flex flex-col gap-2 text-center">
                  <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                    <Building2 className="size-4" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-xl font-semibold">Staff sign in</h1>
                    <p className="text-sm text-muted-foreground">
                      Access operations, fleet, schedules, and reporting.
                    </p>
                  </div>
                </div>

                <form.Field name="username">
                  {(field) => {
                    const isInvalid =
                      (field.state.meta.isTouched || form.state.submissionAttempts > 0) &&
                      !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="staff-username">Username</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          autoComplete="username"
                          id="staff-username"
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            setError(null)
                            field.handleChange(event.target.value)
                          }}
                          placeholder="staff username"
                          required
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
                      (field.state.meta.isTouched || form.state.submissionAttempts > 0) &&
                      !field.state.meta.isValid

                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor="staff-password">Password</FieldLabel>
                        <Input
                          aria-invalid={isInvalid}
                          autoComplete="current-password"
                          id="staff-password"
                          onBlur={field.handleBlur}
                          onChange={(event) => {
                            setError(null)
                            field.handleChange(event.target.value)
                          }}
                          placeholder="••••••••"
                          required
                          type="password"
                          value={field.state.value}
                        />
                        {isInvalid ? (
                          <FieldError errors={field.state.meta.errors} />
                        ) : null}
                      </Field>
                    )
                  }}
                </form.Field>

                {error ? (
                  <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                  </div>
                ) : null}

                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(isSubmitting) => (
                    <Button className="w-full" disabled={isSubmitting} type="submit">
                      {isSubmitting ? "Signing in…" : "Sign In"}
                    </Button>
                  )}
                </form.Subscribe>

                <FieldDescription className="text-center">
                  Need staff access?{" "}
                  <Link
                    className="font-medium text-foreground underline underline-offset-4"
                    to="/staff/register"
                  >
                    Create a staff account
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
