import useSolarStore from '../../store/useSolarStore'
import useAuthStore from '../../store/useAuthStore'
import AddressSearch from './AddressSearch'

export default function TopBar({ onShowAuth, onShowProjects }) {
  const { activeStep, setActiveStep, showShadows, showShadowPanel, setShowShadowPanel, isSaving, saveProject, projectName } = useSolarStore()
  const { user, signOut } = useAuthStore()

  const steps = [
    { num: 1, label: 'Bâtiment' },
    { num: 2, label: 'Panneaux' },
    { num: 3, label: 'Chaînes' },
    { num: 4, label: 'Rapport' },
  ]

  return (
    <>
      {/* Main header — matches Reonic white bar */}
      <div style={{
        height: 52,
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Back / breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            Planifier l'installation photovoltaïque
          </span>
          <span style={{ color: '#9ca3af' }}>/</span>
          <span style={{ fontSize: 14, color: '#6b7280' }}>Planification en 3D</span>
          <span style={{ color: '#9ca3af', fontSize: 12 }}>▾</span>
        </div>

        <AddressSearch />

        <div style={{ flex: 1 }} />

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {user && (
            <TopBtn icon="📂" label="Projets" onClick={onShowProjects} />
          )}

          <div style={{ width: 1, height: 24, background: '#e5e7eb' }} />

          {user ? (
            <>
              <button
                onClick={() => saveProject(user.id)}
                disabled={isSaving}
                style={{
                  padding: '5px 14px', borderRadius: 6,
                  background: isSaving ? '#93c5fd' : '#1d4ed8', color: 'white', fontSize: 13, fontWeight: 500,
                  border: 'none', cursor: isSaving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span>💾</span> {isSaving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6, border: '1px solid #e5e7eb',
                background: 'white', fontSize: 13, color: '#374151',
              }}>
                <span>👤</span>
                <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={signOut}
                  style={{ background: 'none', border: 'none', fontSize: 12, color: '#9ca3af', cursor: 'pointer', padding: 0 }}
                  title="Déconnexion"
                >×</button>
              </div>
            </>
          ) : (
            <button
              onClick={onShowAuth}
              style={{
                padding: '5px 14px', borderRadius: 6,
                background: 'white', color: '#1d4ed8', fontSize: 13, fontWeight: 500,
                border: '1px solid #1d4ed8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              🔐 Se connecter
            </button>
          )}
        </div>
      </div>

      {/* Sub-nav — tabs like Reonic */}
      <div style={{
        height: 44,
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: 2,
        flexShrink: 0,
      }}>
        {/* Tab: Planification 3D (active) */}
        <NavTab active label="Planification 3D" icon="✓" />
        <NavTab label="Ajouter des composants" icon="○" />
        <NavTab label="Liste de pièces" />

        <div style={{ flex: 1 }} />

        {/* Step pills — centered */}
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 2, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '3px 4px' }}>
          {steps.map((step, i) => (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 12px', borderRadius: 6, border: 'none',
                background: activeStep === step.num ? '#1d4ed8' : 'transparent',
                color: activeStep === step.num ? 'white' : '#6b7280',
                fontSize: 13, fontWeight: activeStep === step.num ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{
                width: 18, height: 18, borderRadius: '50%',
                background: activeStep === step.num ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: activeStep === step.num ? 'white' : '#374151',
              }}>{step.num}</span>
              {step.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setShowShadowPanel(!showShadowPanel)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6, fontSize: 13,
              border: `1px solid ${showShadowPanel || showShadows ? '#f59e0b' : '#e5e7eb'}`,
              background: showShadowPanel || showShadows ? '#fef3c7' : 'white',
              color: showShadowPanel || showShadows ? '#92400e' : '#374151',
              cursor: 'pointer',
            }}
          >
            ☀ Ombrage
          </button>

          <button style={{
            padding: '4px 10px', borderRadius: 6, fontSize: 13,
            border: '1px solid #e5e7eb', background: 'white', color: '#374151', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            ⚙ Ajuster les paramètres
          </button>
        </div>
      </div>
    </>
  )
}

function TopBtn({ icon, label }) {
  return (
    <button style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb',
      background: 'white', color: '#374151', fontSize: 13, cursor: 'pointer',
    }}>
      <span>{icon}</span> {label}
    </button>
  )
}

function NavTab({ label, icon, active }) {
  return (
    <button style={{
      padding: '4px 14px', borderRadius: 6, border: 'none',
      background: 'transparent',
      color: active ? '#1d4ed8' : '#6b7280',
      fontSize: 13, fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      borderBottom: active ? '2px solid #1d4ed8' : '2px solid transparent',
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      {icon && <span style={{ color: active ? '#1d4ed8' : '#9ca3af' }}>{icon}</span>}
      {label}
    </button>
  )
}
