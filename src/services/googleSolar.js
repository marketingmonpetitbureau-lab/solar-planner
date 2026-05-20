/**
 * Google Solar API Integration
 *
 * Endpoints used:
 * 1. buildingInsights:findClosest → roof segments (pitch, azimuth, area)
 * 2. dataLayers:get → DSM + RGB + mask GeoTIFF files for 3D rendering
 */

const SOLAR_API_BASE = 'https://solar.googleapis.com/v1'

// ─── Building Insights ───────────────────────────────────────────────────────
// Returns roof segments with pitch, azimuth, panel configs, annual sunshine
export async function fetchBuildingInsights(lat, lng, apiKey) {
  const url = `${SOLAR_API_BASE}/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Solar API error: ${res.status} ${await res.text()}`)
  return res.json()
}

// ─── Data Layers ─────────────────────────────────────────────────────────────
// Returns URLs for DSM, RGB, mask, flux GeoTIFFs
export async function fetchDataLayers(lat, lng, apiKey, radiusMeters = 50) {
  const url = `${SOLAR_API_BASE}/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=${radiusMeters}&view=FULL_LAYERS&requiredQuality=LOW&key=${apiKey}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Solar DataLayers error: ${res.status} ${await res.text()}`)
  return res.json()
}

// ─── Download GeoTIFF with API key ──────────────────────────────────────────
export async function downloadGeoTiff(url, apiKey) {
  const separator = url.includes('?') ? '&' : '?'
  const res = await fetch(`${url}${separator}key=${apiKey}`)
  if (!res.ok) throw new Error(`GeoTIFF download error: ${res.status}`)
  return res.arrayBuffer()
}

// ─── Parse Roof Segments from Building Insights ──────────────────────────────
// Converts Solar API response to our internal segment format
export function parseSolarSegments(buildingInsights) {
  const solar = buildingInsights.solarPotential
  const segments = solar.roofSegmentStats || []

  // Get the best panel config
  const bestConfig = solar.solarPanelConfigs?.[solar.solarPanelConfigs.length - 1]
  const panelsBySegment = {}

  if (bestConfig?.roofSegmentSummaries) {
    bestConfig.roofSegmentSummaries.forEach(s => {
      panelsBySegment[s.segmentIndex] = s.panelsCount
    })
  }

  return segments.map((seg, i) => ({
    id: `solar-seg-${i}`,
    name: getSegmentName(seg.azimuthDegrees),
    displayAzimuth: Math.round(seg.azimuthDegrees),
    azimuth: seg.azimuthDegrees,
    tilt: Math.round(seg.pitchDegrees),
    // Area in m² from stats
    areaSqM: seg.stats?.areaMeters2 || 10,
    // Center lat/lng
    centerLat: seg.center?.latitude,
    centerLng: seg.center?.longitude,
    // Sunshine
    maxSunshineHours: seg.stats?.sunshineQuantiles?.[seg.stats.sunshineQuantiles.length - 1] || 1000,
    // Panel count from optimal config
    suggestedPanels: panelsBySegment[i] || 0,
    // Bounding box
    bbox: seg.boundingBox,
    segmentIndex: i,
  }))
}

function getSegmentName(azimuth) {
  if (azimuth >= 337.5 || azimuth < 22.5) return 'Pan Nord'
  if (azimuth >= 22.5 && azimuth < 67.5) return 'Pan Nord-Est'
  if (azimuth >= 67.5 && azimuth < 112.5) return 'Pan Est'
  if (azimuth >= 112.5 && azimuth < 157.5) return 'Pan Sud-Est'
  if (azimuth >= 157.5 && azimuth < 202.5) return 'Pan Sud'
  if (azimuth >= 202.5 && azimuth < 247.5) return 'Pan Sud-Ouest'
  if (azimuth >= 247.5 && azimuth < 292.5) return 'Pan Ouest'
  return 'Pan Nord-Ouest'
}

// ─── Parse GeoTIFF into usable data ─────────────────────────────────────────
export async function parseGeoTiff(arrayBuffer) {
  const { fromArrayBuffer } = await import('geotiff')
  const tiff = await fromArrayBuffer(arrayBuffer)
  const image = await tiff.getImage()

  const width = image.getWidth()
  const height = image.getHeight()
  const data = await image.readRasters()
  const bbox = image.getBoundingBox() // [west, south, east, north] in CRS coords
  const origin = image.getOrigin()    // [x, y, z]
  const resolution = image.getResolution() // [dx, dy, dz]

  return {
    width,
    height,
    data,        // Array of bands
    bbox,
    origin,
    resolution,
    bands: data.length,
  }
}

// ─── Build 3D mesh from DSM + RGB ────────────────────────────────────────────
// Returns { positions, uvs, indices, colors }
export function buildMeshFromDSM(dsmData, rgbData, maskData) {
  const { width, height, data: dsmBands, bbox } = dsmData
  const { data: rgbBands } = rgbData
  const { data: maskBands } = maskData

  const dsmZ = dsmBands[0]     // elevation values
  const maskValues = maskBands[0] // 1 = building, 0 = ground
  const rgbR = rgbBands[0]
  const rgbG = rgbBands[1]
  const rgbB = rgbBands[2]

  // Scale factors
  const [west, south, east, north] = bbox
  const geoWidth = east - west
  const geoHeight = north - south

  // Find elevation range for normalization
  let minZ = Infinity, maxZ = -Infinity
  for (let i = 0; i < dsmZ.length; i++) {
    if (maskValues[i] > 0) {
      minZ = Math.min(minZ, dsmZ[i])
      maxZ = Math.max(maxZ, dsmZ[i])
    }
  }
  const zRange = maxZ - minZ || 1
  const SCALE = 30  // meters in 3D space for full width

  const positions = []
  const uvs = []
  const colors = []
  const indices = []

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx = row * width + col
      const x = (col / (width - 1) - 0.5) * SCALE
      const z = ((height - 1 - row) / (height - 1) - 0.5) * SCALE * (height / width)
      const elevation = dsmZ[idx] || minZ
      const y = ((elevation - minZ) / zRange) * (maxZ - minZ) * 0.3

      positions.push(x, y, z)
      uvs.push(col / (width - 1), 1 - row / (height - 1))

      // Normalize RGB 0-255 to 0-1
      const r = (rgbR?.[idx] || 128) / 255
      const g = (rgbG?.[idx] || 128) / 255
      const b = (rgbB?.[idx] || 128) / 255
      colors.push(r, g, b)
    }
  }

  // Build quad indices
  for (let row = 0; row < height - 1; row++) {
    for (let col = 0; col < width - 1; col++) {
      const a = row * width + col
      const b = a + 1
      const c = a + width
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  return { positions, uvs, colors, indices, width, height, minZ, maxZ, zRange }
}
