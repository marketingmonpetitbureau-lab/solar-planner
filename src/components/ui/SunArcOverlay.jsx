import { useMemo } from 'react'
import useSolarStore from '../../store/useSolarStore'
import { getSunPosition } from '../../utils/sunPosition'

// Converts sun azimuth (0=N, 90=E, 180=S, 270=W) to SVG angle (0=top, clockwise)
function azimuthToSVG(az) {
  return (az - 90) * (Math.PI / 180)  // rotate so 0° = top (North)
}

export default function SunArcOverlay() {
  const { shadeHour, shadeMonth, lat, lng } = useSolarStore()

  const { dayPoints, currentAz, currentAlt, sunrise, sunset } = useMemo(() => {
    const dayPoints = []
    let sunrise = null, sunset = null

    for (let h = 0; h <= 23; h++) {
      const s = getSunPosition(lat || 43.68, lng || 1.42, shadeMonth, h)
      if (s.altitude > 0) {
        dayPoints.push({ h, az: s.azimuth, alt: s.altitude })
        if (sunrise === null) sunrise = h
        sunset = h
      }
    }

    const cur = getSunPosition(lat || 43.68, lng || 1.42, shadeMonth, shadeHour)
    return {
      dayPoints,
      currentAz: cur.azimuth,
      currentAlt: cur.altitude,
      sunrise,
      sunset,
    }
  }, [lat, lng, shadeMonth, shadeHour])

  // SVG dimensions — centered overlay
  const W = 420, H = 420
  const cx = W / 2, cy = H / 2
  const R = 170  // ring radius

  // Build arc path from sunrise to sunset azimuths
  const arcPath = useMemo(() => {
    if (dayPoints.length < 2) return ''
    const pts = dayPoints.map(({ az }) => {
      const angle = azimuthToSVG(az)
      return [cx + R * Math.cos(angle), cy + R * Math.sin(angle)]
    })
    const d = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`)).join(' ')
    return d
  }, [dayPoints])

  // Current sun dot position
  const curAngle = azimuthToSVG(currentAz)
  const dotX = cx + R * Math.cos(curAngle)
  const dotY = cy + R * Math.sin(curAngle)

  const timeStr = `${String(shadeHour).padStart(2, '0')}:00`
  const isDay = currentAlt > 0

  // Cardinal labels positions
  const cardinals = [
    { label: 'N', angle: -Math.PI / 2 },
    { label: 'E', angle: 0 },
    { label: 'S', angle: Math.PI / 2 },
    { label: 'O', angle: Math.PI },
  ]

  return (
    <div style={{
      position: 'absolute',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
      zIndex: 10,
      width: W, height: H,
    }}>
      <svg width={W} height={H} style={{ overflow: 'visible' }}>
        {/* Outer ring (faint) */}
        <circle
          cx={cx} cy={cy} r={R}
          fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1.5}
          strokeDasharray="4 6"
        />

        {/* Tick marks every 30° */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * 2 * Math.PI - Math.PI / 2
          const inner = R - 6, outer = R + 3
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(angle)} y1={cy + inner * Math.sin(angle)}
              x2={cx + outer * Math.cos(angle)} y2={cy + outer * Math.sin(angle)}
              stroke="rgba(255,255,255,0.2)" strokeWidth={1}
            />
          )
        })}

        {/* Cardinal labels */}
        {cardinals.map(({ label, angle }) => (
          <text
            key={label}
            x={cx + (R + 18) * Math.cos(angle)}
            y={cy + (R + 18) * Math.sin(angle)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={11} fill="rgba(255,255,255,0.4)" fontWeight={600}
          >{label}</text>
        ))}

        {/* Day arc (sun path) */}
        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke="#fbbf24"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.85}
          />
        )}

        {/* Line from center to sun dot */}
        {isDay && (
          <line
            x1={cx} y1={cy}
            x2={dotX} y2={dotY}
            stroke="#fbbf24" strokeWidth={1} opacity={0.4}
            strokeDasharray="3 4"
          />
        )}

        {/* Center cross */}
        <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="rgba(255,255,255,0.3)" strokeWidth={1} />
        <circle cx={cx} cy={cy} r={2} fill="rgba(255,255,255,0.3)" />

        {/* Sun dot */}
        {isDay ? (
          <>
            {/* Outer glow */}
            <circle cx={dotX} cy={dotY} r={26} fill="#fbbf24" opacity={0.12} />
            <circle cx={dotX} cy={dotY} r={18} fill="#fbbf24" opacity={0.2} />
            {/* Dot */}
            <circle cx={dotX} cy={dotY} r={22} fill="#f59e0b" />
            <circle cx={dotX} cy={dotY} r={20} fill="#fde68a" />
            {/* Time label */}
            <text
              x={dotX} y={dotY}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fontWeight={700} fill="#1a1a1a"
            >{timeStr}</text>
          </>
        ) : (
          <>
            {/* Night indicator */}
            <circle cx={dotX} cy={dotY} r={14} fill="#374151" />
            <text
              x={dotX} y={dotY}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={9} fill="#9ca3af"
            >🌙</text>
          </>
        )}

        {/* Altitude badge */}
        {isDay && (
          <g transform={`translate(${cx + R + 12}, ${cy - 14})`}>
            <rect x={0} y={0} width={44} height={20} rx={4} fill="rgba(0,0,0,0.5)" />
            <text x={22} y={13} textAnchor="middle" fontSize={10} fill="#fbbf24" fontWeight={600}>
              {currentAlt.toFixed(1)}°
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
