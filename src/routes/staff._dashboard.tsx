import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useHotkey } from "@tanstack/react-hotkeys"
import { useMemo, useState } from "react"
import {
  BarChart3,
  Building2,
  ChevronUp,
  Globe,
  LayoutDashboard,
  LogOut,
  Plane,
  PlaneTakeoff,
  SearchIcon,
  Shield,
  UserCog,
  Users,
} from "lucide-react"
import { toast } from "sonner"
import type { ComponentType, KeyboardEvent } from "react"

import type { StaffDashboardData } from "@/lib/queries"
import type { StaffPermission } from "@/lib/staff-permissions"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { getQueryClient } from "@/lib/query-client"
import { isSuperadmin } from "@/lib/staff-permissions"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"

export const Route = createFileRoute("/staff/_dashboard")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/staff/login" })
    if (currentUser.role !== "staff") throw redirect({ to: "/trips" })

    const qc = getQueryClient()
    await qc.ensureQueryData(staffDashboardQueryOptions())

    return { currentUser }
  },
  component: StaffDashboardLayout,
})

type NavItem = {
  icon: ComponentType<{ className?: string }>
  label: string
  to: string
}

type CommandItem = {
  group: "Navigation" | "Flights" | "Fleet" | "Administration"
  href: string
  label: string
  search: string
}

function getNavItems() {
  const items: Array<NavItem> = [
    { to: "/staff", label: "Dashboard", icon: LayoutDashboard },
    { to: "/staff/flights", label: "Flights", icon: PlaneTakeoff },
    { to: "/staff/fleet", label: "Fleet", icon: Plane },
    { to: "/staff/passengers", label: "Passengers", icon: Users },
    { to: "/staff/reports", label: "Reports", icon: BarChart3 },
  ]
  return items
}

function getAdminNavItems(permission: StaffPermission): Array<NavItem> {
  if (!isSuperadmin(permission)) return []
  return [
    { to: "/staff/airlines", label: "Airlines", icon: Building2 },
    { to: "/staff/airports", label: "Airports", icon: Globe },
    { to: "/staff/manage-staff", label: "Staff", icon: Shield },
    { to: "/staff/manage-customers", label: "Customers", icon: UserCog },
  ]
}

function permissionLabel(permission: StaffPermission) {
  if (permission === "superadmin") return "Superadmin"
  if (permission === "admin") return "Admin"
  return null
}

function buildCommandItems(
  navItems: Array<NavItem>,
  adminItems: Array<NavItem>,
  dashboardData: StaffDashboardData
): Array<CommandItem> {
  const adminPaths = new Set(adminItems.map((item) => item.to))
  const navigationItems: Array<CommandItem> = [...navItems, ...adminItems].map(
    (item) => ({
      group: adminPaths.has(item.to) ? "Administration" : "Navigation",
      href: item.to,
      label: item.label,
      search: item.label.toLowerCase(),
    })
  )

  const flightItems = dashboardData.flights.slice(0, 40).map((flight) => ({
    group: "Flights" as const,
    href: `/staff/flights?flightsQ=${encodeURIComponent(flight.flightNumber)}`,
    label: `${flight.flightNumber} · ${flight.departureAirportCode} to ${flight.arrivalAirportCode}`,
    search:
      `${flight.flightNumber} ${flight.departureAirportCode} ${flight.arrivalAirportCode} ${flight.status}`.toLowerCase(),
  }))

  const fleetItems = dashboardData.airplanes.slice(0, 40).map((airplane) => ({
    group: "Fleet" as const,
    href: `/staff/fleet?fleetQ=${encodeURIComponent(airplane.airplaneId)}`,
    label: `${airplane.airplaneId} · ${airplane.manufacturingCompany}`,
    search:
      `${airplane.airplaneId} ${airplane.manufacturingCompany}`.toLowerCase(),
  }))

  return [...navigationItems, ...flightItems, ...fleetItems]
}

type StaffCommandPaletteProps = {
  items: Array<CommandItem>
  onItemSelect: (item: CommandItem) => Promise<void>
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onOpenChange: (open: boolean) => void
  onSearchChange: (value: string) => void
  open: boolean
  search: string
}

function StaffCommandPalette({
  items,
  onItemSelect,
  onKeyDown,
  onOpenChange,
  onSearchChange,
  open,
  search,
}: StaffCommandPaletteProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
        <DialogTitle className="sr-only">Search staff portal</DialogTitle>
        <DialogDescription className="sr-only">
          Search pages, flights, and aircraft.
        </DialogDescription>
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <SearchIcon className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            className="h-10 border-0 px-0 shadow-none focus-visible:ring-0"
            placeholder="Search pages, flights, or aircraft"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {items.length ? (
            <div className="flex flex-col gap-1">
              {items.map((item) => (
                <button
                  key={`${item.group}-${item.label}-${item.href}`}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                  onClick={() => void onItemSelect(item)}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.group}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-2.5 py-8 text-center text-sm text-muted-foreground">
              No matches found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StaffDashboardLayout() {
  const { currentUser } = Route.useLoaderData()
  const { data } = useSuspenseQuery(staffDashboardQueryOptions())
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandSearch, setCommandSearch] = useState("")
  const router = useRouter()
  const location = useLocation()
  const queryClient = useQueryClient()

  const permission = currentUser.staffPermission ?? "staff"
  const navItems = useMemo(() => getNavItems(), [])
  const adminItems = useMemo(() => getAdminNavItems(permission), [permission])
  const commandItems = useMemo(
    () => buildCommandItems(navItems, adminItems, data),
    [adminItems, data, navItems]
  )
  const filteredCommandItems = useMemo(() => {
    const normalizedSearch = commandSearch.trim().toLowerCase()
    if (!normalizedSearch) return commandItems.slice(0, 12)
    return commandItems
      .filter((item) => item.search.includes(normalizedSearch))
      .slice(0, 12)
  }, [commandItems, commandSearch])
  const badge = permissionLabel(permission)

  const initials = currentUser.displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  async function handleLogout() {
    const result = await logoutFn()
    queryClient.clear()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: result.redirectTo })
  }

  async function runCommand(item: CommandItem) {
    setCommandOpen(false)
    setCommandSearch("")
    await router.navigate({ href: item.href })
  }

  useHotkey(
    "Mod+K",
    (event) => {
      event.preventDefault()
      setCommandOpen((open) => !open)
    },
    { ignoreInputs: false }
  )

  function isActive(to: string) {
    if (to === "/staff") {
      return location.pathname === "/staff" || location.pathname === "/staff/"
    }
    return location.pathname === to || location.pathname.startsWith(to + "/")
  }

  function handleCommandKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") return
    event.preventDefault()
    void runCommand(filteredCommandItems[0])
  }

  return (
    <SidebarProvider>
      <StaffCommandPalette
        items={filteredCommandItems}
        open={commandOpen}
        search={commandSearch}
        onItemSelect={runCommand}
        onKeyDown={handleCommandKeyDown}
        onOpenChange={setCommandOpen}
        onSearchChange={setCommandSearch}
      />
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link to="/staff" />}>
                <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">
                    {currentUser.airlineName ?? "Operations"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Staff Portal
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setCommandOpen(true)}>
                    <SearchIcon className="size-4" />
                    <span>Search</span>
                    <kbd className="ms-auto rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      ⌘K
                    </kbd>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Operations</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      isActive={isActive(item.to)}
                      render={<Link to={item.to} />}
                    >
                      <item.icon className="size-4" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {adminItems.length > 0 ? (
            <SidebarGroup>
              <SidebarGroupLabel>Administration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton
                        isActive={isActive(item.to)}
                        render={<Link to={item.to} />}
                      >
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">
                        {currentUser.displayName}
                      </span>
                      {badge ? (
                        <Badge
                          variant="secondary"
                          className="px-1 py-0 text-[10px]"
                        >
                          {badge}
                        </Badge>
                      ) : null}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {currentUser.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-[--radix-dropdown-menu-trigger-width]"
                >
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  )
}
