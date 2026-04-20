import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
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
import { getCurrentUserFn, loginFn } from "@/lib/auth"

export const Route = createFileRoute("/login")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    return { currentUser }
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
  const [role, setRole] = useState<"customer" | "staff">("customer")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const result = await loginFn({ data: { password, role, username } })
      if (result?.error) {
        setError(result.error)
        return
      }

      toast.success("Welcome back.")
      await router.invalidate()
      await router.navigate({ to: result?.redirectTo ?? "/" })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Login failed.")
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
          <div className="rounded-[22px] border border-white/12 bg-white/6 p-4">
            <div className="text-sm text-white/75">Customer demo login</div>
            <div className="mt-2 text-sm font-medium text-white">alice.chen@example.com / alice123</div>
          </div>
          <div className="rounded-[22px] border border-white/12 bg-white/6 p-4">
            <div className="text-sm text-white/75">Staff demo login</div>
            <div className="mt-2 text-sm font-medium text-white">mrivera / staffpass1</div>
          </div>
        </>
      }
      title="Log back into the reservation system"
    >
      <Card className="mx-auto max-w-2xl rounded-[24px] border border-slate-200 bg-white shadow-none">
        <CardHeader>
          <CardTitle>Choose your role and continue</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select onValueChange={(value) => setRole(value as "customer" | "staff")} value={role}>
                  <SelectTrigger className="w-full" id="role">
                    <SelectValue placeholder="Choose a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="staff">Airline staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">{role === "customer" ? "Email" : "Username"}</Label>
                <Input id="username" onChange={(event) => setUsername(event.target.value)} value={username} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" onChange={(event) => setPassword(event.target.value)} type="password" value={password} />
            </div>
            {error ? <div className="rounded-[16px] bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={isSubmitting} type="submit">
                {isSubmitting ? "Signing in…" : "Log in"}
              </Button>
              <div className="text-sm text-slate-500">
                Need an account? <Link className="font-medium text-slate-950 underline underline-offset-4" to="/register">Create one here</Link>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </SiteShell>
  )
}
