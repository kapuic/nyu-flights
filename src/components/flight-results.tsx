import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency, formatDateTime, titleCaseStatus } from "@/lib/format"
import type { FlightOption } from "@/lib/queries"

type FlightResultsProps = {
  emptyMessage: string
  flights: FlightOption[]
  onChoose?: (flight: FlightOption) => void
}

export function FlightResults({ emptyMessage, flights, onChoose }: FlightResultsProps) {
  if (!flights.length) {
    return (
      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {flights.map((flight) => (
        <Card className="rounded-[22px] border border-slate-200 bg-white shadow-none" key={`${flight.airlineName}-${flight.flightNumber}-${flight.departureDatetime}`}>
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{flight.flightNumber}</CardTitle>
              <Badge className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700 hover:bg-blue-100" variant="secondary">
                {flight.airlineName}
              </Badge>
              <Badge className="rounded-full border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-700 hover:bg-slate-100" variant="outline">
                {titleCaseStatus(flight.status)}
              </Badge>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <div>
                <div className="font-medium text-slate-950">{flight.departureAirportName}</div>
                <div>{formatDateTime(flight.departureDatetime)}</div>
              </div>
              <div className="text-center text-xs uppercase tracking-[0.18em] text-slate-400">Direct</div>
              <div className="sm:text-right">
                <div className="font-medium text-slate-950">{flight.arrivalAirportName}</div>
                <div>{formatDateTime(flight.arrivalDatetime)}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Price</div>
                <div className="mt-1 font-medium text-slate-950">{formatCurrency(flight.basePrice)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Seats left</div>
                <div className="mt-1 font-medium text-slate-950">{flight.availableSeats}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Ratings</div>
                <div className="mt-1 font-medium text-slate-950">
                  {flight.averageRating ? `${flight.averageRating.toFixed(1)} / 5` : "No ratings yet"}
                </div>
              </div>
            </div>
            {onChoose ? (
              <Button className="rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={flight.availableSeats <= 0} onClick={() => onChoose(flight)} type="button">
                {flight.availableSeats <= 0 ? "Sold out" : "Use this flight"}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
