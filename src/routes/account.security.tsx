import { type FormEvent, useId, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { createFileRoute } from "@tanstack/react-router"
import { Eye } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePasswordFormSchema } from "@/lib/schemas"
import { changePasswordFn } from "@/lib/queries"
import { getErrorMessage } from "@/lib/utils"

export const Route = createFileRoute("/account/security")({
  component: SecurityPage,
})

function SecurityPage() {
  const formId = useId()
  const [error, setError] = useState<string | null>(null)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const form = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: changePasswordFormSchema,
    },
    onSubmit: async ({ value }) => {
      await changePasswordFn({
        data: {
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        },
      })
      toast.success("Password updated.")
      form.reset()
    },
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    try {
      await form.handleSubmit()
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update password."))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Security</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password and account security.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form noValidate onSubmit={handleSubmit}>
            <FieldGroup>
              <form.Subscribe selector={(s) => s.submissionAttempts}>
                {(submissionAttempts) => (
                  <>
                    <form.Field name="currentPassword">
                      {(field) => {
                        const isInvalid =
                          (field.state.meta.isTouched ||
                            submissionAttempts > 0) &&
                          !field.state.meta.isValid
                        return (
                          <Field data-invalid={isInvalid}>
                            <Label htmlFor={`${formId}-current`}>
                              Current Password
                            </Label>
                            <div className="relative">
                              <Input
                                aria-invalid={isInvalid}
                                autoComplete="current-password"
                                className="pr-10"
                                id={`${formId}-current`}
                                onBlur={field.handleBlur}
                                onChange={(e) =>
                                  field.handleChange(e.target.value)
                                }
                                type={showCurrent ? "text" : "password"}
                                value={field.state.value}
                              />
                              <Button
                                aria-label={
                                  showCurrent
                                    ? "Hide password"
                                    : "Show password"
                                }
                                className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setShowCurrent((p) => !p)}
                                size="icon-sm"
                                type="button"
                                variant="ghost"
                              >
                                <Eye className="size-4" />
                              </Button>
                            </div>
                            {isInvalid && (
                              <FieldError errors={field.state.meta.errors} />
                            )}
                          </Field>
                        )
                      }}
                    </form.Field>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <form.Field name="newPassword">
                        {(field) => {
                          const isInvalid =
                            (field.state.meta.isTouched ||
                              submissionAttempts > 0) &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <Label htmlFor={`${formId}-new`}>
                                New Password
                              </Label>
                              <div className="relative">
                                <Input
                                  aria-invalid={isInvalid}
                                  autoComplete="new-password"
                                  className="pr-10"
                                  id={`${formId}-new`}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  type={showNew ? "text" : "password"}
                                  value={field.state.value}
                                />
                                <Button
                                  aria-label={
                                    showNew ? "Hide password" : "Show password"
                                  }
                                  className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowNew((p) => !p)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Eye className="size-4" />
                                </Button>
                              </div>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      </form.Field>

                      <form.Field name="confirmPassword">
                        {(field) => {
                          const isInvalid =
                            (field.state.meta.isTouched ||
                              submissionAttempts > 0) &&
                            !field.state.meta.isValid
                          return (
                            <Field data-invalid={isInvalid}>
                              <Label htmlFor={`${formId}-confirm`}>
                                Confirm New Password
                              </Label>
                              <div className="relative">
                                <Input
                                  aria-invalid={isInvalid}
                                  autoComplete="new-password"
                                  className="pr-10"
                                  id={`${formId}-confirm`}
                                  onBlur={field.handleBlur}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                  type={showConfirm ? "text" : "password"}
                                  value={field.state.value}
                                />
                                <Button
                                  aria-label={
                                    showConfirm
                                      ? "Hide password"
                                      : "Show password"
                                  }
                                  className="absolute top-1/2 right-1 size-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                  onClick={() => setShowConfirm((p) => !p)}
                                  size="icon-sm"
                                  type="button"
                                  variant="ghost"
                                >
                                  <Eye className="size-4" />
                                </Button>
                              </div>
                              {isInvalid && (
                                <FieldError errors={field.state.meta.errors} />
                              )}
                            </Field>
                          )
                        }}
                      </form.Field>
                    </div>
                  </>
                )}
              </form.Subscribe>

              {error && (
                <div className="rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <form.Subscribe selector={(s) => s.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Updating…" : "Update Password"}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Two-factor authentication is not yet available. This feature is
            coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
