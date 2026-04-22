import { LogOut, Plane } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { APP_NAME } from "@/lib/app-config"

type NavItem = {
  icon: React.ComponentType<{ className?: string }>
  key: string
  label: string
}

type AppSidebarProps = {
  airlineName: string
  currentSection: string
  items: readonly NavItem[]
  onCreateFlight: () => void
  onLogout: () => void
  onSectionChange: (key: string) => void
}

export function AppSidebar({
  airlineName,
  currentSection,
  items,
  onCreateFlight,
  onLogout,
  onSectionChange,
  ...props
}: AppSidebarProps & Omit<React.ComponentProps<typeof Sidebar>, "children">) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Plane className="size-4" />
          </div>
          <div className="grid flex-1 text-start text-sm leading-tight">
            <span className="truncate font-semibold">{APP_NAME}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {airlineName} Operations
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    isActive={currentSection === item.key}
                    onClick={() => onSectionChange(item.key)}
                  >
                    <item.icon className="size-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onCreateFlight}>
              <Plane className="size-4" />
              <span className="font-medium">Create Flight</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout}>
              <LogOut className="size-4" />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
