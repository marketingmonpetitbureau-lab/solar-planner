// Simplified solar position algorithm (Spencer 1971 / Blanco-Muriel 2001)
export function getSunPosition(lat, lng, month, hour) {
  const latRad = lat * Math.PI / 180
  // Day of year for middle of month
  const daysInMonth = [0,31,59,90,120,151,181,212,243,273,304,334]
  const dayOfYear = daysInMonth[month - 1] + 15

  // Solar declination (degrees)
  const B = (2 * Math.PI * (dayOfYear - 1)) / 365
  const decl = (180/Math.PI) * (0.006918 - 0.399912*Math.cos(B) + 0.070257*Math.sin(B)
    - 0.006758*Math.cos(2*B) + 0.000907*Math.sin(2*B)
    - 0.002697*Math.cos(3*B) + 0.00148*Math.sin(3*B))
  const declRad = decl * Math.PI / 180

  // Equation of time (minutes)
  const eqTime = 229.18 * (0.000075 + 0.001868*Math.cos(B) - 0.032077*Math.sin(B)
    - 0.014615*Math.cos(2*B) - 0.04089*Math.sin(2*B))

  // Solar time offset
  const timezone = Math.round(lng / 15)
  const solarNoon = 12 - eqTime/60 - (lng - timezone*15)/15
  const hourAngleDeg = 15 * (hour - solarNoon)
  const hourAngleRad = hourAngleDeg * Math.PI / 180

  // Altitude
  const sinAlt = Math.sin(latRad)*Math.sin(declRad) + Math.cos(latRad)*Math.cos(declRad)*Math.cos(hourAngleRad)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI

  // Azimuth (0=N, 90=E, 180=S, 270=W)
  const cosAz = (Math.sin(declRad) - Math.sin(latRad)*sinAlt) / (Math.cos(latRad)*Math.cos(Math.asin(sinAlt)))
  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180 / Math.PI
  if (hourAngleDeg > 0) azimuth = 360 - azimuth

  // Convert to Three.js sky position vector (X=East, Y=Up, Z=South)
  const altRad = altitude * Math.PI / 180
  const azRad = azimuth * Math.PI / 180
  const x = Math.cos(altRad) * Math.sin(azRad)
  const y = Math.sin(altRad)
  const z = Math.cos(altRad) * Math.cos(azRad)

  return { altitude, azimuth, position: [x, y, z] }
}
