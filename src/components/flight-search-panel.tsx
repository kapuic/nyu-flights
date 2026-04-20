import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export type FlightSearchValues = {
  departureDate: string
  destination: string
  returnDate: string
  source: string
  tripType: "one-way" | "round-trip"
}

type FlightSearchPanelProps = {
  busy?: boolean
  defaultValues?: Partial<FlightSearchValues>
  onSubmit: (values: FlightSearchValues) => Promise<void> | void
}

export function FlightSearchPanel({ busy, defaultValues, onSubmit }: FlightSearchPanelProps) {
  const [values, setValues] = useState<FlightSearchValues>({
    departureDate: defaultValues?.departureDate ?? "",
    destination: defaultValues?.destination ?? "",
    returnDate: defaultValues?.returnDate ?? "",
    source: defaultValues?.source ?? "",
    tripType: defaultValues?.tripType ?? "one-way",
  })

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit(values)
  }

  return (
    <form className="grid gap-4 rounded-[24px] border border-slate-200 bg-slate-50/70 p-4" onSubmit={handleSubmit}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[140px_1fr_1fr_190px_190px_auto] xl:items-end">
        <div className="space-y-2">
          <Label htmlFor="tripType">Trip</Label>
          <Select
            onValueChange={(value) => setValues((current) => ({ ...current, tripType: value as FlightSearchValues["tripType"] }))}
            value={values.tripType}
          >
            <SelectTrigger className="w-full" id="tripType">
              <SelectValue placeholder="Trip type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-way">One way</SelectItem>
              <SelectItem value="round-trip">Round trip</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="source">From</Label>
          <Input
            id="source"
            onChange={(event) => setValues((current) => ({ ...current, source: event.target.value }))}
            placeholder="City or airport code"
            value={values.source}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="destination">To</Label>
          <Input
            id="destination"
            onChange={(event) => setValues((current) => ({ ...current, destination: event.target.value }))}
            placeholder="City or airport code"
            value={values.destination}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="departureDate">Departure</Label>
          <Input
            id="departureDate"
            onChange={(event) => setValues((current) => ({ ...current, departureDate: event.target.value }))}
            type="date"
            value={values.departureDate}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="returnDate">Return</Label>
          <Input
            disabled={values.tripType !== "round-trip"}
            id="returnDate"
            onChange={(event) => setValues((current) => ({ ...current, returnDate: event.target.value }))}
            type="date"
            value={values.returnDate}
          />
        </div>
        <Button className="h-10 rounded-[14px] bg-slate-950 text-white hover:bg-slate-800" disabled={busy} type="submit">
          {busy ? "Searching…" : "Search flights"}
        </Button>
      </div>
    </form>
  )
}
