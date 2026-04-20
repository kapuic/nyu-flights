import { Link } from "@tanstack/react-router"
import { Luggage, PersonStanding, Plane, Search, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/app-config"
import { cn } from "@/lib/utils"

type TravelerShellProps = {
  children: React.ReactNode
  currentUser?: { displayName: string; email: string } | null
  onLogout?: () => void
  section?: "explore" | "bookings" | "support"
}

const DESKTOP_NAV: Array<{ key: "explore" | "bookings" | "support"; label: string; to: "/" | "/customer" }> = [
  { key: "explore", label: "Explore", to: "/" },
  { key: "bookings", label: "Bookings", to: "/customer" },
  { key: "support", label: "Support", to: "/" },
]

const MOBILE_NAV: Array<{ icon: React.ComponentType<{ className?: string; fill?: string }>; label: string; to: string }> = [
  { icon: Search, label: "Search", to: "/" },
  { icon: Luggage, label: "Trips", to: "/customer" },
  { icon: Wallet, label: "Wallet", to: "/" },
  { icon: PersonStanding, label: "Profile", to: "/customer" },
]

export function TravelerShell({ children, currentUser, onLogout, section = "explore" }: TravelerShellProps) {
  return (
    <div className="min-h-svh bg-[#f7f9fb] text-slate-950 antialiased">
      <header className="fixed top-0 z-50 hidden w-full bg-slate-50 md:block">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link className="flex items-center gap-2 text-xl font-bold tracking-tighter text-slate-900" to="/">
              <Plane className="size-5" />
              {APP_NAME}
            </Link>
            <nav className="flex gap-8">
              {DESKTOP_NAV.map((item) => (
                <Link
                  className={cn(
                    "border-b-2 pb-1 font-medium transition-all",
                    section === item.key
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-900",
                  )}
                  key={item.key}
                  to={item.to}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {currentUser ? (
              <>
                <span className="text-sm font-medium text-slate-700">{currentUser.displayName}</span>
                <Button className="rounded-lg bg-slate-950 text-white hover:bg-slate-800" onClick={onLogout} size="sm">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link className="font-medium text-slate-900 transition-opacity hover:opacity-80" to="/login">Sign In</Link>
                <Link className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800" to="/register">Join</Link>
              </>
            )}
          </div>
        </div>
        <div className="h-[1px] w-full bg-slate-200/10" />
      </header>

      <main className="flex min-h-svh flex-col pb-20 pt-16 md:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(0,0,0,0.05)] backdrop-blur-md md:hidden">
        {MOBILE_NAV.map((item) => (
          <Link className="flex flex-col items-center justify-center text-slate-400" key={item.label} to={item.to}>
            <item.icon className="mb-0.5 size-5" />
            <span className="mt-0.5 text-[10px] uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}
