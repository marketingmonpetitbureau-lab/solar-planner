import { useState, useEffect } from 'react'
import { fromArrayBuffer } from 'geotiff'

const API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY

// hourlyShadeUrls = 12 URLs (one per month, Jan-Dec)
// Each GeoTIFF has 24 bands (one per hour, 0-23)
// Returns shadeGrids: { 0: Uint8Array, 1: Uint8Array, ... 23: Uint8Array } for current month
export function useShadeData(hourlyShadeUrls, enabled, shadeMonth, meshSize) {
  // Cache: monthIndex -> { 0..23: Uint8Array }
  const [monthCache, setMonthCache] = useState({})
  const [loading, setLoading] = useState(false)

  const monthIndex = (shadeMonth || 6) - 1  // 0-11

  useEffect(() => {
    if (!enabled || !hourlyShadeUrls?.length) return
    if (monthCache[monthIndex]) return  // already loaded for this month

    const url = hourlyShadeUrls[monthIndex]
    if (!url) return

    setLoading(true)
    loadMonthShade(url, meshSize).then(hourGrids => {
      setMonthCache(prev => ({ ...prev, [monthIndex]: hourGrids }))
      setLoading(false)
    }).catch(err => {
      console.error('[ShadeData] error:', err)
      setLoading(false)
    })
  }, [enabled, hourlyShadeUrls, monthIndex])

  const shadeGrids = monthCache[monthIndex] || {}
  return { shadeGrids, loading }
}

async function loadMonthShade(url, meshSize) {
  const { width = 300, height = 300 } = meshSize || {}
  const GRID = 256
  const stepX = Math.max(1, Math.floor(width / GRID))
  const stepY = Math.max(1, Math.floor(height / GRID))
  const outW = Math.ceil(width / stepX)
  const outH = Math.ceil(height / stepY)

  const res = await fetch(`${url}&key=${API_KEY}`)
  if (!res.ok) throw new Error(`Shade fetch failed: ${res.status}`)
  const buf = await res.arrayBuffer()
  const tiff = await fromArrayBuffer(buf)
  const img = await tiff.getImage()
  const bands = await img.readRasters()  // array of 24 bands
  const srcW = img.getWidth()
  const srcH = img.getHeight()

  const hourGrids = {}
  for (let hour = 0; hour < bands.length; hour++) {
    const band = bands[hour]
    const out = new Uint8Array(outW * outH)
    for (let row = 0; row < outH; row++) {
      for (let col = 0; col < outW; col++) {
        const srcIdx = Math.min(row * stepY, srcH - 1) * srcW + Math.min(col * stepX, srcW - 1)
        // Band values are typically 0 (shaded) or 1 (sunlit) — scale to 0-255
        out[row * outW + col] = (band[srcIdx] || 0) ? 255 : 0
      }
    }
    hourGrids[hour] = out
  }
  return hourGrids
}
