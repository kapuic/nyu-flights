import { useForm } from "@tanstack/react-form"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { Lock, Plane } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, loginFn } from "@/lib/auth"

export const Route = createFileRoute("/login")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
  const [error, setError] = useState<string | null>(null)
  const form = useForm({
    defaultValues: {
      password: "",
      username: "",
    },
    onSubmit: async ({ value }) => {
      const result = await loginFn({
        data: {
          password: value.password,
          role: "customer",
          username: value.username,
        },
      })
      if (result?.error) throw new Error(result.error)
      toast.success("Booking unlocked.")
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? "/customer" })
    },
  })

  return (
    <TravelerShell currentUser={currentUser ? { displayName: currentUser.displayName, role: currentUser.role } : null} section="bookings">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="rounded-[32px] border-0 bg-slate-950 text-white shadow-[0_30px_80px_-56px_rgba(15,23,42,0.5)]">
          <CardContent className="flex h-full flex-col justify-between gap-8 px-8 py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-sm text-white/75">
                <Plane className="size-4" />
                Secure booking interruption
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">Sign in to complete your booking</h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-white/72">I need to verify your identity before securing these seats. Your traveler account unlocks booking, itinerary management, and post-flight feedback.</p>
            </div>
            <div className="grid gap-4 rounded-[24px] bg-white/6 p-5 text-sm text-white/78">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-white/45">Traveler demo</div>
                <div className="mt-2 text-lg font-medium text-white">alice.chen@example.com</div>
                <div className="text-white/65">Password: alice123</div>
              </div>
              <div className="rounded-[18px] bg-white/6 p-4">Your connection is secure and encrypted.</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl tracking-[-0.03em]">
              <Lock className="size-5" />
              Continue to booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-6"
              onSubmit={async (event) => {
                event.preventDefault()
                event.stopPropagation()
                setError(null)
                try {
                  await form.handleSubmit()
                } catch (submitError) {
                  setError(submitError instanceof Error ? submitError.message : "Login failed.")
                }
              }}
            >
              <FieldGroup>
                <form.Field name="username">
                  {(field) => (
                    <Field>
                      <FieldLabel>Email address</FieldLabel>
                      <Input id="username" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} placeholder="you@example.com" value={field.state.value} />
                    </Field>
                  )}
                </form.Field>
                <form.Field name="password">
                  {(field) => (
                    <Field>
                      <FieldLabel>Password</FieldLabel>
                      <Input id="password" onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="password" value={field.state.value} />
                    </Field>
                  )}
                </form.Field>
              </FieldGroup>
              {error ? <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button className="h-11 w-full rounded-[16px] bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Continuing…" : "Continue to booking"}
                  </Button>
                )}
              </form.Subscribe>
              <div className="text-center text-sm text-slate-500">
                New traveler? <Link className="font-medium text-slate-950 underline underline-offset-4" to="/register">Join SkyRoute</Link>
              </div>
              <FieldDescription className="text-center">This traveler sign-in is public/customer facing. Staff should use the dedicated staff auth surface later in the dashboard flow.</FieldDescription>
            </form>
          </CardContent>
        </Card>
      </div>
    </TravelerShell>
  )
}

