function jsonResponse(data, init = {}) {
  const headers = new Headers(init.headers || {})
  headers.set('Content-Type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), { ...init, headers })
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, errors: ['payload 必須為 JSON 物件'] }
  }

  const errors = []
  const out = {}

  const userSNRaw = payload.userSN
  if (userSNRaw != null) {
    const userSNNum = Number(userSNRaw)
    if (Number.isFinite(userSNNum)) {
      out.userSN = userSNNum
    } else {
      errors.push('userSN 必須為數值')
    }
  } else {
    errors.push('userSN 為必填欄位')
  }

  const locationSNRaw = payload.locationSN
  if (locationSNRaw != null) {
    const locationSNNum = Number(locationSNRaw)
    if (Number.isFinite(locationSNNum)) {
      out.locationSN = locationSNNum
    } else {
      errors.push('locationSN 必須為數值')
    }
  } else {
    errors.push('locationSN 為必填欄位')
  }

  const latRaw = payload?.gps?.lat
  if (latRaw != null) {
    const latNum = Number(latRaw)
    if (!Number.isFinite(latNum)) {
      errors.push('gps.lat 必須為數值')
    } else {
      out.latitude = latNum
    }
  } else {
    out.latitude = null
  }

  const lngRaw = payload?.gps?.lng
  if (lngRaw != null) {
    const lngNum = Number(lngRaw)
    if (!Number.isFinite(lngNum)) {
      errors.push('gps.lng 必須為數值')
    } else {
      out.longitude = lngNum
    }
  } else {
    out.longitude = null
  }

  const timeRaw = payload.time
  if (!timeRaw) {
    errors.push('time 為必填欄位')
  } else {
    const time = new Date(timeRaw)
    if (Number.isNaN(time.getTime())) {
      errors.push('time 需為有效的 ISO 日期字串')
    } else {
      out.checkinTime = time.toISOString()
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  return { ok: true, data: out }
}

export async function onRequestPost({ request, env }) {
  try
  {
    if (!env?.DB) {
      return jsonResponse({ message: 'database unavailable' }, { status: 500 })
    }
  
    const payload = await request.json().catch(() => null)
    const validation = validatePayload(payload)
    if (!validation.ok) {
      return jsonResponse({ message: 'invalid payload', errors: validation.errors }, { status: 400 })
    }
  
    const { userSN, locationSN, latitude, longitude, checkinTime } = validation.data
  
    try {
      const result = await env.DB.prepare(
        `INSERT INTO checkins (userSN, locationSN, latitude, longitude, checkin_time)
         VALUES (?, ?, ?, ?, ?)`
      )
        .bind(userSN, locationSN, latitude, longitude, checkinTime)
        .run()
  
      const insertedId = result?.meta?.last_row_id ?? null
  
      return jsonResponse({ success: true, id: insertedId })
    } catch (error) {
      return jsonResponse({ message: 'database error' }, { status: 500 })
    }
  }
  catch (err) {
    return jsonResponse({ message: err }, { status: 500 })
  }
}


