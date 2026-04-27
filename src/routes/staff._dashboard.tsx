import {
  Link,
  Outlet,
  createFileRoute,
  redirect,
  useLocation,
  useRouter,
} from "@tanstack/react-router"
import { useQueryClient } from "@tanstack/react-query"
import {
  Building2,
  ChevronUp,
  LayoutDashboard,
  PlaneTakeoff,
  Plane,
  Users,
  BarChart3,
  LogOut,
  Globe,
  Shield,
  UserCog,
} from "lucide-react"
import { toast } from "sonner"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { staffDashboardQueryOptions } from "@/lib/staff-queries"
import { getQueryClient } from "@/lib/query-client"
import { isSuperadmin } from "@/lib/staff-permissions"
import type { StaffPermission } from "@/lib/staff-permissions"

export const Route = createFileRoute("/staff/_dashboard")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/staff/login" })
    if (currentUser.role !== "staff") throw redirect({ to: "/customer" })

    const qc = getQueryClient()
    await qc.ensureQueryData(staffDashboardQueryOptions())

    return { currentUser }
  },
  component: StaffDashboardLayout,
})

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function getNavItems() {
  const items: NavItem[] = [
    { to: "/staff", label: "Dashboard", icon: LayoutDashboard },
    { to: "/staff/flights", label: "Flights", icon: PlaneTakeoff },
    { to: "/staff/fleet", label: "Fleet", icon: Plane },
    { to: "/staff/passengers", label: "Passengers", icon: Users },
    { to: "/staff/reports", label: "Reports", icon: BarChart3 },
  ]
  return items
}

function getAdminNavItems(permission: StaffPermission): NavItem[] {
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

function StaffDashboardLayout() {
  const { currentUser } = Route.useLoaderData()
  const router = useRouter()
  const location = useLocation()
  const queryClient = useQueryClient()

  const permission = currentUser.staffPermission ?? "staff"
  const navItems = getNavItems()
  const adminItems = getAdminNavItems(permission)
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

  function isActive(to: string) {
    if (to === "/staff") {
      return location.pathname === "/staff" || location.pathname === "/staff/"
    }
    return (
      location.pathname === to || location.pathname.startsWith(to + "/")
    )
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                render={<Link to="/staff" />}
              >
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
                        <Badge variant="secondary" className="text-[10px] px-1 py-0">
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
