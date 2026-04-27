"use client"

import createGlobe from "cobe"
import type { Marker, Arc } from "cobe"
import { useEffect, useRef, useMemo } from "react"

import { CountryFlag } from "@/components/country-flag"
import { cn } from "@/lib/utils"

type GlobeMarker = {
  countryCode: string
  id: string
  label: string
  location: [number, number]
}

type GlobeArc = {
  from: [number, number]
  to: [number, number]
}

type DialogGlobeProps = {
  arcs?: Array<GlobeArc>
  className?: string
  markers?: Array<GlobeMarker>
}

function locationToAngles(
  lat: number,
  lng: number
): [number, number] {
  return [
    Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
    (lat * Math.PI) / 180,
  ]
}

export function DialogGlobe({ arcs = [], className, markers = [] }: DialogGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number>(0)
  const phiRef = useRef(0)
  const thetaRef = useRef(0.15)

  // Refs so the animation loop always reads fresh values
  const markersRef = useRef(markers)
  markersRef.current = markers
  const arcsRef = useRef(arcs)
  arcsRef.current = arcs

  const isDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches

  // Compute focus target
  const target = useMemo(() => {
    if (markers.length === 0) return null
    const avgLat =
      markers.reduce((s, m) => s + m.location[0], 0) / markers.length
    const avgLng =
      markers.reduce((s, m) => s + m.location[1], 0) / markers.length
    const [phi, theta] = locationToAngles(avgLat, avgLng)
    return { phi, theta }
  }, [markers])

  const targetRef = useRef(target)
  targetRef.current = target

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const w = container.clientWidth
    canvas.width = w * 2
    canvas.height = w * 2
    canvas.style.width = `${w}px`
    canvas.style.height = `${w}px`

    const toCobeMarkers = (ms: GlobeMarker[]): Marker[] =>
      ms.map((m) => ({ location: m.location, size: 0, id: m.id }))

    const toCobeArcs = (as: GlobeArc[]): Arc[] =>
      as.map((a, i) => ({ from: a.from, to: a.to, id: `arc-${i}` }))

    const globe = createGlobe(canvas, {
      devicePixelRatio: 2,
      width: w * 2,
      height: w * 2,
      phi: phiRef.current,
      theta: thetaRef.current,
      dark: isDark ? 1 : 0,
      diffuse: 1.4,
      mapSamples: 16000,
      mapBrightness: isDark ? 2 : 6,
      mapBaseBrightness: isDark ? 0.1 : 0.05,
      baseColor: isDark ? [0.15, 0.18, 0.25] : [0.95, 0.95, 0.97],
      markerColor: isDark ? [0.4, 0.65, 1] : [0.1, 0.4, 1],
      glowColor: isDark ? [0.08, 0.1, 0.2] : [0.9, 0.9, 1],
      scale: 1.05,
      offset: [0, w * 0.15],
      markers: toCobeMarkers(markersRef.current),
      arcs: toCobeArcs(arcsRef.current),
      arcColor: isDark ? [0.4, 0.65, 1] : [0.1, 0.4, 1],
      arcWidth: 0.8,
      arcHeight: 0.35,
      markerElevation: 0.02,
    })

    function animate() {
      const t = targetRef.current

      if (t) {
        phiRef.current += (t.phi - phiRef.current) * 0.08
        thetaRef.current += (t.theta - thetaRef.current) * 0.08
      } else {
        phiRef.current += 0.004
      }

      globe.update({
        phi: phiRef.current,
        theta: thetaRef.current,
        markers: toCobeMarkers(markersRef.current),
        arcs: toCobeArcs(arcsRef.current),
      })

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      globe.destroy()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDark])

  return (
    <div className={cn("relative", className)}>
      <div
        ref={containerRef}
        className="relative aspect-[2/1] w-full overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-popover to-transparent" />
        {/* Pin labels anchored to marker coordinates via cobe v2 CSS anchor vars */}
        {markers.map((m) => (
          <div
            key={m.id}
            className="pointer-events-none absolute flex flex-col items-center gap-0.5"
            style={
              {
                positionAnchor: `--cobe-${m.id}`,
                bottom: "anchor(top)",
                left: "anchor(center)",
                translate: "-50% 0",
                opacity: `var(--cobe-visible-${m.id}, 0)`,
                filter: `blur(calc((1 - var(--cobe-visible-${m.id}, 0)) * 4px))`,
                transition: "opacity 0.3s, filter 0.3s",
              } as React.CSSProperties
            }
          >
            <span className="whitespace-nowrap rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium leading-tight text-foreground shadow-md ring-1 ring-border/40 backdrop-blur-sm">
              {m.label}
            </span>
            <span className="h-1.5 w-px bg-foreground/50" />
            <CountryFlag countryCode={m.countryCode} size={18} className="drop-shadow-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
