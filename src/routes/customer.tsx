import { createFileRoute, redirect } from "@tanstack/react-router"

import { getCurrentUserFn } from "@/lib/auth"
import { getCustomerDashboardFn } from "@/lib/queries"

export const Route = createFileRoute("/customer")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    if (!currentUser) throw redirect({ to: "/login" })
    if (currentUser.role !== "customer") throw redirect({ to: "/staff/app" })

    return getCustomerDashboardFn({
      data: { destination: "", endDate: "", source: "", startDate: "" },
    })
  },
  component: CustomerPage,
})

function CustomerPage() {
  return <></>
}
