import { createFileRoute, redirect } from "@tanstack/react-router"

import { getCurrentUserFn } from "@/lib/auth"
import { getStaffDashboardFn } from "@/lib/queries"

export const Route = createFileRoute("/staff/app")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/staff/login" })
    if (currentUser.role !== "staff") throw redirect({ to: "/customer" })

    return getStaffDashboardFn({
      data: { destination: "", endDate: "", source: "", startDate: "" },
    })
  },
  component: StaffHomePage,
})

function StaffHomePage() {
  return <></>
}
