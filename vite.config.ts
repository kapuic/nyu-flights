import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
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
  ],
})

export default config
