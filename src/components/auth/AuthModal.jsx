import { useState } from 'react'
import useAuthStore from '../../store/useAuthStore'

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { signIn, signUp } = useAuthStore()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const fn = mode === 'signin' ? signIn : signUp
    const result = await fn(email, password)

    if (result.error) {
      setError(result.error)
    } else if (mode === 'signup') {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer.')
    } else {
      onClose()
    }
    setLoading(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 28, width: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
          {mode === 'signin' ? '🔐 Connexion' : '✨ Créer un compte'}
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
          {mode === 'signin'
            ? 'Connectez-vous pour sauvegarder et retrouver vos projets.'
            : 'Créez un compte pour sauvegarder vos projets solaires.'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Email">
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
              style={inputStyle}
            />
          </Field>

          <Field label="Mot de passe">
            <input
              type="password" required minLength={6}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="6 caractères minimum"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div style={alertStyle('#fef2f2', '#fca5a5', '#dc2626')}>❌ {error}</div>
          )}
          {success && (
            <div style={alertStyle('#f0fdf4', '#86efac', '#166534')}>✅ {success}</div>
          )}

          <button
            type="submit" disabled={loading}
            style={{
              padding: '10px', borderRadius: 8, border: 'none',
              background: loading ? '#93c5fd' : '#1d4ed8',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer', marginTop: 4,
            }}
          >
            {loading ? 'Chargement…' : mode === 'signin' ? 'Se connecter' : 'Créer le compte'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            onClick={() => { setMode(m => m === 'signin' ? 'signup' : 'signin'); setError('') }}
            style={{ fontSize: 13, color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {mode === 'signin' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#9ca3af', lineHeight: 1,
          }}
        >×</button>
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
  background: 'white', outline: 'none', boxSizing: 'border-box',
}

function alertStyle(bg, border, color) {
  return {
    background: bg, border: `1px solid ${border}`, borderRadius: 8,
    padding: '8px 12px', fontSize: 13, color,
  }
}
