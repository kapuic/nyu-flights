import { formatDateTimeMedium, formatPlainDate } from "@/lib/temporal"

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    currency: "USD",
    style: "currency",
  }).format(value)
}

export function formatDateTime(value: string) {
  return formatDateTimeMedium(value)
}

export function formatDate(value: string) {
  return formatPlainDate(value)
}

export function titleCaseStatus(status: string) {
  return status.replaceAll("_", " ")
}
