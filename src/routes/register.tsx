import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { SignupForm } from "@/components/signup-form"
import { getCurrentUserFn, registerCustomerFn } from "@/lib/auth"
import { pickRandomAuthImage } from "@/lib/auth-images"

export const Route = createFileRoute("/register")({
  loader: async () => ({
    currentUser: await getCurrentUserFn(),
    heroImageUrl: pickRandomAuthImage(),
  }),
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const { heroImageUrl } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      buildingNumber: "",
      city: "",
      dateOfBirth: "",
      email: "",
      name: "",
      passportCountry: "",
      passportExpiration: "",
      passportNumber: "",
      password: "",
      phoneNumber: "",
      state: "",
      street: "",
    },
    onSubmit: async ({ value }) => {
      const result = await registerCustomerFn({ data: value })
      if (result.error) throw new Error(result.error)
      toast.success("Welcome aboard.")
      await router.invalidate()
      await router.navigate({ to: result.redirectTo ?? "/customer" })
    },
  })

  function createFieldBinding(field: {
    handleChange: (value: string) => void
    state: { value: string }
  }) {
    return {
      onChange: field.handleChange,
      value: field.state.value,
    }
  }

  async function handleRegisterSubmit(event: React.FormEvent) {
    event.preventDefault()
    event.stopPropagation()
    setError(null)

    try {
      await form.handleSubmit()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.")
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#f7f9fb] p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form.Field name="name">
              {(nameField) => (
                <form.Field name="email">
                  {(emailField) => (
                    <form.Field name="password">
                      {(passwordField) => (
                        <form.Field name="dateOfBirth">
                          {(dobField) => (
                            <form.Field name="phoneNumber">
                              {(phoneField) => (
                                <form.Field name="street">
                                  {(streetField) => (
                                    <form.Field name="buildingNumber">
                                      {(buildingField) => (
                                        <form.Field name="city">
                                          {(cityField) => (
                                            <form.Field name="state">
                                              {(stateField) => (
                                                <form.Field name="passportNumber">
                                                  {(passportNumField) => (
                                                    <form.Field name="passportCountry">
                                                      {(
                                                        passportCountryField
                                                      ) => (
                                                        <form.Field name="passportExpiration">
                                                          {(
                                                            passportExpField
                                                          ) => (
                                                            <SignupForm
                                                              error={error}
                                                              fieldErrors={{
                                                                email:
                                                                  emailField
                                                                    .state.meta
                                                                    .isTouched &&
                                                                  !emailField
                                                                    .state.value
                                                                    ? "Email is required."
                                                                    : null,
                                                                name:
                                                                  nameField
                                                                    .state.meta
                                                                    .isTouched &&
                                                                  !nameField
                                                                    .state.value
                                                                    ? "Full name is required."
                                                                    : null,
                                                                password:
                                                                  passwordField
                                                                    .state.meta
                                                                    .isTouched &&
                                                                  !passwordField
                                                                    .state.value
                                                                    ? "Password is required."
                                                                    : null,
                                                              }}
                                                              heroImageUrl={
                                                                heroImageUrl
                                                              }
                                                              fields={{
                                                                buildingNumber:
                                                                  createFieldBinding(
                                                                    buildingField
                                                                  ),
                                                                city: createFieldBinding(
                                                                  cityField
                                                                ),
                                                                dateOfBirth:
                                                                  createFieldBinding(
                                                                    dobField
                                                                  ),
                                                                email:
                                                                  createFieldBinding(
                                                                    emailField
                                                                  ),
                                                                name: createFieldBinding(
                                                                  nameField
                                                                ),
                                                                passportCountry:
                                                                  createFieldBinding(
                                                                    passportCountryField
                                                                  ),
                                                                passportExpiration:
                                                                  createFieldBinding(
                                                                    passportExpField
                                                                  ),
                                                                passportNumber:
                                                                  createFieldBinding(
                                                                    passportNumField
                                                                  ),
                                                                password:
                                                                  createFieldBinding(
                                                                    passwordField
                                                                  ),
                                                                phoneNumber:
                                                                  createFieldBinding(
                                                                    phoneField
                                                                  ),
                                                                state:
                                                                  createFieldBinding(
                                                                    stateField
                                                                  ),
                                                                street:
                                                                  createFieldBinding(
                                                                    streetField
                                                                  ),
                                                              }}
                                                              isSubmitting={
                                                                isSubmitting
                                                              }
                                                              onSubmit={
                                                                handleRegisterSubmit
                                                              }
                                                            />
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
                        </form.Field>
                      )}
                    </form.Field>
                  )}
                </form.Field>
              )}
            </form.Field>
          )}
        </form.Subscribe>
      </div>
    </div>
  )
}
