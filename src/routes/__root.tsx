import type { QueryClient } from "@tanstack/react-query"
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router"
import { QueryClientProvider } from "@tanstack/react-query"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { ThemeProvider } from "next-themes"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import { useEffect } from "react"
import {
  AlertTriangle,
  DatabaseZap,
  FileQuestion,
  Home,
  RefreshCw,
} from "lucide-react"

import appCss from "../styles.css?url"
import type { AuthUser } from "@/lib/auth"
import { Toaster } from "@/components/ui/sonner"
import { getCurrentUserFn } from "@/lib/auth"
import { APP_NAME } from "@/lib/app-config"
import { getQueryClient } from "@/lib/query-client"

type RouterContext = {
  currentUser: AuthUser | null
  queryClient: QueryClient
}

const queryClient = getQueryClient()

const themeBootScript = `(() => {
  const storageKey = "part3-theme"
  const fallback = "system"
  const root = document.documentElement
  const storedTheme = localStorage.getItem(storageKey) || fallback
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  const resolvedTheme = storedTheme === "system" ? systemTheme : storedTheme
  root.classList.remove("light", "dark")
  root.classList.add(resolvedTheme)
  root.dataset.theme = storedTheme
  root.style.colorScheme = resolvedTheme
})()`

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => ({
    currentUser: await getCurrentUserFn(),
  }),
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "theme-color",
        content: "#0f172a",
      },
      {
        name: "apple-mobile-web-app-capable",
        content: "yes",
      },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      {
        name: "apple-mobile-web-app-title",
        content: APP_NAME,
      },
      {
        title: APP_NAME,
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "manifest",
        href: "/manifest.json",
      },
      {
        rel: "apple-touch-icon",
        href: "/logo192.png",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RootErrorPage,
})

function RootComponent() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    if (import.meta.env.DEV) {
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister()
        }
      })
      return
    }

    let isRefreshing = false
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (isRefreshing) return
      isRefreshing = true
      window.location.reload()
    })

    void navigator.serviceWorker.register("/sw.js")
  }, [])

  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  )
}


function isDbConnectionError(error: Error): boolean {
  const msg = error.message.toLowerCase()
  return (
    msg.includes("econnrefused") ||
    msg.includes("connection refused") ||
    msg.includes("connect etimedout") ||
    msg.includes("database") ||
    msg.includes("postgres") ||
    msg.includes("pg_hba")
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <FileQuestion className="size-16 text-muted-foreground/40" />
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">404</h1>
        <p className="text-lg text-muted-foreground">
          This page doesn't exist.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        <Home className="size-4" />
        Back to Home
      </Link>
    </div>
  )
}

function RootErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter()
  const isDbError = isDbConnectionError(error)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      {isDbError ? (
        <DatabaseZap className="size-16 text-destructive/60" />
      ) : (
        <AlertTriangle className="size-16 text-destructive/60" />
      )}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {isDbError ? "Database Unavailable" : "Something Went Wrong"}
        </h1>
        <p className="max-w-md text-sm text-muted-foreground">
          {isDbError
            ? "The application can't connect to the database. Please make sure the database server is running and try again."
            : "An unexpected error occurred. Please try again."}
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 max-w-lg overflow-auto rounded-md bg-muted p-3 text-left text-xs text-muted-foreground">
            {error.message}
          </pre>
        )}
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => {
            reset()
            void router.invalidate()
          }}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="size-4" />
          Try Again
        </button>
        <Link
          to="/"
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
        >
          <Home className="size-4" />
          Home
        </Link>
      </div>
    </div>
  )
}
function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            storageKey="part3-theme"
          >
            {children}
            <Toaster />
            <TanStackDevtools
              config={{
                position: "bottom-right",
              }}
              plugins={[
                {
                  name: "Tanstack Router",
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
            <Scripts />
          </ThemeProvider>
        </QueryClientProvider>
      </body>
    </html>
  )
}
