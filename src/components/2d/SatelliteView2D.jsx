import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import useSolarStore from '../../store/useSolarStore'
import { getSunPosition } from '../../utils/sunPosition'

// ─── Projection: lat/lng → display pixel using GeoTIFF bbox ──────────────────
// bbox = [west, south, east, north] in EPSG:4326

function projectBbox(lat, lng, bbox, w, h) {
  const [west, south, east, north] = bbox
  return {
    x: (lng - west) / (east - west) * w,
    y: (1 - (lat - south) / (north - south)) * h,
  }
}

function metersPerPxBbox(lat, bbox, w) {
  const [west, , east] = bbox
  return (east - west) * 111320 * Math.cos((lat * Math.PI) / 180) / w
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SatelliteView2D() {
  const {
    lat, lng,
    segments, solarApiPanels, selectedSegmentId, setSelectedSegment,
    rgbBlobUrl, dsmBbox,
    shadeHour, shadeMonth,
    disabledPanelIds, togglePanel, enableAllPanels,
  } = useSolarStore()

  // Display dimensions of the image container (CSS pixels)
  const IMG_W = 640
  const IMG_H = 640

  // Pan + zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, z: 1 })
  const dragging = useRef(false)
  const lastPos  = useRef({ x: 0, y: 0 })
  const containerRef = useRef()

  // Reset when address changes
  useEffect(() => { setTransform({ x: 0, y: 0, z: 1 }) }, [lat, lng])

  // Mouse pan
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }))
  }, [])

  const onMouseUp = useCallback(() => { dragging.current = false }, [])

  // Wheel zoom toward cursor
  const onWheel = useCallback((e) => {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.12 : 0.89
    setTransform(t => {
      const newZ = Math.max(0.5, Math.min(10, t.z * factor))
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return { ...t, z: newZ }
      const cx = e.clientX - rect.left - rect.width / 2
      const cy = e.clientY - rect.top  - rect.height / 2
      return {
        x: cx + (t.x - cx) * (newZ / t.z),
        y: cy + (t.y - cy) * (newZ / t.z),
        z: newZ,
      }
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onWheel])

  // Project helper (memoized)
  const project = useCallback((pLat, pLng) => {
    if (!dsmBbox) return { x: IMG_W / 2, y: IMG_H / 2 }
    return projectBbox(pLat, pLng, dsmBbox, IMG_W, IMG_H)
  }, [dsmBbox])

  // Meters per pixel
  const mpp = useMemo(() => {
    if (!dsmBbox || !lat) return 0.15
    return metersPerPxBbox(lat, dsmBbox, IMG_W)
  }, [dsmBbox, lat])

  // Panel display dimensions (meters → pixels)
  const PW = 1.134 / mpp   // portrait width
  const PH = 2.278 / mpp   // portrait height

  // Project all panels
  const panelPts = useMemo(() => {
    if (!solarApiPanels?.length || !dsmBbox) return []
    return solarApiPanels.map(p => ({ ...p, ...project(p.lat, p.lng) }))
  }, [solarApiPanels, dsmBbox, project])

  // Project segment centers
  const segPts = useMemo(() => {
    if (!segments?.length || !dsmBbox) return []
    return segments.filter(s => s.centerLat && s.centerLng).map(s => {
      const side = Math.sqrt(s.areaSqM || 15) / mpp
      return { ...s, ...project(s.centerLat, s.centerLng), w: side * 1.4, h: side * 0.85 }
    })
  }, [segments, dsmBbox, mpp, project])

  // Selected segment index (for panel highlighting)
  const selectedSegIdx = useMemo(() => {
    if (!selectedSegmentId) return -1
    const seg = segments.find(s => s.id === selectedSegmentId)
    return seg ? (seg.segmentIndex ?? segments.indexOf(seg)) : -1
  }, [selectedSegmentId, segments])

  // Sun position for mini indicator
  const sun = useMemo(() =>
    getSunPosition(lat || 43.68, lng || 1.42, shadeMonth, shadeHour),
    [lat, lng, shadeMonth, shadeHour]
  )

  const hasPanels = panelPts.length > 0
  const hasData = !!rgbBlobUrl && !!dsmBbox
  const activePanelCount = panelPts.filter(p => !disabledPanelIds[p.id]).length
  const hasDisabled = activePanelCount < panelPts.length

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{
        width: '100%', height: '100%',
        overflow: 'hidden', position: 'relative',
        background: '#1a2030',
        cursor: dragging.current ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
    >
      {/* ── Panned / zoomed container ── */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px)) scale(${transform.z})`,
        transformOrigin: 'center center',
        width: IMG_W,
        height: IMG_H,
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
      }}>
        {/* Aerial photo from RGB GeoTIFF */}
        {rgbBlobUrl ? (
          <img
            src={rgbBlobUrl}
            alt="Vue aérienne"
            draggable={false}
            style={{ width: IMG_W, height: IMG_H, display: 'block', imageRendering: 'auto' }}
          />
        ) : (
          <div style={{
            width: IMG_W, height: IMG_H,
            background: 'linear-gradient(135deg, #1a2030 0%, #243050 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8,
          }}>
            <svg width={32} height={32} viewBox="0 0 32 32" fill="none">
              <circle cx={16} cy={16} r={14} stroke="rgba(255,255,255,0.15)" strokeWidth={2} />
              <circle cx={16} cy={16} r={6} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
              <line x1={16} y1={2} x2={16} y2={8} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
              <line x1={16} y1={24} x2={16} y2={30} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
              <line x1={2} y1={16} x2={8} y2={16} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
              <line x1={24} y1={16} x2={30} y2={16} stroke="rgba(255,255,255,0.25)" strokeWidth={2} />
            </svg>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
              {lat ? 'Chargement photo aérienne…' : 'Recherchez une adresse'}
            </span>
          </div>
        )}

        {/* ── SVG overlay: segments + panels ── */}
        {hasData && (
          <svg
            style={{ position: 'absolute', top: 0, left: 0 }}
            width={IMG_W}
            height={IMG_H}
            viewBox={`0 0 ${IMG_W} ${IMG_H}`}
          >
            {/* Roof segment outlines (click to select) */}
            {segPts.map(seg => {
              const isSelected = seg.id === selectedSegmentId
              const rot = (seg.azimuth || 0) - 90
              return (
                <g key={seg.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedSegment(isSelected ? null : seg.id)}>
                  <rect
                    x={seg.x - seg.w / 2} y={seg.y - seg.h / 2}
                    width={seg.w} height={seg.h}
                    fill={isSelected ? seg.color + '28' : seg.color + '10'}
                    stroke={seg.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    strokeDasharray={isSelected ? 'none' : '6 3'}
                    rx={2}
                    transform={`rotate(${rot}, ${seg.x}, ${seg.y})`}
                  />
                  <text
                    x={seg.x} y={seg.y}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fill="white" fontWeight={700} letterSpacing={0.3}
                    style={{ pointerEvents: 'none', filter: 'drop-shadow(0 0 3px rgba(0,0,0,0.9))' }}
                    transform={`rotate(${rot}, ${seg.x}, ${seg.y})`}
                  >
                    {seg.name?.replace('Pan ', '')}
                  </text>
                </g>
              )
            })}

            {/* Solar panels — clic pour activer/désactiver */}
            {panelPts.map(p => {
              const isDisabled   = !!disabledPanelIds[p.id]
              const isHighlighted = !isDisabled && selectedSegIdx >= 0 && p.segmentIndex === selectedSegIdx
              const rot = (p.azimuth || 0) - 90
              const pw = p.orientation === 'LANDSCAPE' ? PH : PW
              const ph = p.orientation === 'LANDSCAPE' ? PW : PH

              const fill   = isDisabled ? 'rgba(120,120,130,0.3)'  : isHighlighted ? 'rgba(249,115,22,0.85)' : 'rgba(29,78,216,0.75)'
              const stroke = isDisabled ? 'rgba(180,180,200,0.45)' : isHighlighted ? '#fb923c'               : '#93c5fd'
              const lineC  = isDisabled ? 'transparent'            : isHighlighted ? '#fde68a'               : 'rgba(255,255,255,0.4)'

              return (
                <g
                  key={p.id}
                  transform={`translate(${p.x},${p.y}) rotate(${rot})`}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); togglePanel(p.id) }}
                >
                  <rect
                    x={-pw / 2} y={-ph / 2}
                    width={pw} height={ph}
                    fill={fill}
                    stroke={stroke}
                    strokeWidth={isDisabled ? 0.5 : 0.7}
                    strokeDasharray={isDisabled ? '2 1.5' : 'none'}
                    rx={0.4}
                  />
                  <line x1={0} y1={-ph / 2} x2={0} y2={ph / 2} stroke={lineC} strokeWidth={0.35} />
                  <line x1={-pw / 2} y1={0} x2={pw / 2} y2={0} stroke={lineC} strokeWidth={0.35} />
                </g>
              )
            })}
          </svg>
        )}
      </div>

      {/* ── Zoom controls ── */}
      <div style={{
        position: 'absolute', bottom: 72, right: 16,
        display: 'flex', flexDirection: 'column', gap: 2,
        zIndex: 10,
      }}>
        {['+', '−'].map((label, i) => (
          <button
            key={label}
            onClick={() => setTransform(t => ({ ...t, z: Math.max(0.5, Math.min(10, t.z * (i === 0 ? 1.3 : 0.77))) }))}
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'white', border: '1px solid #e5e7eb',
              fontSize: 18, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >{label}</button>
        ))}
        <button
          onClick={() => setTransform({ x: 0, y: 0, z: 1 })}
          style={{
            marginTop: 4, width: 32, height: 32, borderRadius: 6,
            background: 'white', border: '1px solid #e5e7eb',
            fontSize: 11, cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}
          title="Recentrer"
        >⌖</button>
      </div>

      {/* ── Panel count badge (top right) ── */}
      {hasPanels && (
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(0,0,0,0.65)', color: 'white',
          borderRadius: 8, padding: '5px 11px', fontSize: 12, fontWeight: 500,
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 10,
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span>
            ⬛ <strong>{activePanelCount}</strong>
            {hasDisabled && <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 3 }}>/ {panelPts.length}</span>}
            {' '}panneaux
          </span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>🏠 {segPts.length} pans</span>
          {hasDisabled && (
            <button
              onClick={enableAllPanels}
              style={{
                background: '#1d4ed8', color: 'white', border: 'none',
                borderRadius: 5, padding: '2px 8px', fontSize: 11,
                cursor: 'pointer', fontWeight: 600,
              }}
            >↺ Tout activer</button>
          )}
        </div>
      )}

      {/* ── Sun indicator (bottom left) ── */}
      {lat && (
        <div style={{
          position: 'absolute', bottom: 72, left: 12,
          background: 'rgba(0,0,0,0.65)', color: 'white',
          borderRadius: 8, padding: '5px 10px', fontSize: 11,
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', gap: 6,
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 10,
        }}>
          <span style={{ fontSize: 14 }}>{sun.altitude > 0 ? '☀️' : '🌙'}</span>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>
            {String(shadeHour).padStart(2, '0')}:00
          </span>
          {sun.altitude > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.6)' }}>
              {sun.altitude.toFixed(0)}° haut.
            </span>
          )}
        </div>
      )}

      {/* ── No address placeholder ── */}
      {!lat && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(255,255,255,0.35)', fontSize: 14,
        }}>
          Recherchez une adresse pour afficher la vue satellite
        </div>
      )}
    </div>
  )
}
