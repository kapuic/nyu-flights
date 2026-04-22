export const TRAVELER_AUTH_IMAGE_URLS = [
  "https://images.unsplash.com/photo-1774244764311-8f50dd59eb75?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1687115539207-9596e4431a1d?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1710751769439-4c30758d259b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1676285592516-fc3c692f9148?auto=format&fit=crop&w=1200&q=80",
] as const

export function pickRandomAuthImage() {
  return TRAVELER_AUTH_IMAGE_URLS[
    Math.floor(Math.random() * TRAVELER_AUTH_IMAGE_URLS.length)
  ]
}
