import { Link } from "@tanstack/react-router"
import { User } from "lucide-react"

import type { AuthUser } from "@/lib/auth"
import { APP_NAME } from "@/lib/app-config"

type AppNavbarProps = {
  activeTab?: "search" | "trips"
  currentUser: AuthUser | null
}

export function AppNavbar({ activeTab, currentUser }: AppNavbarProps) {
  const activeClass = "rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white"
  const inactiveClass = "rounded-full px-4 py-1.5 text-sm text-white/50 transition-colors hover:text-white/80"

  return (
    <nav className="flex items-center justify-between px-6 py-4">
      <Link
        to="/"
        className="text-lg font-semibold tracking-tight text-white"
      >
        {APP_NAME}
      </Link>

      <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-md">
        <Link
          to="/"
          className={activeTab === "search" ? activeClass : inactiveClass}
        >
          Search
        </Link>
        {currentUser ? (
          <Link
            to="/trips"
            className={activeTab === "trips" ? activeClass : inactiveClass}
          >
            My Trips
          </Link>
        ) : null}
      </div>

      <div>
        {currentUser ? (
          <Link
            to="/customer"
            className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <User className="size-4" />
            <span>Me</span>
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  )
}
