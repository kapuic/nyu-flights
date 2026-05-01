import { ArrowRight, Clock, Star } from "lucide-react";

import type { FlightOption } from "@/lib/queries";
import { CountryFlag } from "@/components/country-flag";
import { formatCurrency } from "@/lib/format";
import { formatShortDate, formatTime, getFlightDuration } from "@/lib/temporal";

function formatDuration(departure: string, arrival: string) {
  const dur = getFlightDuration(departure, arrival);
  return `${dur.hours}h ${dur.minutes}m`;
}

type FlightResultCardProps = {
  flight: FlightOption;
  index: number;
  onBook?: (flight: FlightOption) => void;
};

export function FlightResultCard({ flight, index, onBook }: FlightResultCardProps) {
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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <CountryFlag countryCode={flight.departureCountryCode} size={18} />
            <div className="text-lg font-semibold tracking-tight text-white">
              {flight.departureAirportCode}
            </div>
          </div>
          <div className="truncate text-xs text-white/40">{flight.departureCity}</div>
          <div className="mt-0.5 text-sm text-white/70">
            <span className="text-xs text-white/30">
              {formatShortDate(flight.departureDatetime)}
            </span>{" "}
            {formatTime(flight.departureDatetime)}
          </div>
        </div>

        <div className="shrink-0 pt-0.5 text-right font-mono text-xs font-medium tracking-tight text-white/45">
          {flight.flightNumber}
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
          <div className="flex items-center justify-end gap-2">
            <div className="text-lg font-semibold tracking-tight text-white">
              {flight.arrivalAirportCode}
            </div>
            <CountryFlag countryCode={flight.arrivalCountryCode} size={18} />
          </div>
          <div className="truncate text-xs text-white/40">{flight.arrivalCity}</div>
          <div className="mt-0.5 text-sm text-white/70">
            <span className="text-xs text-white/30">{formatShortDate(flight.arrivalDatetime)}</span>{" "}
            {formatTime(flight.arrivalDatetime)}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div className="text-xl font-semibold text-white">{formatCurrency(flight.basePrice)}</div>
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
            {flight.availableSeats} seat{flight.availableSeats !== 1 ? "s" : ""} left
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
  );
}
