import { useCallback, useMemo } from "react"
import { Link, Outlet, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { User } from "lucide-react"
import { toast } from "sonner"

import { GlobeBackground } from "@/components/globe-background"
import type { CameraState } from "@/components/globe-background"
import { AuthModal } from "@/components/auth-modal"
import { useBookingStore } from "@/lib/booking-store"
import { getCurrentUserFn } from "@/lib/auth"
import { listGlobeRoutesFn } from "@/lib/queries"
import { APP_NAME } from "@/lib/app-config"
import airportCoordinates from "@/data/airport-coordinates.json"

const coords = airportCoordinates as Record<
  string,
  { lat: number; lng: number }
>

export const Route = createFileRoute("/_globe")({
  loader: async () => {
    const [currentUser, routes] = await Promise.all([
      getCurrentUserFn(),
      listGlobeRoutesFn(),
    ])
    return { currentUser, routes }
  },
  component: GlobeLayout,
})

function GlobeLayout() {
  const { currentUser, routes } = Route.useLoaderData()
  const router = useRouter()
  const navigate = useNavigate()
  const searchFrom = useBookingStore((s) => s.searchFrom)
  const searchTo = useBookingStore((s) => s.searchTo)
  const resultRoutes = useBookingStore((s) => s.resultRoutes)
  const showAuthModal = useBookingStore((s) => s.showAuthModal)
  const setShowAuthModal = useBookingStore((s) => s.setShowAuthModal)
  const selectedOutbound = useBookingStore((s) => s.selectedOutbound)

  const camera = useMemo<CameraState>(() => {
    const fc = searchFrom ? coords[searchFrom.code] : null
    const tc = searchTo ? coords[searchTo.code] : null

    if (fc && tc) {
      return {
        type: "route-focus",
        originLat: fc.lat,
        originLng: fc.lng,
        destLat: tc.lat,
        destLng: tc.lng,
      }
    }
    if (fc) return { type: "origin-focus", lat: fc.lat, lng: fc.lng }
    if (tc) return { type: "origin-focus", lat: tc.lat, lng: tc.lng }
    return { type: "idle" }
  }, [searchFrom, searchTo])

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false)
    toast.success("Signed in — continuing to checkout.")
    void router.invalidate().then(() => {
      if (selectedOutbound) {
        void navigate({ to: "/checkout" })
      }
    })
  }, [setShowAuthModal, router, navigate, selectedOutbound])

  return (
    <div className="dark relative min-h-screen bg-black text-white">
      <GlobeBackground
        camera={camera}
        routes={routes}
        resultRoutes={resultRoutes.length > 0 ? resultRoutes : undefined}
      />

      {/* Navbar */}
      <nav className="relative z-20 flex items-center justify-between px-6 py-4">
        <Link
          to="/"
          className="text-lg font-semibold tracking-tight text-white"
        >
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-md">
          <Link
            to="/"
            className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium text-white"
          >
            Search
          </Link>
          {currentUser ? (
            <Link
              to="/customer"
              className="rounded-full px-4 py-1.5 text-sm text-white/50 transition-colors hover:text-white/80"
            >
              Trips
            </Link>
          ) : null}
        </div>

        <div>
          {currentUser ? (
            <div className="flex size-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.06]">
              <User className="size-4 text-white/60" />
            </div>
          ) : (
            <Link
              to="/login"
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>

      <Outlet />

      {/* Auth modal — triggered when unauthed user tries to book */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        onSuccess={handleAuthSuccess}
      />
    </div>
  )
}
