import { supabase } from './supabase'

// ── Profil utilisateur ────────────────────────────────────────

export async function getProfile(userId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) { console.error('[DB] getProfile:', error.message); return null }
  return data
}

export async function saveApiKeyToProfile(userId, googleSolarApiKey) {
  if (!supabase) return false
  const { error } = await supabase
    .from('profiles')
    .update({ google_solar_api_key: googleSolarApiKey })
    .eq('id', userId)
  if (error) { console.error('[DB] saveApiKeyToProfile:', error.message); return false }
  return true
}

// ── Projets ───────────────────────────────────────────────────

export async function listProjects(userId) {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, address, lat, lng, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) { console.error('[DB] listProjects:', error.message); return [] }
  return data || []
}

export async function getProject(projectId) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error) { console.error('[DB] getProject:', error.message); return null }
  return data
}

export async function createProject(userId, projectData) {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, ...projectData })
    .select()
    .single()
  if (error) { console.error('[DB] createProject:', error.message); return null }
  return data
}

export async function updateProject(projectId, projectData) {
  if (!supabase) return false
  const { error } = await supabase
    .from('projects')
    .update(projectData)
    .eq('id', projectId)
  if (error) { console.error('[DB] updateProject:', error.message); return false }
  return true
}

export async function deleteProject(projectId) {
  if (!supabase) return false
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)
  if (error) { console.error('[DB] deleteProject:', error.message); return false }
  return true
}

// ── Helpers ───────────────────────────────────────────────────

/** Serialise l'état Zustand → objet DB */
export function storeToProjectData(state, name) {
  return {
    name: name || state.projectName || 'Projet sans titre',
    address: state.address,
    lat: state.lat,
    lng: state.lng,
    segments: state.segments.map(s => ({ ...s, panels: undefined })), // ne pas stocker les panneaux calculés
    report_params: state.reportParams,
    micro_inverters: state.microInverters,
    disabled_panel_ids: state.disabledPanelIds,
    panel_orientation: state.panelOrientation,
  }
}

/** Hydrate le store Zustand depuis les données DB */
export function projectDataToStore(project) {
  return {
    currentProjectId: project.id,
    projectName: project.name,
    address: project.address,
    lat: project.lat,
    lng: project.lng,
    reportParams: project.report_params,
    microInverters: project.micro_inverters || [],
    disabledPanelIds: project.disabled_panel_ids || {},
    panelOrientation: project.panel_orientation || 'portrait',
  }
}
