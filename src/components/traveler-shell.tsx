import { Link } from "@tanstack/react-router"
import { LogOut, Plane, Search, Shield, Ticket, UserRound } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type TravelerShellProps = {
  children: React.ReactNode
  currentUser?: {
    displayName: string
    role: "customer" | "staff"
  } | null
  onLogout?: () => void | Promise<void>
  section?: "bookings" | "explore" | "support"
}

export function TravelerShell({ children, currentUser, onLogout, section = "explore" }: TravelerShellProps) {
  const nav = [
    { key: "explore", label: "Explore", to: "/", icon: Search },
    { key: "bookings", label: "Bookings", to: currentUser?.role === "customer" ? "/customer" : "/login", icon: Ticket },
    { key: "support", label: "Support", to: "/register", icon: Shield },
  ] as const

  return (
    <div className="min-h-svh bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto flex min-h-svh w-full max-w-[1360px] flex-col px-4 py-3 lg:px-6">
        <header className="rounded-[22px] border border-slate-200/80 bg-white px-6 py-4 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center text-slate-950">
                <Plane className="size-5" />
              </div>
              <div>
                <Link className="block text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950" to="/">
                  AeroPrecision
                </Link>
                <p className="text-sm leading-6 text-slate-500">Precision routing for the modern traveler.</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <nav className="flex flex-wrap items-center gap-8 px-2 text-sm font-medium text-slate-500">
                {nav.map((item) => (
                  <Link
                    className={cn(
                      "inline-flex items-center gap-2 border-b-2 border-transparent pb-1 transition-colors",
                      section === item.key ? "border-slate-950 text-slate-950" : "hover:text-slate-950",
                    )}
                    key={item.key}
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <div className="flex items-center gap-3 self-start lg:self-auto">
                {currentUser ? (
                  <>
                    <div className="inline-flex items-center gap-2 rounded-[12px] bg-slate-100 px-3 py-2 text-sm text-slate-600">
                      <UserRound className="size-4" />
                      {currentUser.displayName}
                    </div>
                    <Button className="rounded-[14px] bg-slate-950 px-4 text-white hover:bg-slate-800" onClick={onLogout} type="button">
                      <LogOut className="size-4" data-icon="inline-start" />
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link className="inline-flex h-10 items-center justify-center px-2 text-sm font-medium text-slate-950 transition-colors hover:text-slate-700" to="/login">
                      Sign in
                    </Link>
                    <Link className="inline-flex h-10 items-center justify-center rounded-[10px] bg-slate-950 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800" to="/register">
                      Join
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 py-6">{children}</main>
      </div>
    </div>
  )
}
