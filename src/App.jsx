import { useState } from 'react'
import './index.css'
import TopBar from './components/ui/TopBar'
import RightPanel from './components/ui/RightPanel'
import BottomToolbar from './components/ui/BottomToolbar'
import Scene3D from './components/3d/Scene3D'
import SatelliteView2D from './components/2d/SatelliteView2D'
import ShadowPanel from './components/ui/ShadowPanel'
import SunArcOverlay from './components/ui/SunArcOverlay'
import ReportPage from './components/report/ReportPage'
import useSolarStore from './store/useSolarStore'

export default function App() {
  const [showReport, setShowReport] = useState(false)
  const { showShadowPanel, viewMode } = useSolarStore()

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#f1f5f9' }}>
      <TopBar />
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>
        {/* Left sidebar */}
        <LeftSidebar onExport={() => setShowReport(true)} />

        {/* Main canvas area */}
        <div style={{ flex: 1, position: 'relative' }}>

          {/* 3D — toujours monté pour charger les données, caché en mode 2D */}
          <div style={{ position: 'absolute', inset: 0, display: viewMode === '3d' ? 'block' : 'none' }}>
            <Scene3D />
          </div>

          {/* 2D satellite view */}
          {viewMode === '2d' && (
            <div style={{ position: 'absolute', inset: 0 }}>
              <SatelliteView2D />
            </div>
          )}

          {showShadowPanel && <ShadowPanel />}
          {showShadowPanel && viewMode === '3d' && <SunArcOverlay />}
          <BottomToolbar />
        </div>

        {/* Right panel */}
        <RightPanel />
      </div>

      {showReport && <ReportPage onClose={() => setShowReport(false)} />}
    </div>
  )
}

function LeftSidebar({ onExport }) {
  return (
    <div style={{
      width: 64,
      background: 'white',
      borderRight: '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '12px 0',
      gap: 10,
      flexShrink: 0,
      zIndex: 5,
    }}>
      {/* Imagery button */}
      <button style={{
        width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
        border: '2px solid #1d4ed8', cursor: 'pointer', padding: 0,
        background: 'linear-gradient(135deg, #f97316, #c2410c)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 10, fontWeight: 600, flexDirection: 'column',
      }} title="Changer l'imagerie">
        <span style={{ fontSize: 20 }}>🛰</span>
        <span style={{ fontSize: 9 }}>Imagerie</span>
      </button>

      <div style={{ height: 1, width: 40, background: '#e5e7eb' }} />

      {/* Street View */}
      <SideBtn icon="🚶" label="Street View" />

      {/* Export / Report */}
      <SideBtn icon="⬇" label="Exporter" onClick={onExport} />

      <div style={{ flex: 1 }} />

      {/* Compass */}
      <div style={{
        width: 44, height: 44,
        borderRadius: '50%',
        border: '1px solid #e5e7eb',
        background: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
        flexDirection: 'column',
      }} title="Réinitialiser le Nord">
        <svg viewBox="0 0 32 32" width={32} height={32}>
          {/* North red */}
          <polygon points="16,4 18,16 16,14 14,16" fill="#ef4444" />
          {/* South gray */}
          <polygon points="16,28 18,16 16,18 14,16" fill="#9ca3af" />
          {/* Center dot */}
          <circle cx="16" cy="16" r="2" fill="#374151" />
        </svg>
        <span style={{ fontSize: 8, color: '#6b7280', marginTop: -2 }}>N</span>
      </div>
    </div>
  )
}

function SideBtn({ icon, label, onClick }) {
  return (
    <button
      title={label}
      onClick={onClick}
      style={{
        width: 48, height: 40, borderRadius: 8, border: '1px solid #e5e7eb',
        background: 'white', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 1, color: '#374151',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 8, color: '#9ca3af' }}>{label.split(' ')[0]}</span>
    </button>
  )
}
