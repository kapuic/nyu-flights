import { ArrowRight, Clock, Plane, Star } from "lucide-react"

import type { FlightOption } from "@/lib/queries"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/utils"

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatDuration(departure: string, arrival: string) {
  const diff = new Date(arrival).getTime() - new Date(departure).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes}m`
}

type FlightResultCardProps = {
  flight: FlightOption
  index: number
  onBook?: (flight: FlightOption) => void
}

export function FlightResultCard({
  flight,
  index,
  onBook,
}: FlightResultCardProps) {
  return (
    <div
      className="group rounded-xl border border-white/[0.08] bg-white/[0.04] p-5 backdrop-blur-sm transition-colors hover:border-white/15 hover:bg-white/[0.06]"
      style={{
        animationDelay: `${index * 60}ms`,
        animationDuration: "400ms",
        animationFillMode: "both",
        animationName: "card-enter",
        animationTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plane className="size-3.5 text-white/40" />
          <span className="text-xs font-medium tracking-wide text-white/50 uppercase">
            {flight.flightNumber}
          </span>
          <span className="text-xs text-white/30">·</span>
          <span className="text-xs text-white/40">{flight.airlineName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={cn(
              "size-1.5 rounded-full",
              flight.status === "on_time" ? "bg-emerald-400" : "bg-amber-400"
            )}
          />
          <span className="text-xs text-white/50">
            {flight.status === "on_time" ? "On Time" : "Delayed"}
          </span>
        </div>
      </div>

      {/* Route */}
      <div className="mb-4 flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold tracking-tight text-white">
            {flight.departureAirportCode}
          </div>
          <div className="truncate text-xs text-white/40">
            {flight.departureCity}
          </div>
          <div className="mt-0.5 text-sm text-white/70">
            {formatTime(flight.departureDatetime)}
          </div>
        </div>

        <div className="flex flex-col items-center gap-1 px-2">
          <div className="flex items-center gap-1 text-xs text-white/30">
            <Clock className="size-3" />
            {formatDuration(flight.departureDatetime, flight.arrivalDatetime)}
          </div>
          <div className="flex w-24 items-center gap-1">
            <div className="h-px flex-1 bg-white/15" />
            <ArrowRight className="size-3 text-white/30" />
          </div>
        </div>

        <div className="min-w-0 flex-1 text-right">
          <div className="text-lg font-semibold tracking-tight text-white">
            {flight.arrivalAirportCode}
          </div>
          <div className="truncate text-xs text-white/40">
            {flight.arrivalCity}
          </div>
          <div className="mt-0.5 text-sm text-white/70">
            {formatTime(flight.arrivalDatetime)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold text-white">
            {formatCurrency(flight.basePrice)}
          </div>
          {flight.averageRating !== null && (
            <div className="flex items-center gap-1 text-xs text-white/40">
              <Star className="size-3 fill-white/40 text-white/40" />
              {flight.averageRating}
              <span className="text-white/25">({flight.reviewCount})</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            {flight.availableSeats} seat{flight.availableSeats !== 1 ? "s" : ""}{" "}
            left
          </span>
          {onBook && (
            <button
              type="button"
              onClick={() => onBook(flight)}
              className="rounded-lg border border-white/10 bg-white/[0.08] px-4 py-1.5 text-sm font-medium text-white transition-all hover:bg-white/15 active:scale-[0.97]"
            >
              Book
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

