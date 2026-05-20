import { useState, useEffect } from 'react'
import useSolarStore from '../../store/useSolarStore'
import useAuthStore from '../../store/useAuthStore'
import { fetchBuildingInsights, fetchDataLayers, downloadGeoTiff, parseGeoTiff, parseSolarSegments } from '../../services/googleSolar'
import { saveApiKeyToProfile } from '../../lib/database'

export default function ApiKeyModal({ onClose }) {
  const [apiKey, setApiKey] = useState('')
  const [address, setAddress] = useState('22 Place d\'Occitanie, 31140 Aucamville')
  const [lat, setLat] = useState('43.67684')
  const [lng, setLng] = useState('1.42308')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState('')
  const [error, setError] = useState('')
  const [saveKeyToAccount, setSaveKeyToAccount] = useState(true)

  const { setSolarData, setSegmentsFromSolar } = useSolarStore()
  const { user, profile, refreshProfile } = useAuthStore()

  // Pré-remplir avec la clé sauvegardée si disponible
  useEffect(() => {
    if (profile?.google_solar_api_key) {
      setApiKey(profile.google_solar_api_key)
    }
  }, [profile])

  async function handleLoad() {
    if (!apiKey) { setError('Clé API requise'); return }
    setLoading(true)
    setError('')

    try {
      // Step 1: Building Insights
      setStep('Récupération des données du bâtiment…')
      const insights = await fetchBuildingInsights(parseFloat(lat), parseFloat(lng), apiKey)

      // Step 2: Data Layers (DSM, RGB, mask)
      setStep('Téléchargement des couches de données (DSM + RGB)…')
      const layers = await fetchDataLayers(parseFloat(lat), parseFloat(lng), apiKey)

      // Step 3: Download and parse GeoTIFF files
      setStep('Parsing du modèle 3D DSM…')
      const dsmBuffer = await downloadGeoTiff(layers.dsmUrl, apiKey)
      const dsmData = await parseGeoTiff(dsmBuffer)

      setStep('Parsing de l\'imagerie RGB…')
      const rgbBuffer = await downloadGeoTiff(layers.rgbUrl, apiKey)
      const rgbData = await parseGeoTiff(rgbBuffer)

      setStep('Parsing du masque bâtiment…')
      const maskBuffer = await downloadGeoTiff(layers.maskUrl, apiKey)
      const maskData = await parseGeoTiff(maskBuffer)

      // Step 4: Parse roof segments
      setStep('Analyse des pans de toit…')
      const segments = parseSolarSegments(insights)

      // Pass everything to store
      useSolarStore.getState().setSolarData({
        insights,
        layers,
        dsmData,
        rgbData,
        maskData,
        segments,
        apiKey,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      })

      // Sauvegarder la clé dans le profil Supabase si connecté
      if (user && saveKeyToAccount) {
        await saveApiKeyToProfile(user.id, apiKey)
        await refreshProfile()
      }

      setStep('✅ Données chargées !')
      setTimeout(onClose, 1000)

    } catch (e) {
      setError(e.message)
      setStep('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 28, width: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>
          🛰 Connecter Google Solar API
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20, lineHeight: 1.5 }}>
          Entrez votre clé API Google Maps avec <strong>Solar API</strong> activée pour charger
          le vrai modèle 3D du bâtiment (DSM + RGB).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Clé API Google Maps">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              style={inputStyle}
            />
          </Field>

          <Field label="Adresse">
            <input
              value={address}
              onChange={e => setAddress(e.target.value)}
              style={inputStyle}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <Field label="Latitude">
              <input value={lat} onChange={e => setLat(e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Longitude">
              <input value={lng} onChange={e => setLng(e.target.value)} style={inputStyle} />
            </Field>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#dc2626' }}>
              ❌ {error}
            </div>
          )}

          {step && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#1d4ed8' }}>
              {loading ? '⏳ ' : ''}{step}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer' }}
            >
              Annuler
            </button>
            <button
              onClick={handleLoad}
              disabled={loading}
              style={{
                flex: 2, padding: '10px', borderRadius: 8, border: 'none',
                background: loading ? '#93c5fd' : '#1d4ed8',
                color: 'white', fontSize: 14, fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
              }}
            >
              {loading ? 'Chargement…' : '🚀 Charger le bâtiment réel'}
            </button>
          </div>

          {user && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={saveKeyToAccount}
                onChange={e => setSaveKeyToAccount(e.target.checked)}
              />
              Mémoriser la clé dans mon compte
            </label>
          )}

          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
            Sans clé API → mode démo avec maison générique ✓
          </p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4, fontWeight: 500 }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, color: '#111827',
  background: 'white', outline: 'none',
  boxSizing: 'border-box',
}
