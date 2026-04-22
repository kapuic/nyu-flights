import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, loginFn } from "@/lib/auth"

export const Route = createFileRoute("/staff/login")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: StaffLoginPage,
})

function StaffLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { password: "", username: "" },
    onSubmit: async ({ value }) => {
      const result = await loginFn({
        data: {
          password: value.password,
          role: "staff",
          username: value.username,
        },
      })
      if (result.error) throw new Error(result.error)
      toast.success("Operations unlocked.")
      await router.invalidate()
      await router.navigate({ to: result.redirectTo ?? "/staff/app" })
    },
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.")
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="pt-6">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <form.Field name="username">
                  {(usernameField) => (
                    <form.Field name="password">
                      {(passwordField) => (
                        <form
                          className="flex flex-col gap-6"
                          onSubmit={handleSubmit}
                        >
                          <FieldGroup>
                            <div className="flex flex-col gap-2 text-center">
                              <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                <Building2 className="size-4" />
                              </div>
                              <div className="space-y-1">
                                <h1 className="text-xl font-semibold">
                                  Staff sign in
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                  Access operations, fleet, schedules, and
                                  reporting.
                                </p>
                              </div>
                            </div>
                            <Field
                              data-invalid={
                                usernameField.state.meta.isTouched &&
                                !usernameField.state.value
                              }
                            >
                              <FieldLabel htmlFor="staff-username">
                                Username
                              </FieldLabel>
                              <Input
                                aria-invalid={
                                  usernameField.state.meta.isTouched &&
                                  !usernameField.state.value
                                }
                                autoComplete="username"
                                id="staff-username"
                                onChange={(e) =>
                                  usernameField.handleChange(e.target.value)
                                }
                                placeholder="staff username"
                                required
                                value={usernameField.state.value}
                              />
                              {usernameField.state.meta.isTouched &&
                              !usernameField.state.value ? (
                                <FieldDescription className="text-destructive">
                                  Username is required.
                                </FieldDescription>
                              ) : null}
                            </Field>
                            <Field
                              data-invalid={
                                passwordField.state.meta.isTouched &&
                                !passwordField.state.value
                              }
                            >
                              <FieldLabel htmlFor="staff-password">
                                Password
                              </FieldLabel>
                              <Input
                                aria-invalid={
                                  passwordField.state.meta.isTouched &&
                                  !passwordField.state.value
                                }
                                autoComplete="current-password"
                                id="staff-password"
                                onChange={(e) =>
                                  passwordField.handleChange(e.target.value)
                                }
                                placeholder="••••••••"
                                required
                                type="password"
                                value={passwordField.state.value}
                              />
                              {passwordField.state.meta.isTouched &&
                              !passwordField.state.value ? (
                                <FieldDescription className="text-destructive">
                                  Password is required.
                                </FieldDescription>
                              ) : null}
                            </Field>
                            {error ? (
                              <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                                {error}
                              </div>
                            ) : null}
                            <Button
                              className="w-full"
                              disabled={isSubmitting}
                              type="submit"
                            >
                              {isSubmitting ? "Signing in…" : "Sign In"}
                            </Button>
                            <FieldDescription className="text-center">
                              Need staff access?{" "}
                              <a
                                className="font-medium text-foreground underline underline-offset-4"
                                href="/staff/register"
                              >
                                Create a staff account
                              </a>
                            </FieldDescription>
                          </FieldGroup>
                        </form>
                      )}
                    </form.Field>
                  )}
                </form.Field>
              )}
            </form.Subscribe>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
