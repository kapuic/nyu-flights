import { CircleFlag } from "react-circle-flags"

const cdnUrl = "/flags/"

type CountryFlagProps = {
  className?: string
  countryCode: string
  size?: number
}

export function CountryFlag({
  className,
  countryCode,
  size = 16,
}: CountryFlagProps) {
  if (!countryCode || !/^[A-Z]{2}$/i.test(countryCode)) return null

  return (
    <CircleFlag
      cdnUrl={cdnUrl}
      className={className}
      countryCode={countryCode.toLowerCase()}
      height={size}
      width={size}
    />
  )
}
