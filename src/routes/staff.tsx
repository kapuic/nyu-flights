import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute('/staff')({
  component: StaffRouteLayout,
})

function StaffRouteLayout() {
  return <Outlet />
}

