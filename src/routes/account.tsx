import { Link, Outlet, createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { CreditCard, Lock, LogOut, User } from "lucide-react"
import { toast } from "sonner"

import { AppNavbar } from "@/components/app-navbar"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"

export const Route = createFileRoute("/account")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff" })
    return { currentUser }
  },
  component: AccountLayout,
})

const sidebarItems = [
  { to: "/account" as const, icon: User, label: "Profile", exact: true },
  { to: "/account/security" as const, icon: Lock, label: "Security" },
  { to: "/account/payments" as const, icon: CreditCard, label: "Payments" },
]

function AccountLayout() {
  const { currentUser } = Route.useLoaderData()
  const router = useRouter()

  async function handleSignOut() {
    await logoutFn()
    await router.invalidate()
    toast.success("Signed out.")
    void router.navigate({ to: "/" })
  }

  return (
    <div className="dark min-h-screen bg-black text-white">
      <AppNavbar currentUser={currentUser} />
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row">
          <aside className="hidden md:block w-52 shrink-0">
            <div className="sticky top-8 space-y-1">
              {sidebarItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: "exact" in item && item.exact }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white [&.active]:bg-white/[0.08] [&.active]:text-white [&.active]:font-medium"
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              ))}
              <div className="my-3 h-px bg-white/[0.06]" />
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
              >
                <LogOut className="size-4" />
                Sign Out
              </button>
            </div>
          </aside>
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {sidebarItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeOptions={{ exact: "exact" in item && item.exact }}
                className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-sm text-white/60 whitespace-nowrap transition-colors hover:text-white [&.active]:bg-white/10 [&.active]:text-white"
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
