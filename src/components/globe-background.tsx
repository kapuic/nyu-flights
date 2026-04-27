"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { GlobeMethods } from "react-globe.gl"

import airportCoordinates from "@/data/airport-coordinates.json"
import type { GlobeRoute } from "@/lib/queries"

type ArcDatum = {
  endLat: number
  endLng: number
  opacity: number
  startLat: number
  startLng: number
}

type RingDatum = {
  lat: number
  lng: number
}

export type CameraState =
  | { type: "idle" }
  | { type: "origin-focus"; lat: number; lng: number }
  | {
      type: "route-focus"
      originLat: number
      originLng: number
      destLat: number
      destLng: number
    }

type GlobeBackgroundProps = {
  camera: CameraState
  resultRoutes?: Array<{ departureCode: string; arrivalCode: string }>
  routes: Array<GlobeRoute>
}

type GlobeComponentType = (typeof import("react-globe.gl"))["default"]

const coords = airportCoordinates as Record<
  string,
  { lat: number; lng: number; name: string; city: string }
>

const AMBIENT_ARC_COUNT = 5
const ARC_FLIGHT_TIME = 3000
const ARC_FADE_TIME = 800

function getCoords(code: string) {
  return coords[code.trim().toUpperCase()] ?? null
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI
}

function midpoint(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): { lat: number; lng: number } {
  const φ1 = toRadians(lat1)
  const λ1 = toRadians(lng1)
  const φ2 = toRadians(lat2)
  const λ2 = toRadians(lng2)
  const bx = Math.cos(φ2) * Math.cos(λ2 - λ1)
  const by = Math.cos(φ2) * Math.sin(λ2 - λ1)
  const φ3 = Math.atan2(
    Math.sin(φ1) + Math.sin(φ2),
    Math.sqrt((Math.cos(φ1) + bx) ** 2 + by ** 2)
  )
  const λ3 = λ1 + Math.atan2(by, Math.cos(φ1) + bx)

  return { lat: toDegrees(φ3), lng: ((toDegrees(λ3) + 540) % 360) - 180 }
}

function sphericalDistanceDegrees(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lng2 - lng1)
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return toDegrees(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

function altitudeForPair(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const span = sphericalDistanceDegrees(lat1, lng1, lat2, lng2)
  if (span < 20) return 1.2
  if (span < 60) return 1.8
  return 2.5
}

export function GlobeBackground({
  camera,
  resultRoutes,
  routes,
}: GlobeBackgroundProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined)
  const [GlobeComponent, setGlobeComponent] = useState<GlobeComponentType | null>(null)
  const [globeLoadFailed, setGlobeLoadFailed] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const ambientTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const ambientRunning = useRef(false)
  const [ambientArcs, setAmbientArcs] = useState<Array<ArcDatum>>([])
  const [focusRings, setFocusRings] = useState<Array<RingDatum>>([])
  const globeOffsetAnimRef = useRef<number | null>(null)
  const idleGlobeOffsetY = Math.round(dimensions.height * 0.75)
  const [globeOffsetY, setGlobeOffsetY] = useState(0)
  const globeOffsetYRef = useRef(0)

  const initialOffsetApplied = useRef(false)
  useLayoutEffect(() => {
    if (!initialOffsetApplied.current && dimensions.height > 0 && camera.type === "idle") {
      initialOffsetApplied.current = true
      globeOffsetYRef.current = idleGlobeOffsetY
      setGlobeOffsetY(idleGlobeOffsetY)
    }
  }, [dimensions.height, camera.type, idleGlobeOffsetY])

  useEffect(() => {
    return () => {
      ambientTimers.current.forEach(clearTimeout)
      ambientTimers.current.clear()
      if (globeOffsetAnimRef.current !== null) cancelAnimationFrame(globeOffsetAnimRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined

    function loadGlobe() {
      import("react-globe.gl")
        .then((mod) => {
          if (cancelled) return
          setGlobeLoadFailed(false)
          setGlobeComponent(() => mod.default)
        })
        .catch(() => {
          if (cancelled) return
          setGlobeLoadFailed(true)
          retryTimer = setTimeout(loadGlobe, 1500)
        })
    }

    loadGlobe()

    return () => {
      cancelled = true
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const updateDimensions = () => {
      const rect = el.getBoundingClientRect()
      setDimensions((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height }
      )
    }

    updateDimensions()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateDimensions)
      return () => window.removeEventListener("resize", updateDimensions)
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect
      setDimensions((current) =>
        current.width === width && current.height === height
          ? current
          : { width, height }
      )
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cameraLat = camera.type === "origin-focus" ? camera.lat : undefined
  const cameraLng = camera.type === "origin-focus" ? camera.lng : undefined
  const cameraOriginLat = camera.type === "route-focus" ? camera.originLat : undefined
  const cameraOriginLng = camera.type === "route-focus" ? camera.originLng : undefined
  const cameraDestLat = camera.type === "route-focus" ? camera.destLat : undefined
  const cameraDestLng = camera.type === "route-focus" ? camera.destLng : undefined
  const globeReady = !!GlobeComponent && dimensions.width > 0 && dimensions.height > 0

  useEffect(() => {
    const target = camera.type === "idle" ? idleGlobeOffsetY : 0
    const start = globeOffsetYRef.current
    if (Math.abs(target - start) < 1) return

    if (globeOffsetAnimRef.current !== null) cancelAnimationFrame(globeOffsetAnimRef.current)

    const startTime = performance.now()
    const duration = 1200

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - (1 - t) ** 3
      const current = Math.round(start + (target - start) * eased)
      globeOffsetYRef.current = current
      setGlobeOffsetY(current)

      if (t < 1) {
        globeOffsetAnimRef.current = requestAnimationFrame(tick)
        return
      }

      globeOffsetAnimRef.current = null
    }

    globeOffsetAnimRef.current = requestAnimationFrame(tick)
    return () => {
      if (globeOffsetAnimRef.current !== null) cancelAnimationFrame(globeOffsetAnimRef.current)
    }
  }, [camera.type, idleGlobeOffsetY])

  const validRoutes = useMemo(() => {
    return routes.filter(
      (route) => getCoords(route.departureCode) && getCoords(route.arrivalCode)
    )
  }, [routes])

  const stopAmbientCycle = useCallback(() => {
    ambientRunning.current = false
    ambientTimers.current.forEach(clearTimeout)
    ambientTimers.current.clear()
  }, [])

  const registerAmbientTimer = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      ambientTimers.current.delete(timer)
      callback()
    }, delay)
    ambientTimers.current.add(timer)
  }, [])

  const startAmbientCycle = useCallback(() => {
    if (validRoutes.length === 0) return
    if (ambientRunning.current) return

    ambientRunning.current = true
    ambientTimers.current.forEach(clearTimeout)
    ambientTimers.current.clear()

    const pickRandom = () => validRoutes[Math.floor(Math.random() * validRoutes.length)]

    const spawnArc = () => {
      if (!ambientRunning.current) return
      const route = pickRandom()
      const dep = getCoords(route.departureCode)
      const arr = getCoords(route.arrivalCode)
      if (!dep || !arr) return

      const arc: ArcDatum = {
        startLat: dep.lat,
        startLng: dep.lng,
        endLat: arr.lat,
        endLng: arr.lng,
        opacity: 0.35,
      }

      setAmbientArcs((prev) => {
        const next = [...prev, arc]
        return next.length > AMBIENT_ARC_COUNT
          ? next.slice(next.length - AMBIENT_ARC_COUNT)
          : next
      })

      registerAmbientTimer(() => {
        setAmbientArcs((prev) => prev.filter((currentArc) => currentArc !== arc))
      }, ARC_FLIGHT_TIME + ARC_FADE_TIME)

      registerAmbientTimer(spawnArc, ARC_FLIGHT_TIME / AMBIENT_ARC_COUNT)
    }

    for (let i = 0; i < Math.min(AMBIENT_ARC_COUNT, validRoutes.length); i++) {
      const delay = (ARC_FLIGHT_TIME / AMBIENT_ARC_COUNT) * i
      registerAmbientTimer(spawnArc, delay)
    }
  }, [registerAmbientTimer, validRoutes])

  useEffect(() => {
    if (!globeReady || camera.type !== "idle" || validRoutes.length === 0) {
      stopAmbientCycle()
      setAmbientArcs([])
      return
    }

    stopAmbientCycle()
    setAmbientArcs([])
    startAmbientCycle()
  }, [globeReady, camera.type, startAmbientCycle, stopAmbientCycle, validRoutes.length])

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return
    const controls = globe.controls()

    if (camera.type === "idle") {
      if (controls) {
        controls.autoRotate = true
        controls.autoRotateSpeed = 0.3
      }
      globe.pointOfView({ lat: 20, lng: 0, altitude: 0.65 }, 1200)
      setFocusRings([])
      return
    }

    if (camera.type === "origin-focus") {
      if (controls) {
        controls.autoRotate = false
        controls.update()
      }
      stopAmbientCycle()
      setAmbientArcs([])
      globe.pointOfView({ lat: camera.lat, lng: camera.lng, altitude: 1.0 }, 1200)
      setFocusRings([{ lat: camera.lat, lng: camera.lng }])
      return
    }

    if (camera.type === "route-focus") {
      if (controls) {
        controls.autoRotate = false
        controls.update()
      }
      stopAmbientCycle()
      setAmbientArcs([])
      const mid = midpoint(
        camera.originLat,
        camera.originLng,
        camera.destLat,
        camera.destLng
      )
      const alt = altitudeForPair(
        camera.originLat,
        camera.originLng,
        camera.destLat,
        camera.destLng
      )
      globe.pointOfView({ lat: mid.lat, lng: mid.lng, altitude: alt }, 1200)
      setFocusRings([
        { lat: camera.originLat, lng: camera.originLng },
        { lat: camera.destLat, lng: camera.destLng },
      ])
    }
  }, [
    camera.type,
    cameraLat,
    cameraLng,
    cameraOriginLat,
    cameraOriginLng,
    cameraDestLat,
    cameraDestLng,
    globeReady,
    stopAmbientCycle,
  ])

  const resultArcs = useMemo<Array<ArcDatum>>(() => {
    if (!resultRoutes || resultRoutes.length === 0) return []
    return resultRoutes
      .map((route) => {
        const dep = getCoords(route.departureCode)
        const arr = getCoords(route.arrivalCode)
        if (!dep || !arr) return null
        return {
          startLat: dep.lat,
          startLng: dep.lng,
          endLat: arr.lat,
          endLng: arr.lng,
          opacity: 0.5,
        }
      })
      .filter(Boolean) as Array<ArcDatum>
  }, [resultRoutes])

  const allArcs = camera.type === "idle" ? ambientArcs : resultArcs

  const routeFocusArcs = useMemo<Array<ArcDatum>>(() => {
    if (camera.type !== "route-focus") return []
    return [
      {
        startLat: camera.originLat,
        startLng: camera.originLng,
        endLat: camera.destLat,
        endLng: camera.destLng,
        opacity: 0.6,
      },
    ]
  }, [camera.type, cameraOriginLat, cameraOriginLng, cameraDestLat, cameraDestLng])

  const displayArcs = camera.type === "route-focus" ? routeFocusArcs : allArcs

  if (!GlobeComponent || globeLoadFailed) {
    return (
      <div
        ref={containerRef}
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 120%, rgba(15,23,42,0.3) 0%, rgba(0,0,0,1) 70%)",
        }}
      />
    )
  }

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0"
    >
      <div className="absolute inset-0">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <GlobeComponent
            ref={globeRef}
            animateIn={false}
            width={dimensions.width}
            height={dimensions.height}
            globeOffset={[0, globeOffsetY]}
            globeImageUrl="/textures/earth-night.jpg"
            backgroundColor="rgba(0,0,0,0)"
            atmosphereColor="rgba(100,150,255,0.15)"
            atmosphereAltitude={0.2}
            arcsData={displayArcs}
            arcStartLat="startLat"
            arcStartLng="startLng"
            arcEndLat="endLat"
            arcEndLng="endLng"
            arcColor={(datum: object) =>
              `rgba(255, 255, 255, ${(datum as ArcDatum).opacity})`}
            arcDashLength={0.4}
            arcDashGap={0.2}
            arcDashInitialGap={() => Math.random()}
            arcDashAnimateTime={ARC_FLIGHT_TIME}
            arcStroke={0.5}
            arcsTransitionDuration={0}
            ringsData={focusRings}
            ringLat="lat"
            ringLng="lng"
            ringColor={() => (t: number) =>
              `rgba(100, 200, 255, ${0.8 * (1 - t)})`}
            ringMaxRadius={5}
            ringPropagationSpeed={3}
            ringRepeatPeriod={1200}
            ringResolution={64}
            ringAltitude={0.015}
            pointsData={focusRings}
            pointLat="lat"
            pointLng="lng"
            pointColor={() => "rgba(100, 200, 255, 1)"}
            pointRadius={1}
            pointAltitude={0.02}
          />
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
    </div>
  )
}

