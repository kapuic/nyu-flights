import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { Eye, Key, Mail, Shield, UserRoundPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getCurrentUserFn, registerCustomerFn } from "@/lib/auth"

export const Route = createFileRoute("/register")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-lg bg-white shadow-[0_20px_40px_-10px_rgba(25,28,30,0.2)]">
        {/* Progress bar */}
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full w-1/3 bg-slate-950" />
        </div>

        <div className="p-8 sm:p-10">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-6 inline-flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-950">
              <UserRoundPlus className="size-6" />
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-950 font-['Manrope']">Join AeroPrecision</h2>
            <p className="text-sm text-slate-500">Create your traveler account to book flights and manage trips.</p>
          </div>

          {/* Form */}
          <form
            className="space-y-5"
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
          >
            {/* Name */}
            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Full Name</label>
              <form.Field name="name">
                {(field) => (
                  <input
                    className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    placeholder="John Smith"
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-0 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <form.Field name="email">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-8 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="name@example.com"
                      type="email"
                      value={field.state.value}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Password</label>
              <div className="relative">
                <Key className="absolute left-0 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <form.Field name="password">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-8 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                  )}
                </form.Field>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-950" onClick={() => setShowPassword(!showPassword)} type="button">
                  <Eye className="size-5" />
                </button>
              </div>
            </div>

            {/* DOB + Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Date of Birth</label>
                <form.Field name="dateOfBirth">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      type="date"
                      value={field.state.value}
                    />
                  )}
                </form.Field>
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Phone</label>
                <form.Field name="phoneNumber">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="+1 555-0000"
                      value={field.state.value}
                    />
                  )}
                </form.Field>
              </div>
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Street</label>
                <form.Field name="street">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="123 Main St" value={field.state.value} />}</form.Field>
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Building #</label>
                <form.Field name="buildingNumber">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="4A" value={field.state.value} />}</form.Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">City</label>
                <form.Field name="city">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="New York" value={field.state.value} />}</form.Field>
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">State</label>
                <form.Field name="state">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="NY" value={field.state.value} />}</form.Field>
              </div>
            </div>

            {/* Passport */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Passport #</label>
                <form.Field name="passportNumber">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="Required for international" value={field.state.value} />}</form.Field>
              </div>
              <div className="space-y-2">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Passport Country</label>
                <form.Field name="passportCountry">{(field) => <input className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0" onBlur={field.handleBlur} onChange={(e) => field.handleChange(e.target.value)} placeholder="US" value={field.state.value} />}</form.Field>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">Passport Expiration</label>
              <form.Field name="passportExpiration">
                {(field) => (
                  <input
                    className="w-full border-b-2 border-slate-200 bg-white px-0 py-3 text-sm text-slate-950 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    type="date"
                    value={field.state.value}
                  />
                )}
              </form.Field>
            </div>

            {/* Error */}
            {error ? <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            {/* Actions */}
            <div className="space-y-4 pt-2">
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-slate-950 to-slate-800 py-4 text-sm font-bold text-white hover:opacity-90 font-['Manrope']" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Creating account…" : "Create Account"}
                  </Button>
                )}
              </form.Subscribe>

              <div className="text-center text-sm text-slate-500">
                Already have an account? <Link className="font-medium text-slate-950 underline underline-offset-4" to="/login">Sign in</Link>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 text-center">
          <p className="flex items-center justify-center gap-1 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500">
            <Shield className="size-4" />
            Your connection is secure and encrypted
          </p>
        </div>
      </div>
    </div>
  )
}
