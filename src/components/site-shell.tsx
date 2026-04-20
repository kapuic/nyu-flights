import { Link } from "@tanstack/react-router"
import { Plane, ShieldCheck, Ticket, User2 } from "lucide-react"
import { type ReactNode } from "react"

import { cn } from "@/lib/utils"

type SiteShellProps = {
  active: "customer" | "public" | "staff"
  children: ReactNode
  currentUser?: {
    displayName: string
    role: "customer" | "staff"
  } | null
  summary: ReactNode
  title: string
}

const navItems = [
  { icon: Plane, key: "public", label: "Explore", to: "/" },
  { icon: Ticket, key: "customer", label: "Customer", to: "/customer" },
  { icon: ShieldCheck, key: "staff", label: "Staff", to: "/staff" },
] as const

export function SiteShell({ active, children, currentUser, summary, title }: SiteShellProps) {
  return (
    <div className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(29,78,216,0.16),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#edf4ff_48%,#f8fafc_100%)] text-slate-950">
      <div className="mx-auto flex min-h-svh w-full max-w-[1480px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="rounded-[24px] border border-slate-200/80 bg-white/86 px-4 py-4 shadow-[0_18px_60px_-38px_rgba(15,23,42,0.35)] backdrop-blur sm:px-5 lg:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Link className="inline-flex items-center gap-3 text-slate-950" to="/">
                  <span className="flex size-11 items-center justify-center rounded-[14px] bg-slate-950 text-white shadow-[0_12px_30px_-18px_rgba(15,23,42,0.7)]">
                    <Plane className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[15px] font-semibold tracking-[-0.02em]">SkyRoute Reserve</span>
                    <span className="block text-sm text-slate-500">Air ticket operations with live inventory and accountable SQL.</span>
                  </span>
                </Link>
              </div>
              {currentUser ? (
                <div className="hidden rounded-[16px] border border-slate-200 bg-slate-50 px-3 py-2 text-right sm:block">
                  <div className="text-sm font-medium text-slate-900">{currentUser.displayName}</div>
                  <div className="text-xs text-slate-500">{currentUser.role === "staff" ? "Airline staff" : "Customer"}</div>
                </div>
              ) : null}
            </div>
            <nav className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
              {navItems.map((item) => (
                <Link
                  className={cn(
                    "flex items-center justify-between rounded-[18px] border px-4 py-3 text-left transition-colors",
                    active === item.key
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-white",
                  )}
                  key={item.key}
                  to={item.to}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <item.icon className="size-4" />
                    {item.label}
                  </span>
                  <span className="text-xs opacity-70">Home</span>
                </Link>
              ))}
            </nav>
          </div>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <main className="space-y-5 rounded-[28px] border border-slate-200/75 bg-white/92 p-4 shadow-[0_22px_70px_-42px_rgba(15,23,42,0.28)] sm:p-6">
            <div className="flex flex-col gap-2 border-b border-slate-200 pb-5">
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2rem]">{title}</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Built for the course requirements, but shaped like a real airline operations product: clear data, explicit actions, and responsive behavior from phone to desktop.
              </p>
            </div>
            {children}
          </main>
          <aside className="rounded-[28px] border border-slate-200/80 bg-slate-950 p-5 text-white shadow-[0_24px_80px_-45px_rgba(15,23,42,0.8)]">
            <div className="flex items-center gap-2 text-sm text-blue-200">
              <User2 className="size-4" />
              <span>{currentUser ? `${currentUser.displayName} is signed in.` : "No active session yet."}</span>
            </div>
            <div className="mt-4 space-y-4">{summary}</div>
            {!currentUser ? (
              <div className="mt-6 flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Link className="inline-flex h-9 items-center justify-center rounded-[14px] bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-500" to="/login">
                  Log in
                </Link>
                <Link className="inline-flex h-9 items-center justify-center rounded-[14px] border border-white/20 bg-white/6 px-3 text-sm font-medium text-white transition-colors hover:bg-white/12" to="/register">
                  Create account
                </Link>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}
