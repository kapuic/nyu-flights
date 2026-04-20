import { useForm } from "@tanstack/react-form"
import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { PlaneTakeoff, UserRoundPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { TravelerShell } from "@/components/traveler-shell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, registerCustomerFn } from "@/lib/auth"

export const Route = createFileRoute("/register")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
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
    <TravelerShell currentUser={currentUser ? { displayName: currentUser.displayName, role: currentUser.role } : null} section="support">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-[32px] border-0 bg-slate-950 text-white shadow-[0_30px_80px_-56px_rgba(15,23,42,0.5)]">
          <CardContent className="flex h-full flex-col justify-between gap-10 px-8 py-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-sm text-white/75">
                <PlaneTakeoff className="size-4" />
                Traveler registration
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em]">Join SkyRoute and keep your trips in one place</h1>
              <p className="mt-4 text-base leading-7 text-white/72">Create a customer account to secure flights, manage itineraries, and review completed journeys. Staff sign-up exists separately and should not live in this traveler registration flow.</p>
            </div>
            <div className="space-y-4 rounded-[24px] bg-white/6 p-5 text-sm text-white/78">
              <div className="flex items-center gap-3">
                <Avatar className="bg-white/10 text-white after:hidden" size="lg">
                  <AvatarFallback>AP</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-white">Traveler Hub access</div>
                  <div className="text-white/60">Bookings, wallet context, history, and reviews.</div>
                </div>
              </div>
              <div className="rounded-[18px] bg-white/6 p-4">The form mirrors the Part 2 customer schema, so the data you enter becomes real traveler data in the reservation system.</div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-0 bg-white shadow-[0_24px_70px_-54px_rgba(15,23,42,0.28)] ring-1 ring-slate-200/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl tracking-[-0.03em]">
              <UserRoundPlus className="size-5" />
              Create your traveler account
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
                  setError(submitError instanceof Error ? submitError.message : "Registration failed.")
                }
              }}
            >
              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <form.Field name="name">{(field) => <Field><FieldLabel>Full name</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="email">{(field) => <Field><FieldLabel>Email</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="email" value={field.state.value} /></Field>}</form.Field>
                <form.Field name="password">{(field) => <Field><FieldLabel>Password</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="password" value={field.state.value} /></Field>}</form.Field>
                <form.Field name="phoneNumber">{(field) => <Field><FieldLabel>Phone number</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="dateOfBirth">{(field) => <Field><FieldLabel>Date of birth</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</form.Field>
                <form.Field name="buildingNumber">{(field) => <Field><FieldLabel>Building number</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="street">{(field) => <Field><FieldLabel>Street</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="city">{(field) => <Field><FieldLabel>City</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="state">{(field) => <Field><FieldLabel>State</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="passportNumber">{(field) => <Field><FieldLabel>Passport number</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
                <form.Field name="passportExpiration">{(field) => <Field><FieldLabel>Passport expiration</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="date" value={field.state.value} /></Field>}</form.Field>
                <form.Field name="passportCountry">{(field) => <Field><FieldLabel>Passport country</FieldLabel><Input onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} /></Field>}</form.Field>
              </FieldGroup>
              {error ? <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => <Button className="h-11 w-full rounded-[16px] bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} type="submit">{isSubmitting ? "Creating account…" : "Create traveler account"}</Button>}
              </form.Subscribe>
              <div className="text-center text-sm text-slate-500">Already registered? <Link className="font-medium text-slate-950 underline underline-offset-4" to="/login">Sign in</Link></div>
              <FieldDescription className="text-center">Traveler sign-up is separate from staff onboarding by design. Staff accounts should be created through the internal staff-facing flow.</FieldDescription>
            </form>
          </CardContent>
        </Card>
      </div>
    </TravelerShell>
  )
}

