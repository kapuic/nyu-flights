import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, registerStaffFn } from "@/lib/auth"
import { APP_NAME } from "@/lib/app-config"

export const Route = createFileRoute('/staff/register')({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: StaffRegisterPage,
})

function StaffRegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.')
    }
  }

  const form = useForm({
    defaultValues: {
      airlineName: '',
      dateOfBirth: '',
      email: '',
      firstName: '',
      lastName: '',
      password: '',
      phoneNumbers: '',
      username: '',
    },
    onSubmit: async ({ value }) => {
      const result = await registerStaffFn({ data: value })
      if (result?.error) throw new Error(result.error)
      toast.success('Staff account created.')
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? '/staff/app' })
    },
  })

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="pt-6">
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <form.Field name="airlineName">
                  {(airlineNameField) => (
                    <form.Field name="username">
                      {(usernameField) => (
                        <form.Field name="firstName">
                          {(firstNameField) => (
                            <form.Field name="lastName">
                              {(lastNameField) => (
                                <form.Field name="email">
                                  {(emailField) => (
                                    <form.Field name="password">
                                      {(passwordField) => (
                                        <form.Field name="dateOfBirth">
                                          {(dateOfBirthField) => (
                                            <form.Field name="phoneNumbers">
                                              {(phoneNumbersField) => (
                                                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                                                  <FieldGroup>
                                                    <div className="flex flex-col gap-2 text-center">
                                                      <div className="mx-auto flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                                                        <Building2 className="size-4" />
                                                      </div>
                                                      <div className="space-y-1">
                                                        <h1 className="text-xl font-semibold">Staff account</h1>
                                                        <p className="text-sm text-muted-foreground">
                                                          Create an internal airline operations account.
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-airline">Airline</FieldLabel>
                                                      <Input id="staff-airline" onChange={(e) => airlineNameField.handleChange(e.target.value)} placeholder={APP_NAME} required value={airlineNameField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-username-create">Username</FieldLabel>
                                                      <Input autoComplete="username" id="staff-username-create" onChange={(e) => usernameField.handleChange(e.target.value)} placeholder="ops-user" required value={usernameField.state.value} />
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <Field>
                                                        <FieldLabel htmlFor="staff-first-name">First Name</FieldLabel>
                                                        <Input id="staff-first-name" onChange={(e) => firstNameField.handleChange(e.target.value)} required value={firstNameField.state.value} />
                                                      </Field>
                                                      <Field>
                                                        <FieldLabel htmlFor="staff-last-name">Last Name</FieldLabel>
                                                        <Input id="staff-last-name" onChange={(e) => lastNameField.handleChange(e.target.value)} required value={lastNameField.state.value} />
                                                      </Field>
                                                    </div>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                                                      <Input id="staff-email" onChange={(e) => emailField.handleChange(e.target.value)} required type="email" value={emailField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-password-create">Password</FieldLabel>
                                                      <Input autoComplete="new-password" id="staff-password-create" onChange={(e) => passwordField.handleChange(e.target.value)} required type="password" value={passwordField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-dob">Date of Birth</FieldLabel>
                                                      <Input id="staff-dob" inputMode="numeric" onChange={(e) => dateOfBirthField.handleChange(e.target.value)} placeholder="YYYY-MM-DD" required value={dateOfBirthField.state.value} />
                                                      <FieldDescription>Use the format YYYY-MM-DD.</FieldDescription>
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-phones">Phone Numbers</FieldLabel>
                                                      <Input id="staff-phones" onChange={(e) => phoneNumbersField.handleChange(e.target.value)} placeholder="123, 456" value={phoneNumbersField.state.value} />
                                                      <FieldDescription>Separate multiple numbers with commas.</FieldDescription>
                                                    </Field>
                                                    {error ? <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
                                                    <Button className="w-full" disabled={isSubmitting} type="submit">
                                                      {isSubmitting ? 'Creating…' : 'Create Staff Account'}
                                                    </Button>
                                                    <FieldDescription className="text-center">
                                                      Already have one? <a className="font-medium text-foreground underline underline-offset-4" href="/staff/login">Sign in</a>
                                                    </FieldDescription>
                                                  </FieldGroup>
                                                </form>
                                              )}
                                            </form.Field>
                                          )}
                                        </form.Field>
                                      )}
                                    </form.Field>
                                  )}
                                </form.Field>
                              )}
                            </form.Field>
                          )}
                        </form.Field>
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
