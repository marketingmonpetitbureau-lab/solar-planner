import { useState, useRef, useEffect, useCallback } from 'react'
import { geocodeAddress } from '../../services/geocoding'
import useSolarStore from '../../store/useSolarStore'

const API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY

// New Places API (v1) — supports CORS, no SDK needed
async function fetchSuggestions(input) {
  const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.placeId',
    },
    body: JSON.stringify({ input, languageCode: 'fr' }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.suggestions || []).map(s => s.placePrediction).filter(Boolean)
}

export default function AddressSearch() {
  const { address, setLocation } = useSolarStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [status, setStatus] = useState(null) // { type: 'success'|'error', msg }
  const debounceRef = useRef(null)
  const wrapperRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const loadSuggestions = useCallback(async (val) => {
    if (val.length < 3) { setSuggestions([]); setShowDropdown(false); return }
    try {
      const preds = await fetchSuggestions(val)
      setSuggestions(preds)
      setShowDropdown(preds.length > 0)
    } catch {
      setSuggestions([])
    }
  }, [])

  function handleInput(e) {
    const val = e.target.value
    setInput(val)
    setStatus(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadSuggestions(val), 300)
  }

  async function applyAddress(addressStr) {
    setSuggestions([])
    setShowDropdown(false)
    setLoading(true)
    setStatus(null)
    try {
      const { lat, lng, formatted } = await geocodeAddress(addressStr)
      setStatus({ type: 'success', msg: `📍 ${formatted}` })
      setInput('')
      setLocation(lat, lng, formatted)
    } catch (err) {
      setStatus({ type: 'error', msg: err.message })
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!input.trim()) return
    applyAddress(input.trim())
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <div style={{ position: 'relative' }}>
          <input
            value={input}
            onChange={handleInput}
            onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
            placeholder={status?.type === 'success' ? status.msg : (address || 'Rechercher une adresse…')}
            disabled={loading}
            autoComplete="off"
            style={{
              width: 320, height: 34, padding: '0 34px 0 12px', borderRadius: 8,
              border: `1px solid ${status?.type === 'error' ? '#fca5a5' : status?.type === 'success' ? '#86efac' : '#d1d5db'}`,
              fontSize: 13, outline: 'none',
              background: status?.type === 'success' ? '#f0fdf4' : 'white',
              color: '#111827',
              boxShadow: showDropdown ? '0 0 0 2px #bfdbfe' : 'none',
            }}
          />
          {loading ? (
            <div style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              width: 14, height: 14, borderRadius: '50%',
              border: '2px solid #bfdbfe', borderTopColor: '#1d4ed8',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <span style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              fontSize: 14, color: '#9ca3af', pointerEvents: 'none',
            }}>🔍</span>
          )}

          {/* Dropdown */}
          {showDropdown && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: 38, left: 0, width: 390,
              background: 'white', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.13)',
              zIndex: 500, overflow: 'hidden',
            }}>
              {suggestions.map((s, i) => {
                const main = s.structuredFormat?.mainText?.text || s.text?.text || ''
                const secondary = s.structuredFormat?.secondaryText?.text || ''
                return (
                  <button
                    key={s.placeId || i}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); applyAddress(s.text?.text || main) }}
                    style={{
                      width: '100%', padding: '9px 14px',
                      border: 'none', borderBottom: i < suggestions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      background: 'white', cursor: 'pointer', textAlign: 'left',
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{main}</div>
                      {secondary && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>{secondary}</div>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} style={{
          height: 34, padding: '0 14px', borderRadius: 8,
          background: '#1d4ed8', color: 'white', border: 'none',
          fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500,
          opacity: loading ? 0.7 : 1,
        }}>Rechercher</button>
      </form>

      {status?.type === 'error' && (
        <div style={{
          position: 'absolute', top: 38, left: 0,
          background: '#fef2f2', border: '1px solid #fca5a5',
          borderRadius: 6, padding: '5px 10px', fontSize: 11, color: '#dc2626', zIndex: 100,
        }}>{status.msg}</div>
      )}
    </div>
  )
}
