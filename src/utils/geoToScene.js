// WORLD_SIZE must match buildDSMMesh
const WORLD_SIZE = 40
const METERS_PER_UNIT = 3
const ELEV_EXAGGERATION = 0.5

export function geoToScene(lat, lng, bbox, dsmWidth, dsmHeight) {
  // bbox = [west, south, east, north]
  const [west, south, east, north] = bbox
  const u = (lng - west) / (east - west)
  const v = (lat - south) / (north - south)

  const x = (u - 0.5) * WORLD_SIZE
  // Note: in the mesh, row 0 = north, row height-1 = south
  // z increases southward (positive z = south in our scene)
  const z = -(v - 0.5) * WORLD_SIZE * (dsmHeight / dsmWidth)

  return { x, z }
}
