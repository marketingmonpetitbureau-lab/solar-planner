import { create } from 'zustand'
import { createProject, updateProject, storeToProjectData } from '../lib/database'

function dayOfYearToDate(day) {
  const d = new Date(2024, 0, day)
  return { month: d.getMonth() + 1, dayNum: d.getDate(), monthNum: d.getMonth() + 1 }
}

// Panel model
const panelModel = {
  brand: 'Jinko Solar',
  model: 'Tiger Neo 54HL4M-BDV',
  power: 500,       // Wp
  widthM: 1.134,    // meters (portrait width)
  heightM: 2.278,   // meters (portrait height)
}

// Hip roof dimensions (must match House.jsx)
export const ROOF = {
  W: 9,    // width
  D: 7,    // depth
  H: 3.0,  // wall height
  RH: 2.2, // ridge height above walls
}

// Tilt of the main roof faces
const roofTilt = Math.atan(ROOF.RH / (ROOF.D / 2)) * (180 / Math.PI) // ≈ 32°

// Generate panel positions in local face coordinate system
// x = horizontal (along ridge), y = up the slope from eave
function generatePanels(segment) {
  const panels = []
  const gapH = 0.02   // 2 cm gaps
  const gapV = 0.02
  const pW = panelModel.widthM
  const pH = panelModel.heightM

  const cols = Math.floor((segment.width + gapH) / (pW + gapH))
  const rows = Math.floor((segment.height + gapV) / (pH + gapV))

  if (cols <= 0 || rows <= 0) return []

  // Panels start from y = 0.4 (margin from eave), x centered
  const startY = 0.4
  const totalH = rows * pH + (rows - 1) * gapV

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * (pW + gapH)
      const y = startY + r * (pH + gapV) + pH / 2
      panels.push({ id: `${segment.id}-p${r}-${c}`, x, y, row: r, col: c })
    }
  }
  return panels
}

// Two default segments on the south and north faces
// azimuth convention: 0° = south face (faces +Z in Three.js), 180° = north face
const defaultSegments = [
  {
    id: 'seg-1',
    name: 'Pan Sud',
    displayAzimuth: 180,  // real-world azimuth (south = 180° from north)
    azimuth: 0,           // internal: 0 = south face of our house
    tilt: Math.round(roofTilt),
    width: 6.0,   // along ridge
    height: 3.5,  // along slope
    // Position: at south eave, centered horizontally
    offsetX: -0.5,
    offsetZ: ROOF.D / 2,
    color: '#f97316',
  },
  {
    id: 'seg-2',
    name: 'Pan Nord',
    displayAzimuth: 0,    // real-world azimuth (north = 0°)
    azimuth: 180,         // internal: 180 = north face
    tilt: Math.round(roofTilt),
    width: 4.0,
    height: 3.0,
    offsetX: 1.0,
    offsetZ: -ROOF.D / 2,
    color: '#3b82f6',
  },
]

const segmentsWithPanels = defaultSegments.map(seg => ({
  ...seg,
  panels: generatePanels(seg),
}))

// Color based on azimuth for solar segments
function segmentColor(azimuth) {
  const colors = ['#f97316','#3b82f6','#10b981','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#84cc16']
  const idx = Math.floor(((azimuth % 360) / 360) * colors.length)
  return colors[idx % colors.length]
}

const useSolarStore = create((set, get) => ({
  panelModel,
  panelOrientation: 'portrait',
  gapH: 2,
  gapV: 2,

  lat: 43.67684180,
  lng: 1.42307990,
  address: '22 Place d\'Occitanie, 31140 Aucamville',

  shadeHour: 12,
  shadeMinute: 0,
  shadeMonth: 6,
  shadeDayOfYear: 171, // ~June 20
  hourlyShadeUrls: null,

  reportParams: {
    costPerKWp: 1400,
    electricityPrice: 0.25,
    performanceRatio: 0.80,
  },

  segments: segmentsWithPanels,

  selectedSegmentId: null,
  hoveredSegmentId: null,
  viewMode: '3d',
  showShadows: false,      // whether terrain shade overlay is active
  showShadowPanel: false,  // whether the shadow panel UI is visible
  activeStep: 2,

  // Google Solar API data (null = demo mode with generic house)
  solarApiData: null,
  hasSolarData: false,
  solarApiPanels: null,

  // 2D view: aerial photo blob URL + DSM bounding box
  rgbBlobUrl: null,
  dsmBbox: null,

  // Panel activation: { [panelId]: true } means disabled
  disabledPanelIds: {},

  microInverters: [
    { id: 'inv-1', model: 'MI-1000-2M', brand: 'ATMOCE', count: 7 }
  ],
  chains: [],

  // Supabase project persistence
  currentProjectId: null,
  projectName: 'Projet sans titre',
  isSaving: false,

  // Load real roof segments from Google Solar API response
  setSegmentsFromSolar: (solarSegs) => {
    const segments = solarSegs.map(seg => {
      const w = Math.max(2, Math.sqrt(seg.areaSqM) * 1.4)
      const h = Math.max(1.5, Math.sqrt(seg.areaSqM) * 0.7)
      return {
        ...seg,
        width: w,
        height: h,
        offsetX: 0,
        offsetZ: ROOF.D / 2,
        panels: generatePanels({ id: seg.id, width: w, height: h }),
      }
    })
    set({ segments, hasSolarData: true })
  },

  setSelectedSegment: (id) => set({ selectedSegmentId: id }),
  setHoveredSegment: (id) => set({ hoveredSegmentId: id }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setActiveStep: (step) => set({ activeStep: step }),
  setShowShadows: (v) => set({ showShadows: v }),
  setShowShadowPanel: (v) => set({ showShadowPanel: v }),
  setLocation: (lat, lng, address) => set({ lat, lng, address }),
  setShadeHour: (h) => set({ shadeHour: h }),
  setShadeMinute: (m) => set({ shadeMinute: m }),
  setShadeMonth: (m) => set({ shadeMonth: m }),
  setShadeDayOfYear: (d) => {
    const date = dayOfYearToDate(d)
    set({ shadeDayOfYear: d, shadeMonth: date.month })
  },
  setHourlyShadeUrls: (urls) => set({ hourlyShadeUrls: urls }),
  setSolarApiPanels: (panels) => set({ solarApiPanels: panels }),
  setRgbBlobUrl: (url) => set({ rgbBlobUrl: url }),
  setDsmBbox: (bbox) => set({ dsmBbox: bbox }),
  togglePanel: (id) => set(state => {
    const next = { ...state.disabledPanelIds }
    if (next[id]) delete next[id]
    else next[id] = true
    return { disabledPanelIds: next }
  }),
  enableAllPanels: () => set({ disabledPanelIds: {} }),
  setReportParams: (p) => set({ reportParams: p }),
  setPanelOrientation: (o) => set((state) => ({
    panelOrientation: o,
    segments: state.segments.map(s => ({ ...s, panels: generatePanels(s) })),
  })),

  updateSegment: (id, updates) => set((state) => ({
    segments: state.segments.map(s =>
      s.id === id
        ? { ...s, ...updates, panels: generatePanels({ ...s, ...updates }) }
        : s
    )
  })),

  removeSegment: (id) => set((state) => ({
    segments: state.segments.filter(s => s.id !== id),
    selectedSegmentId: state.selectedSegmentId === id ? null : state.selectedSegmentId,
  })),

  // Load real building data from Google Solar API
  setSolarData: (data) => {
    const { segments: solarSegs, dsmData, rgbData, maskData, insights } = data
    // Convert solar segments to our internal format with panel generation
    const segments = solarSegs.map(seg => ({
      ...seg,
      width: Math.sqrt(seg.areaSqM) * 1.5,
      height: Math.sqrt(seg.areaSqM) * 0.8,
      color: segmentColor(seg.displayAzimuth),
      offsetX: 0,
      offsetZ: 0,
      panels: generatePanels({
        width: Math.sqrt(seg.areaSqM) * 1.5,
        height: Math.sqrt(seg.areaSqM) * 0.8,
        id: seg.id,
      }),
    }))
    set({
      segments,
      hasSolarData: true,
      solarApiData: data,
    })
  },

  setProjectName: (name) => set({ projectName: name }),

  // Sauvegarde le projet courant dans Supabase
  saveProject: async (userId, name) => {
    const state = get()
    set({ isSaving: true })
    try {
      const data = storeToProjectData(state, name || state.projectName)
      if (state.currentProjectId) {
        await updateProject(state.currentProjectId, data)
      } else {
        const project = await createProject(userId, data)
        if (project) set({ currentProjectId: project.id, projectName: project.name })
      }
    } finally {
      set({ isSaving: false })
    }
  },

  getTotals: () => {
    const state = get()
    if (state.solarApiPanels) {
      const active = state.solarApiPanels.filter(p => !state.disabledPanelIds[p.id])
      const totalPanels = active.length
      const totalKw = (totalPanels * state.panelModel.power) / 1000
      const annualKwh = active.reduce((s, p) => s + (p.yearlyKwh || 0), 0)
      return { totalPanels, totalKw, annualKwh }
    }
    const totalPanels = state.segments.reduce((s, seg) => s + seg.panels.length, 0)
    return { totalPanels, totalKw: (totalPanels * state.panelModel.power) / 1000, annualKwh: null }
  },
}))

export default useSolarStore
