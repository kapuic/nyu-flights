import { QueryClient } from "@tanstack/react-query"

let browserQueryClient: QueryClient | null = null

const QUERY_DEFAULTS = {
  staleTime: 30_000,
  gcTime: 10 * 60_000,
  refetchOnReconnect: false,
  refetchOnWindowFocus: false,
}

export function getQueryClient() {
  if (typeof window === "undefined")
    return new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })

  if (!browserQueryClient)
    browserQueryClient = new QueryClient({
      defaultOptions: { queries: QUERY_DEFAULTS },
    })

  return browserQueryClient
}
