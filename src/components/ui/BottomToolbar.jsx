import { useState } from 'react'
import useSolarStore from '../../store/useSolarStore'

export default function BottomToolbar() {
  const [activeTool, setActiveTool] = useState('select')
  const { viewMode, setViewMode } = useSolarStore()

  const tools = [
    { id: 'select', icon: '↖', title: 'Sélectionner' },
    { id: 'pan', icon: '✋', title: 'Déplacer la vue' },
    { id: 'eraser', icon: '◈', title: 'Effacer' },
    null, // separator
    { id: 'draw-line', icon: '+✏', title: 'Dessiner' },
    { id: 'draw-poly', icon: '+◆', title: 'Polygone' },
    { id: 'add-rect', icon: '+▭', title: 'Rectangle' },
    { id: 'add-grid', icon: '+⊞', title: 'Grille panneaux' },
    { id: 'add-table', icon: '+⊟', title: 'Table panneaux' },
    { id: 'add-tree', icon: '+🌲', title: 'Obstacle' },
    null,
    { id: 'undo', icon: '↺', title: 'Annuler (Ctrl+Z)' },
    { id: 'redo', icon: '↻', title: 'Rétablir (Ctrl+Y)' },
    { id: 'more', icon: '···', title: 'Plus d\'options' },
  ]

  return (
    <div style={{
      position: 'absolute',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: '4px 6px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: 10,
    }}>
      {tools.map((tool, i) => {
        if (!tool) return (
          <div key={i} style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />
        )
        const isActive = activeTool === tool.id
        return (
          <button
            key={tool.id}
            title={tool.title}
            onClick={() => setActiveTool(tool.id)}
            style={{
              width: 36, height: 36,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8,
              border: 'none',
              background: isActive ? '#1d4ed8' : 'transparent',
              color: isActive ? 'white' : '#374151',
              fontSize: tool.icon.length > 2 ? 11 : 16,
              fontWeight: isActive ? 700 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {tool.icon}
          </button>
        )
      })}

      <div style={{ width: 1, height: 24, background: '#e5e7eb', margin: '0 2px' }} />

      {/* 2D / 3D toggle */}
      <div style={{
        display: 'flex',
        background: '#f3f4f6',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #e5e7eb',
      }}>
        {['2D', '3D'].map(mode => (
          <button
            key={mode}
            onClick={() => setViewMode(mode.toLowerCase())}
            style={{
              padding: '5px 12px',
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              background: viewMode === mode.toLowerCase() ? '#1d4ed8' : 'transparent',
              color: viewMode === mode.toLowerCase() ? 'white' : '#6b7280',
              transition: 'all 0.15s',
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Save button */}
      <button style={{
        marginLeft: 4,
        padding: '6px 16px',
        background: '#1d4ed8',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        💾 Enregistrer
        <span style={{ fontSize: 11, opacity: 0.65 }}>ctrl+s</span>
      </button>
    </div>
  )
}
