// ─────────────────────────────────────────────────────────────────────────────
// Solar Data Web Worker
// Runs entirely off the main thread: API calls, GeoTIFF parsing, mesh building
// ─────────────────────────────────────────────────────────────────────────────
import { fromArrayBuffer } from 'geotiff'

self.onmessage = async ({ data: { lat, lng, apiKey } }) => {
  const step = (s) => self.postMessage({ type: 'step', step: s })
  const fail = (msg) => self.postMessage({ type: 'error', error: msg })

  try {
    // ── 1. Building Insights ─────────────────────────────────────────────
    step('Analyse du bâtiment…')
    const insightsRes = await fetch(
      `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=LOW&key=${apiKey}`
    )
    if (!insightsRes.ok) throw new Error(`BuildingInsights: ${insightsRes.status}`)
    const insights = await insightsRes.json()
    if (insights.error) throw new Error(insights.error.message)

    // ── 2. Data Layer URLs ───────────────────────────────────────────────
    step('Récupération des couches de données…')
    const layersRes = await fetch(
      `https://solar.googleapis.com/v1/dataLayers:get?location.latitude=${lat}&location.longitude=${lng}&radiusMeters=60&view=FULL_LAYERS&requiredQuality=LOW&key=${apiKey}`
    )
    if (!layersRes.ok) throw new Error(`DataLayers: ${layersRes.status}`)
    const layers = await layersRes.json()

    // ── 3. Download GeoTIFFs in parallel ────────────────────────────────
    step('Téléchargement DSM (modèle 3D élévation)…')
    const [dsmBuf, rgbBuf, maskBuf] = await Promise.all([
      downloadTiff(layers.dsmUrl, apiKey),
      downloadTiff(layers.rgbUrl, apiKey),
      downloadTiff(layers.maskUrl, apiKey),
    ])

    // ── 4. Parse GeoTIFFs ───────────────────────────────────────────────
    step('Traitement du modèle 3D…')
    const [dsmData, rgbData, maskData] = await Promise.all([
      parseTiff(dsmBuf),
      parseTiff(rgbBuf),
      parseTiff(maskBuf),
    ])

    // ── 5. Build mesh + texture ─────────────────────────────────────────
    step('Génération du maillage 3D…')
    const meshData   = buildDSMMesh(dsmData, maskData)
    const rgbTexture = buildRGBTexture(rgbData)
    const roofSegments   = parseSegments(insights)
    const solarApiPanels = parseSolarPanels(insights)

    // Transfer typed arrays directly (zero-copy) to the main thread
    self.postMessage(
      {
        type: 'done',
        meshData,
        rgbTexture,
        roofSegments,
        solarApiPanels,
        dsmBbox: dsmData.bbox,
        hourlyShadeUrls: layers.hourlyShadeUrls || [],
      },
      [
        meshData.positions.buffer,
        meshData.uvs.buffer,
        meshData.indices.buffer,
        rgbTexture.pixels.buffer,
      ]
    )
  } catch (err) {
    fail(err.message)
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

async function downloadTiff(url, apiKey) {
  const res = await fetch(`${url}&key=${apiKey}`)
  if (!res.ok) throw new Error(`TIFF download failed: ${res.status}`)
  return res.arrayBuffer()
}

async function parseTiff(buffer) {
  const tiff  = await fromArrayBuffer(buffer)
  const image = await tiff.getImage()
  const data  = await image.readRasters()
  return {
    width:  image.getWidth(),
    height: image.getHeight(),
    data,
    bbox:   image.getBoundingBox(),
  }
}

function buildDSMMesh(dsm, mask) {
  const rawElev = dsm.data[0]
  const rawMask = mask.data[0]
  const srcW = dsm.width, srcH = dsm.height

  const GRID  = 256
  const stepX = Math.max(1, Math.floor(srcW / GRID))
  const stepY = Math.max(1, Math.floor(srcH / GRID))
  const width  = Math.ceil(srcW / stepX)
  const height = Math.ceil(srcH / stepY)

  const elevation = new Float32Array(width * height)
  const maskVal   = new Uint8Array(width * height)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const src = Math.min(row * stepY, srcH - 1) * srcW + Math.min(col * stepX, srcW - 1)
      elevation[row * width + col] = rawElev[src]
      maskVal[row * width + col]   = rawMask[src]
    }
  }

  // Percentile-based elevation range
  const valid = []
  for (let i = 0; i < elevation.length; i++) {
    const v = elevation[i]
    if (isFinite(v) && v > -500 && v < 9000) valid.push(v)
  }
  valid.sort((a, b) => a - b)
  const n    = valid.length
  const minZ = n > 0 ? valid[Math.floor(n * 0.01)] : 0
  const maxZ = n > 0 ? valid[Math.floor(n * 0.99)] : 30

  const WORLD_SIZE       = 40
  const METERS_PER_UNIT  = 3
  const ELEV_EXAGGERATION = 0.5

  const positions = new Float32Array(width * height * 3)
  const uvs       = new Float32Array(width * height * 2)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const idx   = row * width + col
      const x     = (col / (width  - 1) - 0.5) * WORLD_SIZE
      const z     = ((height - 1 - row) / (height - 1) - 0.5) * WORLD_SIZE * (height / width)
      const elev  = elevation[idx]
      const ok    = isFinite(elev) && elev > -500 && elev < 9000
      const clamped = ok ? Math.max(minZ, Math.min(elev, maxZ)) : minZ
      const y     = ((clamped - minZ) / METERS_PER_UNIT) * ELEV_EXAGGERATION

      positions[idx * 3]     = x
      positions[idx * 3 + 1] = y
      positions[idx * 3 + 2] = z
      uvs[idx * 2]     = col / (width  - 1)
      uvs[idx * 2 + 1] = 1 - row / (height - 1)
    }
  }

  const indices = new Uint32Array((width - 1) * (height - 1) * 6)
  let ii = 0
  for (let row = 0; row < height - 1; row++) {
    for (let col = 0; col < width - 1; col++) {
      const a = row * width + col, b = a + 1, c = a + width, d = c + 1
      indices[ii++] = a; indices[ii++] = b; indices[ii++] = c
      indices[ii++] = b; indices[ii++] = d; indices[ii++] = c
    }
  }

  return { positions, uvs, indices, width, height, minZ, maxZ, WORLD_SIZE, METERS_PER_UNIT }
}

function buildRGBTexture(rgb) {
  const srcW = rgb.width, srcH = rgb.height
  const GRID  = 512
  const stepX = Math.max(1, Math.floor(srcW / GRID))
  const stepY = Math.max(1, Math.floor(srcH / GRID))
  const width  = Math.ceil(srcW / stepX)
  const height = Math.ceil(srcH / stepY)

  const [r, g, b] = rgb.data
  const pixels = new Uint8Array(width * height * 4)

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const src = Math.min(row * stepY, srcH - 1) * srcW + Math.min(col * stepX, srcW - 1)
      const dst = (row * width + col) * 4
      pixels[dst]     = r[src] || 0
      pixels[dst + 1] = g[src] || 0
      pixels[dst + 2] = b[src] || 0
      pixels[dst + 3] = 255
    }
  }

  return { pixels, width, height }
}

function parseSegments(insights) {
  const segs   = insights.solarPotential?.roofSegmentStats || []
  const colors = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#84cc16']
  return segs.map((seg, i) => ({
    id: `solar-seg-${i}`,
    name: azimuthName(seg.azimuthDegrees),
    displayAzimuth: Math.round(seg.azimuthDegrees),
    azimuth: seg.azimuthDegrees,
    tilt: Math.round(seg.pitchDegrees),
    areaSqM: seg.stats?.areaMeters2 || 15,
    color: colors[i % colors.length],
    centerLat: seg.center?.latitude,
    centerLng: seg.center?.longitude,
    segmentIndex: i,
  }))
}

function parseSolarPanels(insights) {
  const panels = insights.solarPotential?.solarPanels || []
  const segs   = insights.solarPotential?.roofSegmentStats || []
  return panels.map((p, i) => {
    const seg = segs[p.segmentIndex] || {}
    return {
      id: `api-panel-${i}`,
      lat: p.center?.latitude,
      lng: p.center?.longitude,
      orientation: p.orientation || 'PORTRAIT',
      yearlyKwh: p.yearlyEnergyDcKwh || 0,
      segmentIndex: p.segmentIndex || 0,
      azimuth: seg.azimuthDegrees || 180,
      pitch:   seg.pitchDegrees   || 20,
    }
  })
}

function azimuthName(az) {
  if (az >= 337.5 || az < 22.5)  return 'Pan Nord'
  if (az < 67.5)  return 'Pan Nord-Est'
  if (az < 112.5) return 'Pan Est'
  if (az < 157.5) return 'Pan Sud-Est'
  if (az < 202.5) return 'Pan Sud'
  if (az < 247.5) return 'Pan Sud-Ouest'
  if (az < 292.5) return 'Pan Ouest'
  return 'Pan Nord-Ouest'
}
