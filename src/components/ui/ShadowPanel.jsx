import { useState, useEffect, useRef } from 'react'
import useSolarStore from '../../store/useSolarStore'
import { getSunPosition } from '../../utils/sunPosition'

// Convert day-of-year to DD/MM
function dayToDisplay(day) {
  const d = new Date(2024, 0, day)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}`
}

function nowDayOfYear() {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now - start) / 86400000)
}

export default function ShadowPanel() {
  const {
    shadeHour, shadeMinute = 0, shadeDayOfYear, shadeMonth,
    setShadeHour, setShadeMinute, setShadeDayOfYear,
    setShowShadows, showShadows, setShowShadowPanel,
    lat, lng,
  } = useSolarStore()

  const [tab, setTab] = useState('sun') // 'sun' | 'thermal'
  const [playing, setPlaying] = useState(false)
  const playRef = useRef(null)

  const sun = getSunPosition(lat || 43.68, lng || 1.42, shadeMonth, shadeHour)

  // Play animation — advance time every 200ms
  useEffect(() => {
    if (!playing) { clearInterval(playRef.current); return }
    playRef.current = setInterval(() => {
      useSolarStore.setState(state => {
        let h = state.shadeHour + 1
        if (h > 23) h = 0
        return { shadeHour: h }
      })
    }, 400)
    return () => clearInterval(playRef.current)
  }, [playing])

  function goToNow() {
    const now = new Date()
    setShadeHour(now.getHours())
    setShadeMinute(now.getMinutes())
    setShadeDayOfYear(nowDayOfYear())
  }

  const timeStr = `${String(shadeHour).padStart(2, '0')}:${String(shadeMinute || 0).padStart(2, '0')}`
  const dateStr = dayToDisplay(shadeDayOfYear || 171)

  return (
    <div style={{
      position: 'absolute', bottom: 60, left: 16,
      background: 'white', borderRadius: 12,
      border: '1px solid #e5e7eb', boxShadow: '0 4px 24px rgba(0,0,0,0.13)',
      zIndex: 20, width: 320, overflow: 'hidden',
    }}>
      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
        {[['sun', 'Course du soleil'], ['thermal', 'Carte thermique']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              flex: 1, padding: '10px 0', border: 'none', background: 'none',
              fontSize: 12, fontWeight: tab === key ? 600 : 400,
              color: tab === key ? '#1d4ed8' : '#6b7280',
              borderBottom: tab === key ? '2px solid #1d4ed8' : '2px solid transparent',
              cursor: 'pointer', transition: 'all 0.1s',
            }}
          >{label}</button>
        ))}
        <button
          onClick={() => { setShowShadowPanel(false); setShowShadows(false) }}
          style={{
            width: 32, border: 'none', background: 'none', color: '#9ca3af',
            cursor: 'pointer', fontSize: 18, lineHeight: 1,
          }}
        >×</button>
      </div>

      {tab === 'sun' && (
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Time + date + controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Sun icon */}
            <div style={{
              width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
              background: sun.altitude > 0 ? 'radial-gradient(circle, #fde68a, #f59e0b)' : '#e5e7eb',
              boxShadow: sun.altitude > 0 ? '0 0 10px #fbbf24' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>
              {sun.altitude > 0 ? '☀' : '🌙'}
            </div>

            {/* Time & date */}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: -1 }}>
                  {timeStr}
                </span>
                <span style={{ fontSize: 13, color: '#6b7280' }}>{dateStr}</span>
              </div>
              <div style={{ fontSize: 11, color: sun.altitude > 0 ? '#f59e0b' : '#9ca3af' }}>
                {sun.altitude > 0 ? `Altitude ${sun.altitude.toFixed(1)}°` : 'Soleil sous l\'horizon'}
              </div>
            </div>

            {/* Maintenant + Play */}
            <button
              onClick={goToNow}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb',
                background: 'white', fontSize: 11, color: '#374151', cursor: 'pointer',
              }}
            >Maintenant</button>
            <button
              onClick={() => setPlaying(p => !p)}
              style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: playing ? '#1d4ed8' : '#f3f4f6',
                color: playing ? 'white' : '#374151',
                cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{playing ? '⏸' : '▶'}</button>
          </div>

          {/* Hour slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Heure</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8' }}>
                {String(shadeHour).padStart(2, '0')}:00
              </span>
            </div>
            <input
              type="range" min={0} max={23} value={shadeHour}
              onChange={e => { setShadeHour(Number(e.target.value)); setPlaying(false) }}
              style={{ width: '100%', accentColor: '#1d4ed8', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
              {['0h', '6h', '12h', '18h', '23h'].map(t => (
                <span key={t} style={{ fontSize: 9, color: '#9ca3af' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Date slider */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
              <span style={{ fontSize: 11, color: '#6b7280' }}>Date</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#1d4ed8' }}>{dateStr}</span>
            </div>
            <input
              type="range" min={1} max={365} value={shadeDayOfYear || 171}
              onChange={e => setShadeDayOfYear(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#1d4ed8', height: 4 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 1 }}>
              {['01/01', '01/04', '01/07', '01/10', '31/12'].map(t => (
                <span key={t} style={{ fontSize: 9, color: '#9ca3af' }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Show shadows toggle */}
          <button
            onClick={() => setShowShadows(!showShadows)}
            style={{
              width: '100%', padding: '8px 0', borderRadius: 8,
              border: `1px solid ${showShadows ? '#1d4ed8' : '#e5e7eb'}`,
              background: showShadows ? '#eff6ff' : 'white',
              color: showShadows ? '#1d4ed8' : '#374151',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <span>{showShadows ? '🌑' : '☀'}</span>
            {showShadows ? 'Masquer les ombres' : 'Montrer les ombres'}
          </button>
        </div>
      )}

      {tab === 'thermal' && (
        <div style={{ padding: '12px 14px' }}>
          <ThermalMap shadeMonth={shadeMonth} lat={lat} lng={lng} />
        </div>
      )}
    </div>
  )
}

// Carte thermique: show sun altitude for each hour across all months
function ThermalMap({ lat, lng }) {
  const months = [1,2,3,4,5,6,7,8,9,10,11,12]
  const hours = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20]
  const MONTH_LABELS = ['J','F','M','A','M','J','J','A','S','O','N','D']

  return (
    <div>
      <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
        Ensoleillement journalier par mois (altitude soleil)
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {/* Y axis */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, paddingTop: 2 }}>
          {hours.map(h => (
            <div key={h} style={{ height: 12, fontSize: 7, color: '#9ca3af', lineHeight: '12px', textAlign: 'right', paddingRight: 2 }}>
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {/* Grid */}
        <div style={{ flex: 1, display: 'flex', gap: 1 }}>
          {months.map(month => (
            <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
              {hours.map(hour => {
                const sun = getSunPosition(lat || 43.68, lng || 1.42, month, hour)
                const alt = Math.max(0, sun.altitude)
                const pct = Math.min(alt / 70, 1)
                const r = Math.round(pct * 255)
                const g = Math.round(pct * 180 + (1-pct) * 60)
                const b = Math.round((1-pct) * 200)
                return (
                  <div
                    key={hour}
                    title={`${MONTH_LABELS[month-1]} ${hour}h — ${alt.toFixed(0)}°`}
                    style={{
                      height: 12, borderRadius: 1,
                      background: alt > 0 ? `rgb(${r},${g},${b})` : '#e5e7eb',
                    }}
                  />
                )
              })}
              <div style={{ fontSize: 7, color: '#9ca3af', textAlign: 'center', marginTop: 1 }}>
                {MONTH_LABELS[month-1]}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'linear-gradient(to right, #3b82f6, #fbbf24, #ef4444)' }} />
        <span style={{ fontSize: 9, color: '#9ca3af' }}>0° → 70°</span>
      </div>
    </div>
  )
}
