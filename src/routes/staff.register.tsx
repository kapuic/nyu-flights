import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { Building2 } from "lucide-react"
import { IMaskInput } from "react-imask"
import { type FormEvent, useState } from "react"
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
import { registerStaffFn } from "@/lib/auth"
import { APP_NAME } from "@/lib/app-config"
import { getErrorMessage } from "@/lib/utils"

const maskedInputClassName =
  "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"

export const Route = createFileRoute("/staff/register")({
  component: StaffRegisterPage,
})

function StaffRegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."))
    }
  }

  const form = useForm({
    defaultValues: {
      airlineName: "",
      dateOfBirth: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      phoneNumbers: "",
      username: "",
    },
    onSubmit: async ({ value }) => {
      const result = await registerStaffFn({ data: value })
      if (result.error) throw new Error(result.error)
      await router.invalidate()
      toast.success("Staff account created.")
      await router.navigate({ to: result.redirectTo ?? "/staff" })
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
                                                          Staff account
                                                        </h1>
                                                        <p className="text-sm text-muted-foreground">
                                                          Create an internal
                                                          airline operations
                                                          account.
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-airline">
                                                        Airline
                                                      </FieldLabel>
                                                      <Input
                                                        id="staff-airline"
                                                        onChange={(e) =>
                                                          airlineNameField.handleChange(
                                                            e.target.value
                                                          )
                                                        }
                                                        placeholder={APP_NAME}
                                                        required
                                                        value={
                                                          airlineNameField.state
                                                            .value
                                                        }
                                                      />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-username-create">
                                                        Username
                                                      </FieldLabel>
                                                      <Input
                                                        autoComplete="username"
                                                        id="staff-username-create"
                                                        onChange={(e) =>
                                                          usernameField.handleChange(
                                                            e.target.value
                                                          )
                                                        }
                                                        placeholder="ops-user"
                                                        required
                                                        value={
                                                          usernameField.state
                                                            .value
                                                        }
                                                      />
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <Field>
                                                        <FieldLabel htmlFor="staff-first-name">
                                                          First Name
                                                        </FieldLabel>
                                                        <Input
                                                          id="staff-first-name"
                                                          onChange={(e) =>
                                                            firstNameField.handleChange(
                                                              e.target.value
                                                            )
                                                          }
                                                          required
                                                          value={
                                                            firstNameField.state
                                                              .value
                                                          }
                                                        />
                                                      </Field>
                                                      <Field>
                                                        <FieldLabel htmlFor="staff-last-name">
                                                          Last Name
                                                        </FieldLabel>
                                                        <Input
                                                          id="staff-last-name"
                                                          onChange={(e) =>
                                                            lastNameField.handleChange(
                                                              e.target.value
                                                            )
                                                          }
                                                          required
                                                          value={
                                                            lastNameField.state
                                                              .value
                                                          }
                                                        />
                                                      </Field>
                                                    </div>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-email">
                                                        Email
                                                      </FieldLabel>
                                                      <Input
                                                        id="staff-email"
                                                        onChange={(e) =>
                                                          emailField.handleChange(
                                                            e.target.value
                                                          )
                                                        }
                                                        required
                                                        type="email"
                                                        value={
                                                          emailField.state.value
                                                        }
                                                      />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-password-create">
                                                        Password
                                                      </FieldLabel>
                                                      <Input
                                                        autoComplete="new-password"
                                                        id="staff-password-create"
                                                        onChange={(e) =>
                                                          passwordField.handleChange(
                                                            e.target.value
                                                          )
                                                        }
                                                        required
                                                        type="password"
                                                        value={
                                                          passwordField.state
                                                            .value
                                                        }
                                                      />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-dob">
                                                        Date of Birth
                                                      </FieldLabel>
                                                      <Input
                                                        id="staff-dob"
                                                        onChange={(event) =>
                                                          dateOfBirthField.handleChange(
                                                            event.target.value
                                                          )
                                                        }
                                                        required
                                                        type="date"
                                                        value={
                                                          dateOfBirthField.state
                                                            .value
                                                        }
                                                      />
                                                    </Field>
                                                    <Field>
                                                      <FieldLabel htmlFor="staff-phones">
                                                        Phone Number
                                                      </FieldLabel>
                                                      <IMaskInput
                                                        id="staff-phones"
                                                        className={
                                                          maskedInputClassName
                                                        }
                                                        mask="+{1} (000) 000-0000"
                                                        onAccept={(value) =>
                                                          phoneNumbersField.handleChange(
                                                            String(value)
                                                          )
                                                        }
                                                        placeholder="+1 (555) 000-0000"
                                                        value={
                                                          phoneNumbersField
                                                            .state.value
                                                        }
                                                      />
                                                      <FieldDescription>
                                                        Additional staff numbers
                                                        can be added later.
                                                      </FieldDescription>
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
                                                      {isSubmitting
                                                        ? "Creating…"
                                                        : "Create Staff Account"}
                                                    </Button>
                                                    <FieldDescription className="text-center">
                                                      Already have one?{" "}
                                                      <Link
                                                        className="font-medium text-foreground underline underline-offset-4"
                                                        to="/staff/login"
                                                      >
                                                        Sign in
                                                      </Link>
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
