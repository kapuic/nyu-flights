import airportCoordinates from "@/data/airport-coordinates.json"

export type AirportOption = {
  city: string
  code: string
  country: string
  countryCode: string
  lat: number
  lng: number
  name: string
}

type AirportCoordinateEntry = Omit<AirportOption, "code">

const airportEntries = airportCoordinates as Record<
  string,
  AirportCoordinateEntry
>

export const REAL_AIRPORT_OPTIONS: Array<AirportOption> = Object.entries(
  airportEntries
)
  .map(([code, airport]) => ({ code, ...airport }))
  .sort((left, right) => left.code.localeCompare(right.code))

export const REAL_AIRPORT_CODES = new Set(
  REAL_AIRPORT_OPTIONS.map((airport) => airport.code)
)

export function getAirportOption(code: string) {
  return REAL_AIRPORT_OPTIONS.find(
    (airport) => airport.code === code.trim().toUpperCase()
  )
}



export function getAirportSearchValue(airport: AirportOption) {
  return `${airport.code} ${airport.city} ${airport.name} ${airport.country}`
}

export function getAirportDisplayValue(
  airport: Pick<AirportOption, "city" | "code">
) {
  return `${airport.city} (${airport.code})`
}
