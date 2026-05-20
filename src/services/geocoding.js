const GEO_KEY = import.meta.env.VITE_GOOGLE_SOLAR_API_KEY

export async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GEO_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (json.status !== 'OK') throw new Error(`Geocoding: ${json.status} — ${json.error_message || ''}`)
  const loc = json.results[0].geometry.location
  return { lat: loc.lat, lng: loc.lng, formatted: json.results[0].formatted_address }
}
