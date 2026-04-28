import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import type { Value as PhoneValue } from "react-phone-number-input";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { DatePickerField } from "@/components/date-time-picker";

import { StaffPhoneNumbersSheet } from "@/components/staff-phone-numbers-sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { getCurrentUserFn, registerStaffFn } from "@/lib/auth";
import { APP_NAME } from "@/lib/app-config";
import { staffRegistrationSchema } from "@/lib/schemas";
import { getErrorMessage } from "@/lib/utils";

function shouldShowFieldError(
  meta: { isTouched: boolean; isValid: boolean },
  submissionAttempts: number,
) {
  return (meta.isTouched || submissionAttempts > 0) && !meta.isValid;
}
function getPhoneRows(value: string) {
  const phoneNumbers = value
    .split(",")
    .map((phoneNumber) => phoneNumber.trim())
    .filter(Boolean);
  return phoneNumbers.length ? phoneNumbers : [""];
}

function serializePhoneRows(phoneNumbers: Array<string>) {
  return phoneNumbers
    .map((phoneNumber) => phoneNumber.trim())
    .filter(Boolean)
    .join(",");
}

export const Route = createFileRoute("/staff/register")({
  loader: async () => {
    const currentUser = await getCurrentUserFn();
    if (currentUser) throw redirect({ to: currentUser.role === "staff" ? "/staff" : "/trips" });
  },
  component: StaffRegisterPage,
});

function StaffRegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false);
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await form.handleSubmit();
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed."));
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
    validators: {
      onSubmit: ({ value }) => staffRegistrationSchema.safeParse(value).error?.issues,
    },
    onSubmit: async ({ value }) => {
      const result = await registerStaffFn({ data: value });
      if (result.error) throw new Error(result.error);
      await router.invalidate();
      toast.success("Staff account created.");
      await router.navigate({ to: result.redirectTo ?? "/staff" });
    },
  });

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="border-border/70 bg-card shadow-sm">
          <CardContent className="pt-6">
            <form.Subscribe
              selector={(state) => ({
                isSubmitting: state.isSubmitting,
                submissionAttempts: state.submissionAttempts,
              })}
            >
              {({ isSubmitting, submissionAttempts }) => (
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
                                                          Create an internal airline operations
                                                          account.
                                                        </p>
                                                      </div>
                                                    </div>
                                                    <Field
                                                      data-invalid={shouldShowFieldError(
                                                        airlineNameField.state.meta,
                                                        submissionAttempts,
                                                      )}
                                                    >
                                                      <FieldLabel htmlFor="staff-airline">
                                                        Airline
                                                      </FieldLabel>
                                                      <Input
                                                        aria-invalid={shouldShowFieldError(
                                                          airlineNameField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                        id="staff-airline"
                                                        onBlur={airlineNameField.handleBlur}
                                                        onChange={(e) =>
                                                          airlineNameField.handleChange(
                                                            e.target.value,
                                                          )
                                                        }
                                                        placeholder={APP_NAME}
                                                        required
                                                        value={airlineNameField.state.value}
                                                      />
                                                      {shouldShowFieldError(
                                                        airlineNameField.state.meta,
                                                        submissionAttempts,
                                                      ) ? (
                                                        <FieldError
                                                          errors={
                                                            airlineNameField.state.meta.errors
                                                          }
                                                        />
                                                      ) : null}
                                                    </Field>
                                                    <Field
                                                      data-invalid={shouldShowFieldError(
                                                        usernameField.state.meta,
                                                        submissionAttempts,
                                                      )}
                                                    >
                                                      <FieldLabel htmlFor="staff-username-create">
                                                        Username
                                                      </FieldLabel>
                                                      <Input
                                                        aria-invalid={shouldShowFieldError(
                                                          usernameField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                        autoComplete="username"
                                                        id="staff-username-create"
                                                        onBlur={usernameField.handleBlur}
                                                        onChange={(e) =>
                                                          usernameField.handleChange(e.target.value)
                                                        }
                                                        placeholder="ops-user"
                                                        required
                                                        value={usernameField.state.value}
                                                      />
                                                      {shouldShowFieldError(
                                                        usernameField.state.meta,
                                                        submissionAttempts,
                                                      ) ? (
                                                        <FieldError
                                                          errors={usernameField.state.meta.errors}
                                                        />
                                                      ) : null}
                                                    </Field>
                                                    <div className="grid grid-cols-2 gap-4">
                                                      <Field
                                                        data-invalid={shouldShowFieldError(
                                                          firstNameField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                      >
                                                        <FieldLabel htmlFor="staff-first-name">
                                                          First Name
                                                        </FieldLabel>
                                                        <Input
                                                          aria-invalid={shouldShowFieldError(
                                                            firstNameField.state.meta,
                                                            submissionAttempts,
                                                          )}
                                                          id="staff-first-name"
                                                          onBlur={firstNameField.handleBlur}
                                                          onChange={(e) =>
                                                            firstNameField.handleChange(
                                                              e.target.value,
                                                            )
                                                          }
                                                          required
                                                          value={firstNameField.state.value}
                                                        />
                                                        {shouldShowFieldError(
                                                          firstNameField.state.meta,
                                                          submissionAttempts,
                                                        ) ? (
                                                          <FieldError
                                                            errors={
                                                              firstNameField.state.meta.errors
                                                            }
                                                          />
                                                        ) : null}
                                                      </Field>
                                                      <Field
                                                        data-invalid={shouldShowFieldError(
                                                          lastNameField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                      >
                                                        <FieldLabel htmlFor="staff-last-name">
                                                          Last Name
                                                        </FieldLabel>
                                                        <Input
                                                          aria-invalid={shouldShowFieldError(
                                                            lastNameField.state.meta,
                                                            submissionAttempts,
                                                          )}
                                                          id="staff-last-name"
                                                          onBlur={lastNameField.handleBlur}
                                                          onChange={(e) =>
                                                            lastNameField.handleChange(
                                                              e.target.value,
                                                            )
                                                          }
                                                          required
                                                          value={lastNameField.state.value}
                                                        />
                                                        {shouldShowFieldError(
                                                          lastNameField.state.meta,
                                                          submissionAttempts,
                                                        ) ? (
                                                          <FieldError
                                                            errors={lastNameField.state.meta.errors}
                                                          />
                                                        ) : null}
                                                      </Field>
                                                    </div>
                                                    <Field
                                                      data-invalid={shouldShowFieldError(
                                                        emailField.state.meta,
                                                        submissionAttempts,
                                                      )}
                                                    >
                                                      <FieldLabel htmlFor="staff-email">
                                                        Email
                                                      </FieldLabel>
                                                      <Input
                                                        aria-invalid={shouldShowFieldError(
                                                          emailField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                        id="staff-email"
                                                        onBlur={emailField.handleBlur}
                                                        onChange={(e) =>
                                                          emailField.handleChange(e.target.value)
                                                        }
                                                        required
                                                        type="email"
                                                        value={emailField.state.value}
                                                      />
                                                      {shouldShowFieldError(
                                                        emailField.state.meta,
                                                        submissionAttempts,
                                                      ) ? (
                                                        <FieldError
                                                          errors={emailField.state.meta.errors}
                                                        />
                                                      ) : null}
                                                    </Field>
                                                    <Field
                                                      data-invalid={shouldShowFieldError(
                                                        passwordField.state.meta,
                                                        submissionAttempts,
                                                      )}
                                                    >
                                                      <FieldLabel htmlFor="staff-password-create">
                                                        Password
                                                      </FieldLabel>
                                                      <Input
                                                        aria-invalid={shouldShowFieldError(
                                                          passwordField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                        autoComplete="new-password"
                                                        id="staff-password-create"
                                                        onBlur={passwordField.handleBlur}
                                                        onChange={(e) =>
                                                          passwordField.handleChange(e.target.value)
                                                        }
                                                        required
                                                        type="password"
                                                        value={passwordField.state.value}
                                                      />
                                                      {shouldShowFieldError(
                                                        passwordField.state.meta,
                                                        submissionAttempts,
                                                      ) ? (
                                                        <FieldError
                                                          errors={passwordField.state.meta.errors}
                                                        />
                                                      ) : null}
                                                    </Field>
                                                    <Field
                                                      data-invalid={shouldShowFieldError(
                                                        dateOfBirthField.state.meta,
                                                        submissionAttempts,
                                                      )}
                                                    >
                                                      <FieldLabel htmlFor="staff-dob">
                                                        Date of Birth
                                                      </FieldLabel>
                                                      <DatePickerField
                                                        id="staff-dob"
                                                        value={dateOfBirthField.state.value}
                                                        onChange={(value) =>
                                                          dateOfBirthField.handleChange(value)
                                                        }
                                                        placeholder="Pick date of birth"
                                                      />
                                                      {shouldShowFieldError(
                                                        dateOfBirthField.state.meta,
                                                        submissionAttempts,
                                                      ) ? (
                                                        <FieldError
                                                          errors={
                                                            dateOfBirthField.state.meta.errors
                                                          }
                                                        />
                                                      ) : null}
                                                    </Field>
                                                    <>
                                                      <Field
                                                        data-invalid={shouldShowFieldError(
                                                          phoneNumbersField.state.meta,
                                                          submissionAttempts,
                                                        )}
                                                      >
                                                        <FieldLabel htmlFor="staff-phones">
                                                          Phone Number
                                                        </FieldLabel>
                                                        <PhoneInput
                                                          aria-invalid={shouldShowFieldError(
                                                            phoneNumbersField.state.meta,
                                                            submissionAttempts,
                                                          )}
                                                          className="w-full"
                                                          defaultCountry="US"
                                                          id="staff-phones"
                                                          onBlur={phoneNumbersField.handleBlur}
                                                          onChange={(value: PhoneValue) => {
                                                            const rows = getPhoneRows(
                                                              phoneNumbersField.state.value,
                                                            );
                                                            rows[0] = value ?? "";
                                                            phoneNumbersField.handleChange(
                                                              serializePhoneRows(rows),
                                                            );
                                                          }}
                                                          placeholder="(555) 000-0000"
                                                          value={
                                                            getPhoneRows(
                                                              phoneNumbersField.state.value,
                                                            )[0]
                                                          }
                                                        />
                                                        {shouldShowFieldError(
                                                          phoneNumbersField.state.meta,
                                                          submissionAttempts,
                                                        ) ? (
                                                          <FieldError
                                                            errors={
                                                              phoneNumbersField.state.meta.errors
                                                            }
                                                          />
                                                        ) : (
                                                          <div className="flex items-center justify-between gap-3">
                                                            <FieldDescription>
                                                              {getPhoneRows(
                                                                phoneNumbersField.state.value,
                                                              ).filter(Boolean).length > 1
                                                                ? `${getPhoneRows(phoneNumbersField.state.value).filter(Boolean).length} phone numbers added.`
                                                                : "Add backups if this staff account needs more phone numbers."}
                                                            </FieldDescription>
                                                            <Button
                                                              onClick={() =>
                                                                setPhoneSheetOpen(true)
                                                              }
                                                              size="sm"
                                                              type="button"
                                                              variant="outline"
                                                            >
                                                              Add more
                                                            </Button>
                                                          </div>
                                                        )}
                                                      </Field>
                                                      <StaffPhoneNumbersSheet
                                                        description="Add every phone number this staff account should use."
                                                        onOpenChange={setPhoneSheetOpen}
                                                        onPhoneNumbersChange={(phoneNumbers) =>
                                                          phoneNumbersField.handleChange(
                                                            serializePhoneRows(phoneNumbers),
                                                          )
                                                        }
                                                        open={phoneSheetOpen}
                                                        phoneNumbers={getPhoneRows(
                                                          phoneNumbersField.state.value,
                                                        )}
                                                        title="Staff phone numbers"
                                                      />
                                                    </>
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
  );
}
