import { useCallback, useMemo } from "react"
import { Outlet, createFileRoute, useNavigate, useRouter } from "@tanstack/react-router"
import { toast } from "sonner"

import { GlobeBackground } from "@/components/globe-background"
import type { CameraState } from "@/components/globe-background"
import { AppNavbar } from "@/components/app-navbar"
import { AuthModal } from "@/components/auth-modal"
import { useBookingStore } from "@/lib/booking-store"
import { getCurrentUserFn } from "@/lib/auth"
import { listGlobeRoutesFn } from "@/lib/queries"
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

      <div className="sticky top-0 z-20">
        <AppNavbar activeTab="search" currentUser={currentUser} />
      </div>

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
