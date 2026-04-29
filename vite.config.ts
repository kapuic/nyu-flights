import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

const isCloudflare = !!process.env.CF_DEPLOY

const config = defineConfig(async () => {
  const plugins = []

  if (isCloudflare) {
    const { cloudflare } = await import("@cloudflare/vite-plugin")
    plugins.push(cloudflare({ viteEnvironment: { name: "ssr" } }))
  } else {
    const { nitro } = await import("nitro/vite")
    plugins.push(devtools(), nitro())
  }

  plugins.push(
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    tanstackStart({
      router: {
        codeSplittingOptions: {
          // Prevent code splitting for layout routes — Nitro proxy
          // doesn't reliably forward ?tsr-split query params
          splitBehavior: ({ routeId }) => {
            // Keep layout routes unsplit (loader + component together)
            if (routeId === '/_globe') return [['loader', 'component']]
            // Default behavior for all other routes
            return undefined
          },
        },
      },
    }),
    viteReact(),
  )

  return { plugins }
})

export default config
