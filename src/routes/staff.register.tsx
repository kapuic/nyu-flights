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
                                                    <div className="flex flex-col items-center gap-2 text-center">
                                                      <h1 className="text-2xl font-bold">Staff account</h1>
                                                      <p className="text-balance text-sm text-muted-foreground">
                                                        Create an internal airline operations account.
                                                      </p>
                                                    </div>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-airline">Airline</FieldLabel>
                                                      <Input id="staff-airline" onChange={(e) => airlineNameField.handleChange(e.target.value)} placeholder="AeroPrecision" required value={airlineNameField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-username-create">Username</FieldLabel>
                                                      <Input id="staff-username-create" onChange={(e) => usernameField.handleChange(e.target.value)} placeholder="ops-user" required value={usernameField.state.value} />
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
                                                      <Input id="staff-password-create" onChange={(e) => passwordField.handleChange(e.target.value)} required type="password" value={passwordField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-dob">Date of Birth</FieldLabel>
                                                      <Input id="staff-dob" onChange={(e) => dateOfBirthField.handleChange(e.target.value)} required type="date" value={dateOfBirthField.state.value} />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-phones">Phone Numbers</FieldLabel>
                                                      <Input id="staff-phones" onChange={(e) => phoneNumbersField.handleChange(e.target.value)} placeholder="123, 456" value={phoneNumbersField.state.value} />
                                                      <FieldDescription>Separate multiple numbers with commas.</FieldDescription>
                                                    </Field>
                                                    {error ? <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
                                                    <Button disabled={isSubmitting} type="submit">
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
