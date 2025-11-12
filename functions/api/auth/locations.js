function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function normalizeLocation(row) {
  if (!row) return null
  const id = Number(row.id ?? row.ID ?? row.Id ?? row.location_id)
  const name = row.name ?? row.Name ?? row.location_name ?? ''
  const lat = row.lat ?? row.Lat ?? row.latitude ?? row.Latitude
  const lng = row.lng ?? row.Lng ?? row.longitude ?? row.Longitude
  const radius = row.radius ?? row.Radius ?? row.allowed_radius
  return {
    id,
    name,
    lat: lat != null ? Number(lat) : null,
    lng: lng != null ? Number(lng) : null,
    radius: radius != null ? Number(radius) : null,
    raw: row
  }
}

export async function onRequestGet({ env }) {
  if (!env?.DB) {
    return jsonResponse({ message: 'database unavailable' }, { status: 500 })
  }

  let rows
  try {
    const result = await env.DB
      .prepare('SELECT "ID" AS id, "Name" AS name, "Lat" AS lat, "Lng" AS lng, "Radius" AS radius FROM locations ORDER BY "ID" ASC')
      .all()
    rows = result?.results || []
  } catch (error) {
    return jsonResponse({ message: 'database error' }, { status: 500 })
  }

  const normalized = rows
    .map(normalizeLocation)
    .filter(item => item && Number.isFinite(item.id))

  return jsonResponse(normalized)
}


