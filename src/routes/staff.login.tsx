import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, loginFn } from "@/lib/auth"

export const Route = createFileRoute('/staff/login')({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: StaffLoginPage,
})

function StaffLoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    }
  }

  const form = useForm({
    defaultValues: { password: '', username: '' },
    onSubmit: async ({ value }) => {
      const result = await loginFn({ data: { password: value.password, role: 'staff', username: value.username } })
      if (result?.error) throw new Error(result.error)
      toast.success('Operations unlocked.')
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? '/staff/app' })
    },
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Building2 className="size-4" />
          </div>
          Airline Staff
        </div>
        <Card>
          <CardContent className="pt-6">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <form.Field name="username">
                  {(usernameField) => (
                    <form.Field name="password">
                      {(passwordField) => (
                        <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                          <FieldGroup>
                            <div className="flex flex-col items-center gap-2 text-center">
                              <h1 className="text-2xl font-bold">Staff sign in</h1>
                              <p className="text-balance text-sm text-muted-foreground">
                                Access flight operations, fleet, and reporting.
                              </p>
                            </div>
                            <Field>
                              <FieldLabel htmlFor="staff-username">Username</FieldLabel>
                              <Input
                                id="staff-username"
                                onChange={(e) => usernameField.handleChange(e.target.value)}
                                placeholder="staff username"
                                required
                                value={usernameField.state.value}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="staff-password">Password</FieldLabel>
                              <Input
                                id="staff-password"
                                onChange={(e) => passwordField.handleChange(e.target.value)}
                                placeholder="••••••••"
                                required
                                type="password"
                                value={passwordField.state.value}
                              />
                            </Field>
                            {error ? <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
                            <Button disabled={isSubmitting} type="submit">
                              {isSubmitting ? 'Signing in…' : 'Sign In'}
                            </Button>
                            <FieldDescription className="text-center">
                              Need staff access? <a className="font-medium text-foreground underline underline-offset-4" href="/staff/register">Create a staff account</a>
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
