"use client"

import { Link } from "@tanstack/react-router"
import {
  Luggage,
  Monitor,
  Moon,
  PersonStanding,
  Plane,
  Search,
  Sun,
  Wallet,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { APP_NAME } from "@/lib/app-config"
import { cn } from "@/lib/utils"

type TravelerShellProps = {
  children: React.ReactNode
  currentUser?: { displayName: string; email: string } | null
  onLogout?: () => void
  section?: "explore" | "bookings" | "support"
}

type ThemeOption = "system" | "light" | "dark"

const DESKTOP_NAV: Array<{
  key: "explore" | "bookings" | "support"
  label: string
  to: "/" | "/customer"
}> = [
  { key: "explore", label: "Explore", to: "/" },
  { key: "bookings", label: "Bookings", to: "/customer" },
  { key: "support", label: "Support", to: "/" },
]

const MOBILE_NAV: Array<{
  icon: React.ComponentType<{ className?: string; fill?: string }>
  label: string
  to: string
}> = [
  { icon: Search, label: "Search", to: "/" },
  { icon: Luggage, label: "Trips", to: "/customer" },
  { icon: Wallet, label: "Wallet", to: "/" },
  { icon: PersonStanding, label: "Profile", to: "/customer" },
]

function normalizeThemeValue(theme: string | null | undefined): ThemeOption {
  if (theme === "light") return "light"
  if (theme === "dark") return "dark"
  return "system"
}

function getThemePresentation(
  activeTheme: ThemeOption,
  mounted: boolean,
  resolvedTheme?: string
) {
  if (!mounted) {
    return {
      icon: Monitor,
      label: "Theme",
    }
  }

  if (activeTheme === "dark") {
    return {
      icon: Moon,
      label: "Dark",
    }
  }

  if (activeTheme === "light") {
    return {
      icon: Sun,
      label: "Light",
    }
  }

  return {
    icon: Monitor,
    label: `System · ${resolvedTheme === "dark" ? "Dark" : "Light"}`,
  }
}

function DesktopNavLink({
  active,
  label,
  to,
}: {
  active: boolean
  label: string
  to: "/" | "/customer"
}) {
  return (
    <Link
      className={cn(
        "border-b-2 pb-1 font-medium transition-all",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
      to={to}
    >
      {label}
    </Link>
  )
}

function MobileNavLink({
  icon: Icon,
  label,
  to,
}: {
  icon: React.ComponentType<{ className?: string; fill?: string }>
  label: string
  to: string
}) {
  return (
    <Link
      className="flex flex-col items-center justify-center text-muted-foreground"
      to={to}
    >
      <Icon className="mb-0.5 size-5" />
      <span className="mt-0.5 text-[10px] tracking-widest uppercase">
        {label}
      </span>
    </Link>
  )
}

function ThemePreferenceSelect() {
  const { resolvedTheme, setTheme, theme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const activeTheme = normalizeThemeValue(mounted ? theme : undefined)
  const presentation = getThemePresentation(activeTheme, mounted, resolvedTheme)
  const ActiveIcon = presentation.icon

  return (
    <Select
      onValueChange={(value) => setTheme(normalizeThemeValue(value))}
      value={activeTheme}
    >
      <SelectTrigger
        aria-label="Theme preference"
        className="h-9 w-[132px] bg-background text-foreground"
      >
        <ActiveIcon className="size-4 text-muted-foreground" />
        <SelectValue>{presentation.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="system">System</SelectItem>
        <SelectItem value="light">Light</SelectItem>
        <SelectItem value="dark">Dark</SelectItem>
      </SelectContent>
    </Select>
  )
}

export function TravelerShell({
  children,
  currentUser,
  onLogout,
  section = "explore",
}: TravelerShellProps) {
  return (
    <div className="min-h-svh bg-background text-foreground antialiased">
      <header className="fixed top-0 z-50 hidden w-full border-b border-border bg-background/95 backdrop-blur md:block">
        <div className="mx-auto flex h-16 w-full max-w-screen-2xl items-center justify-between px-8">
          <div className="flex items-center gap-8">
            <Link
              className="flex items-center gap-2 text-xl font-bold tracking-tighter text-foreground"
              to="/"
            >
              <Plane className="size-5" />
              {APP_NAME}
            </Link>
            <nav className="flex gap-8">
              {DESKTOP_NAV.map((item) => (
                <DesktopNavLink
                  active={section === item.key}
                  key={item.key}
                  label={item.label}
                  to={item.to}
                />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <ThemePreferenceSelect />
            {currentUser ? (
              <>
                <span className="text-sm font-medium text-muted-foreground">
                  {currentUser.displayName}
                </span>
                <Button className="rounded-lg" onClick={onLogout} size="sm">
                  Log out
                </Button>
              </>
            ) : (
              <>
                <Link
                  className="font-medium text-foreground transition-opacity hover:opacity-80"
                  to="/login"
                >
                  Sign In
                </Link>
                <Link
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  to="/register"
                >
                  Join
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex min-h-svh flex-col pt-16 pb-20 md:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 z-50 flex h-16 w-full items-center justify-around border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(15,23,42,0.08)] backdrop-blur-md md:hidden">
        {MOBILE_NAV.map((item) => (
          <MobileNavLink
            icon={item.icon}
            key={item.label}
            label={item.label}
            to={item.to}
          />
        ))}
      </nav>
    </div>
  )
}
