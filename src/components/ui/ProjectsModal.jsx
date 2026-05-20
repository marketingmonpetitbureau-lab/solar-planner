import { useState, useEffect } from 'react'
import useAuthStore from '../../store/useAuthStore'
import useSolarStore from '../../store/useSolarStore'
import { listProjects, getProject, deleteProject, projectDataToStore } from '../../lib/database'

export default function ProjectsModal({ onClose }) {
  const { user } = useAuthStore()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (user) loadProjects()
  }, [user])

  async function loadProjects() {
    setLoading(true)
    const data = await listProjects(user.id)
    setProjects(data)
    setLoading(false)
  }

  async function handleLoad(projectId) {
    const project = await getProject(projectId)
    if (!project) return
    const storeData = projectDataToStore(project)
    useSolarStore.setState(storeData)
    onClose()
  }

  async function handleDelete(projectId) {
    if (!confirm('Supprimer ce projet ?')) return
    setDeletingId(projectId)
    await deleteProject(projectId)
    setProjects(ps => ps.filter(p => p.id !== projectId))
    setDeletingId(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        background: 'white', borderRadius: 12, padding: 24, width: 560,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>📂 Mes projets</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af' }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Chargement…</p>
          ) : projects.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280', padding: 32 }}>Aucun projet sauvegardé</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map(p => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {p.address || 'Adresse non définie'} · {new Date(p.updated_at).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <button
                    onClick={() => handleLoad(p.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6, border: 'none',
                      background: '#1d4ed8', color: 'white', fontSize: 13,
                      fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Ouvrir
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    disabled={deletingId === p.id}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid #fca5a5',
                      background: '#fef2f2', color: '#dc2626', fontSize: 13,
                      cursor: 'pointer',
                    }}
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
