import { BarChart3, CalendarDays, LayoutDashboard, Plane, Star } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type StaffShellProps = {
  airlineName: string
  children: React.ReactNode
  currentSection: string
  onLogout: () => void
  onSectionChange: (key: string) => void
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, key: "dashboard", label: "Dashboard" },
  { icon: Plane, key: "fleet", label: "Fleet" },
  { icon: CalendarDays, key: "schedules", label: "Schedules" },
  { icon: Star, key: "ratings", label: "Ratings" },
  { icon: BarChart3, key: "reports", label: "Reports" },
] as const

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
        items={[...NAV_ITEMS]}
        onCreateFlight={() => onSectionChange("create-flight")}
        onLogout={onLogout}
        onSectionChange={onSectionChange}
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-white/80 backdrop-blur-sm px-4">
          <SidebarTrigger className="-ml-1" />
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">AeroPrecision · {airlineName}</span>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
