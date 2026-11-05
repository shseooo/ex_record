import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ex-record',
    short_name: 'ex-record',
    description: 'Workout log backed by your own Google Sheet',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f6f4',
    theme_color: '#2a78d6',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  }
}
