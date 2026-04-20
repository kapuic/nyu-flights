import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { SiteShell } from "@/components/site-shell"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getCurrentUserFn, registerCustomerFn, registerStaffFn } from "@/lib/auth"
import { listReferenceDataFn } from "@/lib/queries"

export const Route = createFileRoute("/register")({
  loader: async () => {
    const [currentUser, references] = await Promise.all([getCurrentUserFn(), listReferenceDataFn()])
    return {
      airlines: references.airlines,
      currentUser,
    }
  },
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const { airlines, currentUser } = Route.useLoaderData()
  const [role, setRole] = useState<"customer" | "staff">("customer")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customerForm, setCustomerForm] = useState({
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
  })
  const [staffForm, setStaffForm] = useState({
    airlineName: airlines[0] ?? "",
    dateOfBirth: "",
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    phoneNumbers: "",
    username: "",
  })

  const helperText = useMemo(() => {
    if (role === "customer") {
      return "Customer accounts unlock search, purchase history, and flight reviews."
    }

    return "Staff accounts are scoped to a single airline and expose schedule, fleet, and revenue tooling."
  }, [role])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      if (role === "customer") {
        const result = await registerCustomerFn({ data: customerForm })
        if (result?.error) {
          setError(result.error)
          return
        }
        toast.success("Customer account created.")
        await router.invalidate()
        await router.navigate({ to: result?.redirectTo ?? "/customer" })
        return
      }

      const result = await registerStaffFn({ data: staffForm })
      if (result?.error) {
        setError(result.error)
        return
      }

      toast.success("Staff account created.")
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? "/staff" })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Registration failed.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SiteShell
      active="public"
      currentUser={currentUser ? { displayName: currentUser.displayName, role: currentUser.role } : null}
      summary={
        <>
          <div className="rounded-[22px] border border-white/12 bg-white/6 p-4 text-sm leading-6 text-white/78">
            Create the exact role-specific surface you need now, then keep the rest of the system hidden until it becomes relevant.
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/6 p-4 text-sm leading-6 text-white/78">
            For staff users, a comma-separated list of phone numbers is accepted and stored in the dedicated staff-phone table.
          </div>
        </>
      }
      title="Create a role-specific account"
    >
      <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle>Registration that mirrors the Part 2 schema</CardTitle>
          <p className="text-sm leading-6 text-slate-500">{helperText}</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={handleSubmit}>
            <div className="max-w-[220px] space-y-2">
              <Label htmlFor="register-role">Role</Label>
              <Select onValueChange={(value) => setRole(value as "customer" | "staff")} value={role}>
                <SelectTrigger className="w-full" id="register-role">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="staff">Airline staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {role === "customer" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, name: event.target.value }))} value={customerForm.name} /></Field>
                <Field label="Email"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, email: event.target.value }))} type="email" value={customerForm.email} /></Field>
                <Field label="Password"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, password: event.target.value }))} type="password" value={customerForm.password} /></Field>
                <Field label="Phone number"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, phoneNumber: event.target.value }))} value={customerForm.phoneNumber} /></Field>
                <Field label="Date of birth"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, dateOfBirth: event.target.value }))} type="date" value={customerForm.dateOfBirth} /></Field>
                <Field label="Building number"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, buildingNumber: event.target.value }))} value={customerForm.buildingNumber} /></Field>
                <Field label="Street"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, street: event.target.value }))} value={customerForm.street} /></Field>
                <Field label="City"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, city: event.target.value }))} value={customerForm.city} /></Field>
                <Field label="State"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, state: event.target.value }))} value={customerForm.state} /></Field>
                <Field label="Passport number"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, passportNumber: event.target.value }))} value={customerForm.passportNumber} /></Field>
                <Field label="Passport expiration"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, passportExpiration: event.target.value }))} type="date" value={customerForm.passportExpiration} /></Field>
                <Field label="Passport country"><Input onChange={(event) => setCustomerForm((current) => ({ ...current, passportCountry: event.target.value }))} value={customerForm.passportCountry} /></Field>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Username"><Input onChange={(event) => setStaffForm((current) => ({ ...current, username: event.target.value }))} value={staffForm.username} /></Field>
                <Field label="Email"><Input onChange={(event) => setStaffForm((current) => ({ ...current, email: event.target.value }))} type="email" value={staffForm.email} /></Field>
                <Field label="Password"><Input onChange={(event) => setStaffForm((current) => ({ ...current, password: event.target.value }))} type="password" value={staffForm.password} /></Field>
                <Field label="Date of birth"><Input onChange={(event) => setStaffForm((current) => ({ ...current, dateOfBirth: event.target.value }))} type="date" value={staffForm.dateOfBirth} /></Field>
                <Field label="First name"><Input onChange={(event) => setStaffForm((current) => ({ ...current, firstName: event.target.value }))} value={staffForm.firstName} /></Field>
                <Field label="Last name"><Input onChange={(event) => setStaffForm((current) => ({ ...current, lastName: event.target.value }))} value={staffForm.lastName} /></Field>
                <div className="space-y-2">
                  <Label htmlFor="staff-airline">Airline</Label>
                  <Select onValueChange={(value) => setStaffForm((current) => ({ ...current, airlineName: value ?? current.airlineName }))} value={staffForm.airlineName}>
                    <SelectTrigger className="w-full" id="staff-airline">
                      <SelectValue placeholder="Choose an airline" />
                    </SelectTrigger>
                    <SelectContent>
                      {airlines.map((airline) => (
                        <SelectItem key={airline} value={airline}>{airline}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Phone numbers"><Textarea onChange={(event) => setStaffForm((current) => ({ ...current, phoneNumbers: event.target.value }))} placeholder="7185551000, 9175551001" value={staffForm.phoneNumbers} /></Field>
              </div>
            )}

            {error ? <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
              <div className="text-sm text-slate-500">
                Already registered? <Link className="font-medium text-slate-950 underline underline-offset-4" to="/login">Go to login</Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </SiteShell>
  )
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
