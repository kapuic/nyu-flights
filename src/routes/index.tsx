import { Link, createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"

import { FlightResults } from "@/components/flight-results"
import { FlightSearchPanel, type FlightSearchValues } from "@/components/flight-search-panel"
import { SiteShell } from "@/components/site-shell"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCurrentUserFn, logoutFn } from "@/lib/auth"
import { searchFlightsFn, type FlightOption } from "@/lib/queries"

export const Route = createFileRoute("/")({
  loader: async () => {
    const currentUser = await getCurrentUserFn()
    return { currentUser }
  },
  component: PublicHomePage,
})

function PublicHomePage() {
  const router = useRouter()
  const { currentUser } = Route.useLoaderData()
  const [searchResults, setSearchResults] = useState<{ outbound: FlightOption[]; returnOptions: FlightOption[]; tripType: "one-way" | "round-trip" } | null>(null)
  const [searchBusy, setSearchBusy] = useState(false)

  async function handleSearch(values: FlightSearchValues) {
    setSearchBusy(true)
    try {
      const result = await searchFlightsFn({ data: values })
      setSearchResults(result)
      if (!result.outbound.length) toast.message("No future flights matched those filters.")
    } finally {
      setSearchBusy(false)
    }
  }

  async function handleLogout() {
    const response = await logoutFn()
    toast.success("Signed out.")
    await router.invalidate()
    await router.navigate({ to: response.redirectTo })
  }

  return (
    <SiteShell
      active="public"
      currentUser={currentUser ? { displayName: currentUser.displayName, role: currentUser.role } : null}
      summary={
        <>
          <Metric label="Open search" value="Public" />
          <Metric label="Round trips" value="Supported" />
          <Metric label="Seat inventory" value="Live" />
          {currentUser ? (
            <Button className="w-full justify-center rounded-[14px] bg-white/8 text-white hover:bg-white/14" onClick={handleLogout} type="button" variant="outline">
              Log out
            </Button>
          ) : null}
        </>
      }
      title="Search future flights before you even sign in"
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
          <CardHeader>
            <CardTitle>Public flight discovery</CardTitle>
            <p className="text-sm leading-6 text-slate-500">
              Search by city or airport code, narrow by travel date, and compare direct future flights without exposing booking controls to anonymous visitors.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <FlightSearchPanel busy={searchBusy} onSubmit={handleSearch} />
            {searchResults ? (
              <div className="space-y-5">
                <section className="space-y-3">
                  <div className="text-sm font-medium text-slate-700">Outbound options</div>
                  <FlightResults emptyMessage="No outbound results matched that search." flights={searchResults.outbound} />
                </section>
                {searchResults.tripType === "round-trip" ? (
                  <section className="space-y-3">
                    <div className="text-sm font-medium text-slate-700">Return options</div>
                    <FlightResults emptyMessage="No return flights matched that search." flights={searchResults.returnOptions} />
                  </section>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[24px] border border-slate-200 bg-white shadow-none">
            <CardHeader>
              <CardTitle>How the system splits by role</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="rounded-[18px] border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-950">Customer surface</div>
                  <Badge className="rounded-full bg-blue-100 text-blue-700 hover:bg-blue-100" variant="secondary">Book & review</Badge>
                </div>
                <p className="mt-2 leading-6">Customers get booking, history, and past-flight rating tools — but no airline operations controls.</p>
              </div>
              <div className="rounded-[18px] border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-slate-950">Staff surface</div>
                  <Badge className="rounded-full bg-slate-100 text-slate-700 hover:bg-slate-100" variant="secondary">Operate</Badge>
                </div>
                <p className="mt-2 leading-6">Airline staff can manage flights, fleet, passengers, ratings, and sales reporting — all enforced on the server side.</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {currentUser ? (
                  <Link className="inline-flex h-9 items-center justify-center rounded-[14px] bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800" to={currentUser.role === "staff" ? "/staff" : "/customer"}>
                    Go to my home
                  </Link>
                ) : (
                  <>
                    <Link className="inline-flex h-9 items-center justify-center rounded-[14px] bg-slate-950 px-3 text-sm font-medium text-white transition-colors hover:bg-slate-800" to="/login">
                      Log in
                    </Link>
                    <Link className="inline-flex h-9 items-center justify-center rounded-[14px] border border-slate-200 px-3 text-sm font-medium text-slate-950 transition-colors hover:bg-slate-50" to="/register">
                      Register
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SiteShell>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/12 bg-white/6 p-4">
      <div className="text-sm text-white/70">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">{value}</div>
    </div>
  )
}

