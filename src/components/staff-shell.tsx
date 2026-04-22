"use client"

import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Monitor,
  Moon,
  Plane,
  Star,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { APP_NAME } from "@/lib/app-config"

type StaffShellProps = {
  airlineName: string
  children: React.ReactNode
  currentSection: string
  onLogout: () => void
  onSectionChange: (key: string) => void
}

type ThemeOption = "system" | "light" | "dark"

const NAV_ITEMS = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { icon: Plane, key: "fleet", label: "Fleet" },
  { icon: CalendarDays, key: "schedules", label: "Schedules" },
  { icon: Star, key: "ratings", label: "Ratings" },
  { icon: BarChart3, key: "reports", label: "Reports" },
] as const

function normalizeThemeValue(theme: string | null | undefined): ThemeOption {
  if (theme === "light" || theme === "dark" || theme === "system") return theme
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

export function StaffShell({
  airlineName,
  children,
  currentSection,
  onLogout,
  onSectionChange,
}: StaffShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        airlineName={airlineName}
        currentSection={currentSection}
        items={NAV_ITEMS}
        onCreateFlight={() => onSectionChange("create-flight")}
        onLogout={onLogout}
        onSectionChange={onSectionChange}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/90 px-4 backdrop-blur-sm">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <span className="text-sm font-medium text-muted-foreground">
              {APP_NAME} · {airlineName}
            </span>
          </div>
          <ThemePreferenceSelect />
        </header>
        <main className="flex-1 overflow-auto bg-background text-foreground">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
