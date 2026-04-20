export const TRAVELER_AUTH_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517479149777-5f3b1511d5ad?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504198458649-3128b932f49b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1493962853295-0fd70327578a?auto=format&fit=crop&w=1200&q=80",
] as const

export function pickRandomAuthImage() {
  return TRAVELER_AUTH_IMAGE_URLS[Math.floor(Math.random() * TRAVELER_AUTH_IMAGE_URLS.length)]
}
