"use client"

import { getData as getCountries } from "country-list"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  getAirportDisplayValue,
  getAirportSearchValue,
  getFlagEmoji,
} from "@/lib/airports"
import type { AirportOption } from "@/lib/airports"
import { cn } from "@/lib/utils"

type AirportComboboxFieldProps = {
  className?: string
  inputClassName?: string
  items: Array<AirportOption>
  onBlur?: () => void
  onChange: (value: string, airport: AirportOption | null) => void
  placeholder?: string
  value: string
}

export function AirportComboboxField({
  className,
  inputClassName,
  items,
  onBlur,
  onChange,
  placeholder = "Search airports",
  value,
}: AirportComboboxFieldProps) {
  const selectedAirport =
    items.find((airport) => airport.code === value.trim().toUpperCase()) ?? null

  return (
    <Combobox
      items={items}
      value={selectedAirport}
      itemToStringValue={getAirportSearchValue}
      onValueChange={(airport) => {
        onChange(airport?.code ?? "", airport ?? null)
        onBlur?.()
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        showClear
        className={cn("w-full", inputClassName)}
      />
      <ComboboxContent className={className}>
        <ComboboxEmpty>No airports found.</ComboboxEmpty>
        <ComboboxList>
          {(airport) => (
            <ComboboxItem key={airport.code} value={airport}>
              <span aria-hidden className="shrink-0 text-base leading-none">
                {getFlagEmoji(airport.countryCode)}
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {getAirportDisplayValue(airport)}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {airport.name} · {airport.country}
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

type AirplaneComboboxItem = {
  airplaneId: string
  manufacturingCompany?: string
  numberOfSeats: number
}

type AirplaneComboboxFieldProps = {
  items: Array<AirplaneComboboxItem>
  onBlur?: () => void
  onChange: (value: string, airplane: AirplaneComboboxItem | null) => void
  placeholder?: string
  value: string
}

export function AirplaneComboboxField({
  items,
  onBlur,
  onChange,
  placeholder = "Search airplanes",
  value,
}: AirplaneComboboxFieldProps) {
  const selectedAirplane =
    items.find((airplane) => airplane.airplaneId === value) ?? null

  return (
    <Combobox
      items={items}
      value={selectedAirplane}
      itemToStringValue={(airplane) =>
        `${airplane.airplaneId} ${airplane.manufacturingCompany ?? ""} ${airplane.numberOfSeats} seats`
      }
      onValueChange={(airplane) => {
        onChange(airplane?.airplaneId ?? "", airplane ?? null)
        onBlur?.()
      }}
    >
      <ComboboxInput placeholder={placeholder} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No airplanes found.</ComboboxEmpty>
        <ComboboxList>
          {(airplane) => (
            <ComboboxItem key={airplane.airplaneId} value={airplane}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">
                  {airplane.airplaneId}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {airplane.manufacturingCompany
                    ? `${airplane.manufacturingCompany} · `
                    : ""}
                  {airplane.numberOfSeats} seats
                </span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}

type CountryOption = {
  code: string
  label: string
  flag: string
}

const COUNTRY_OPTIONS: Array<CountryOption> = getCountries()
  .map((country) => ({
    code: country.code,
    label: country.name,
    flag: getFlagEmoji(country.code),
  }))
  .sort((left, right) => left.label.localeCompare(right.label))

type CountryComboboxFieldProps = {
  onBlur?: () => void
  onChange: (value: string, country: CountryOption | null) => void
  placeholder?: string
  value: string
}

export function CountryComboboxField({
  onBlur,
  onChange,
  placeholder = "Search countries",
  value,
}: CountryComboboxFieldProps) {
  const selectedCountry =
    COUNTRY_OPTIONS.find(
      (country) => country.label === value || country.code === value
    ) ?? null

  return (
    <Combobox
      items={COUNTRY_OPTIONS}
      value={selectedCountry}
      itemToStringValue={(country) => `${country.label} ${country.code}`}
      onValueChange={(country) => {
        onChange(country?.label ?? "", country ?? null)
        onBlur?.()
      }}
    >
      <ComboboxInput placeholder={placeholder} showClear className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>No countries found.</ComboboxEmpty>
        <ComboboxList>
          {(country) => (
            <ComboboxItem key={country.code} value={country}>
              <span aria-hidden className="shrink-0 text-base leading-none">
                {country.flag}
              </span>
              <span className="truncate">{country.label}</span>
              <span className="text-xs text-muted-foreground">
                {country.code}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
