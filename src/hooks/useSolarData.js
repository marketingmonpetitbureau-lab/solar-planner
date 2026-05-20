import { useState, useEffect, useRef } from 'react'
import useSolarStore from '../store/useSolarStore'

const API_KEY = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY

export function useSolarData(lat, lng) {
  const [state, setState] = useState({
    loading: false,
    step: '',
    error: null,
    dsmMesh: null,
    rgbTexture: null,
    roofSegments: null,
    dsmBbox: null,
    solarApiPanels: null,
  })

  const workerRef = useRef(null)

  useEffect(() => {
    if (!API_KEY || !lat || !lng) return

    // Kill any previous in-flight worker immediately
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    // Spawn worker (Vite bundles it automatically)
    const worker = new Worker(
      new URL('../workers/solarData.worker.js', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    const set = (patch) => setState(prev => ({ ...prev, ...patch }))
    set({ loading: true, error: null, step: 'Initialisation…' })

    worker.onmessage = ({ data }) => {
      if (data.type === 'step') {
        set({ step: data.step })

      } else if (data.type === 'done') {
        useSolarStore.getState().setHourlyShadeUrls(data.hourlyShadeUrls)
        set({
          loading: false,
          step: '',
          dsmMesh: data.meshData,
          rgbTexture: data.rgbTexture,
          roofSegments: data.roofSegments,
          dsmBbox: data.dsmBbox,
          solarApiPanels: data.solarApiPanels,
        })

      } else if (data.type === 'error') {
        set({ loading: false, step: '', error: data.error })
        console.error('[SolarWorker]', data.error)
      }
    }

    worker.onerror = (e) => {
      set({ loading: false, step: '', error: e.message })
      console.error('[SolarWorker error]', e)
    }

    // Send request — worker does everything from here
    worker.postMessage({ lat, lng, apiKey: API_KEY })

    // Cleanup: terminate worker when lat/lng changes or component unmounts
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [lat, lng])

  return state
}
