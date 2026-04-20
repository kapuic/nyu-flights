import { useForm } from "@tanstack/react-form"
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { LoginForm } from "@/components/login-form"
import { getCurrentUserFn, loginFn } from "@/lib/auth"
import { pickRandomAuthImage } from "@/lib/auth-images"

export const Route = createFileRoute("/login")({
  loader: async () => ({ currentUser: await getCurrentUserFn(), heroImageUrl: pickRandomAuthImage() }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { heroImageUrl } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)

  const form = useForm({
    defaultValues: { password: "", username: "" },
    onSubmit: async ({ value }) => {
      const result = await loginFn({ data: { password: value.password, role: "customer", username: value.username } })
      if (result?.error) throw new Error(result.error)
      toast.success("Booking unlocked.")
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? "/customer" })
    },
  })

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#f7f9fb] p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-4xl">
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <form.Field name="username">
              {(usernameField) => (
                <form.Field name="password">
                  {(passwordField) => (
                    <LoginForm
                      emailValue={usernameField.state.value}
                      error={error}
                      heroImageUrl={heroImageUrl}
                      onEmailChange={(v) => usernameField.handleChange(v)}
                      onPasswordChange={(v) => passwordField.handleChange(v)}
                      onSubmit={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setError(null)
                        try {
                          await form.handleSubmit()
                        } catch (err) {
                          setError(err instanceof Error ? err.message : "Login failed.")
                        }
                      }}
                      passwordValue={passwordField.state.value}
                      isSubmitting={isSubmitting}
                    />
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
