import { useForm } from "@tanstack/react-form"
import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { ArrowRight, Eye, Key, Lock, Mail, Shield } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { getCurrentUserFn, loginFn } from "@/lib/auth"

export const Route = createFileRoute("/login")({
  loader: async () => ({ currentUser: await getCurrentUserFn() }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

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
    <div className="flex min-h-screen items-center justify-center bg-[#f7f9fb] p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-lg bg-white shadow-[0_20px_40px_-10px_rgba(25,28,30,0.2)]">
        <div className="h-1 w-full bg-slate-100">
          <div className="h-full w-1/3 bg-slate-950" />
        </div>

        <div className="p-8 sm:p-10">
          <div className="mb-10 text-center">
            <div className="mx-auto mb-6 inline-flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-950">
              <Lock className="size-6" />
            </div>
            <h2 className="mb-2 text-xl font-bold tracking-tight text-slate-950 font-['Manrope']">Sign in to complete your booking</h2>
            <p className="text-sm text-slate-500">We need to verify your identity before securing these seats.</p>
          </div>

          <form
            className="space-y-6"
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
          >
            <div className="relative space-y-2">
              <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500" htmlFor="email">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <form.Field name="username">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-10 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      id="email"
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

            <div className="relative space-y-2">
              <div className="flex items-baseline justify-between">
                <label className="block text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500" htmlFor="password">Password</label>
                <a className="text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-500 transition-colors hover:text-slate-950" href="#">Forgot password?</a>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                <form.Field name="password">
                  {(field) => (
                    <input
                      className="w-full border-b-2 border-slate-200 bg-white px-10 py-3 text-sm text-slate-950 placeholder-slate-400 transition-colors focus:border-slate-950 focus:outline-none focus:ring-0"
                      id="password"
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      value={field.state.value}
                    />
                  )}
                </form.Field>
                <button className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-950" onClick={() => setShowPassword(!showPassword)} type="button">
                  <Eye className="size-5" />
                </button>
              </div>
            </div>

            {error ? <div className="rounded bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

            <div className="space-y-4 pt-4">
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-slate-950 to-slate-800 py-4 text-sm font-bold text-white hover:opacity-90 font-['Manrope']" disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Continuing…" : "Continue to Booking"}
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </form.Subscribe>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200" />
                <span className="mx-4 flex-shrink-0 text-[0.6875rem] font-bold uppercase tracking-[0.05em] text-slate-400">OR</span>
                <div className="flex-grow border-t border-slate-200" />
              </div>

              <Link className="flex w-full items-center justify-center rounded-lg bg-slate-200 py-4 text-sm font-bold text-slate-950 hover:bg-slate-300 font-['Manrope']" to="/register">Join AeroPrecision</Link>
            </div>
          </form>
        </div>

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
