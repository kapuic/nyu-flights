import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { SignupForm } from "@/components/signup-form"
import { getCurrentUserFn, registerCustomerFn } from "@/lib/auth"

export const Route = createFileRoute("/register")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
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
      if (result?.error) throw new Error(result.error)
      toast.success("Welcome aboard.")
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? "/customer" })
    },
  })

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
                                                      {(passportCountryField) => (
                                                        <form.Field name="passportExpiration">
                                                          {(passportExpField) => (
                                                            <SignupForm
                                                              error={error}
                                                              fields={{
                                                                buildingNumber: { onChange: (v) => buildingField.handleChange(v), value: buildingField.state.value },
                                                                city: { onChange: (v) => cityField.handleChange(v), value: cityField.state.value },
                                                                dateOfBirth: { onChange: (v) => dobField.handleChange(v), value: dobField.state.value },
                                                                email: { onChange: (v) => emailField.handleChange(v), value: emailField.state.value },
                                                                name: { onChange: (v) => nameField.handleChange(v), value: nameField.state.value },
                                                                passportCountry: { onChange: (v) => passportCountryField.handleChange(v), value: passportCountryField.state.value },
                                                                passportExpiration: { onChange: (v) => passportExpField.handleChange(v), value: passportExpField.state.value },
                                                                passportNumber: { onChange: (v) => passportNumField.handleChange(v), value: passportNumField.state.value },
                                                                password: { onChange: (v) => passwordField.handleChange(v), value: passwordField.state.value },
                                                                phoneNumber: { onChange: (v) => phoneField.handleChange(v), value: phoneField.state.value },
                                                                state: { onChange: (v) => stateField.handleChange(v), value: stateField.state.value },
                                                                street: { onChange: (v) => streetField.handleChange(v), value: streetField.state.value },
                                                              }}
                                                              isSubmitting={isSubmitting}
                                                              onSubmit={async (e) => {
                                                                e.preventDefault()
                                                                e.stopPropagation()
                                                                setError(null)
                                                                try {
                                                                  await form.handleSubmit()
                                                                } catch (err) {
                                                                  setError(err instanceof Error ? err.message : "Registration failed.")
                                                                }
                                                              }}
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
