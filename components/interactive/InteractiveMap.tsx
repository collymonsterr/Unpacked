'use client'

import { useEffect, useRef, useState } from 'react'
import type { InteractiveMapData } from '@/types/article'

interface Props {
  data: InteractiveMapData
}

const MARKER_COLORS: Record<string, string> = {
  amber: '#BA7517',
  green: '#3B6D11',
  red: '#A32D2D',
  blue: '#185FA5',
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    L?: any
  }
}

export default function InteractiveMap({ data }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<unknown>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return

    // Load Leaflet CSS
    if (!document.querySelector('link[href*="leaflet"]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
      document.head.appendChild(link)
    }

    // Load Leaflet JS
    const loadLeaflet = (): Promise<void> => {
      if (window.L) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
        script.onload = () => resolve()
        script.onerror = () => reject(new Error('Failed to load Leaflet'))
        document.head.appendChild(script)
      })
    }

    loadLeaflet()
      .then(() => {
        const L = window.L
        if (!L || !mapRef.current) return

        const map = L.map(mapRef.current, {
          scrollWheelZoom: false,
        }).setView([data.center.lat, data.center.lng], data.zoom)

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 18,
        }).addTo(map)

        // Custom marker icon factory
        const makeIcon = (color: string) => L.divIcon({
          className: '',
          html: `<div style="
            width: 24px; height: 24px; border-radius: 50%;
            background: ${color}; border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12],
          popupAnchor: [0, -14],
        })

        // Add markers
        for (const marker of data.markers) {
          const color = MARKER_COLORS[marker.color ?? 'amber'] ?? MARKER_COLORS.amber
          L.marker([marker.lat, marker.lng], { icon: makeIcon(color) })
            .addTo(map)
            .bindPopup(`
              <div style="font-family: system-ui, sans-serif; max-width: 200px;">
                <strong style="color: #1A1714; font-size: 13px;">${marker.title}</strong>
                <p style="color: #6B6259; font-size: 12px; margin: 4px 0 0 0; line-height: 1.4;">${marker.description}</p>
              </div>
            `)
        }

        // Add routes
        if (data.routes) {
          for (const route of data.routes) {
            const latlngs = route.points.map(p => [p.lat, p.lng] as [number, number])
            L.polyline(latlngs, {
              color: route.color ?? '#BA7517',
              weight: 3,
              opacity: 0.7,
              dashArray: '8, 6',
            }).addTo(map)
          }
        }

        // Add zones
        if (data.zones) {
          for (const zone of data.zones) {
            const latlngs = zone.points.map(p => [p.lat, p.lng] as [number, number])
            L.polygon(latlngs, {
              color: zone.color ?? '#BA7517',
              fillOpacity: 0.15,
              weight: 2,
            }).addTo(map)
          }
        }

        mapInstanceRef.current = map
        setIsLoaded(true)

        // Fix tile loading after container resize
        setTimeout(() => {
          (map as { invalidateSize: () => void }).invalidateSize()
        }, 200)
      })
      .catch(err => {
        console.error('[InteractiveMap] Failed to load:', err)
        setError('Map could not be loaded')
      })

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove()
        mapInstanceRef.current = null
      }
    }
  }, [data])

  return (
    <div>
      {error ? (
        <div
          className="flex items-center justify-center rounded-xl"
          style={{ height: 300, backgroundColor: '#F5F4F2', color: '#94918D' }}
        >
          <p className="text-sm">{error}</p>
        </div>
      ) : (
        <div className="relative">
          {!isLoaded && (
            <div
              className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
              style={{ backgroundColor: '#F5F4F2' }}
            >
              <p className="text-sm" style={{ color: '#94918D' }}>Loading map...</p>
            </div>
          )}
          <div
            ref={mapRef}
            className="rounded-xl overflow-hidden"
            style={{ height: 360, width: '100%' }}
          />
        </div>
      )}

      {/* Legend */}
      {data.markers.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3">
          {data.markers.slice(0, 6).map((marker, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className="rounded-full shrink-0"
                style={{
                  width: 8,
                  height: 8,
                  backgroundColor: MARKER_COLORS[marker.color ?? 'amber'] ?? MARKER_COLORS.amber,
                }}
              />
              <span className="text-[11px]" style={{ color: '#6B6259' }}>
                {marker.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
