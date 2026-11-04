import { prisma } from '@/lib/db'

export interface ChannexConfig {
  apiKey: string
  baseUrl: string
  environment: 'PRODUCTION' | 'SANDBOX'
  channexPropertyId?: string
}

/**
 * Resolves Channex connection and configuration for a given property.
 */
export async function getChannexConfig(propertyId: string): Promise<ChannexConfig | null> {
  // Check for specific CHANNEX connection first, or master key on other OTA channels
  const connection = await prisma.otaConnection.findFirst({
    where: {
      propertyId,
      OR: [
        { otaName: 'CHANNEX' },
        { status: 'CONNECTED' }
      ]
    },
    orderBy: { updatedAt: 'desc' }
  })

  if (!connection) return null

  const creds: any = connection.credentials || {}
  const apiKey = creds.apiKey || creds.token || creds.key
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return null
  }

  const isSandbox = creds.environment === 'SANDBOX' ||
    creds.endpoint?.includes('staging') ||
    apiKey.toLowerCase().includes('staging') ||
    apiKey.toLowerCase().includes('test')

  const baseUrl = isSandbox
    ? 'https://staging.channex.io/api/v1'
    : 'https://app.channex.io/api/v1'

  return {
    apiKey: apiKey.trim(),
    baseUrl,
    environment: isSandbox ? 'SANDBOX' : 'PRODUCTION',
    channexPropertyId: creds.channexPropertyId || undefined
  }
}

/**
 * 1. Checks or creates the Channex Property.
 * 2. Returns the official Channex Property ID.
 */
export async function getOrCreateChannexProperty(
  propertyId: string,
  config: ChannexConfig
): Promise<string> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId }
  })

  if (!property) {
    throw new Error(`Property with ID ${propertyId} not found in database.`)
  }

  const headers = {
    'user-api-key': config.apiKey,
    'Content-Type': 'application/json'
  }

  // If already mapped in connection credentials, verify it exists in Channex
  if (config.channexPropertyId) {
    try {
      const verifyRes = await fetch(`${config.baseUrl}/properties/${config.channexPropertyId}`, {
        headers
      })
      if (verifyRes.ok) {
        return config.channexPropertyId
      }
    } catch (e) {
      console.warn('[CHANNEX] Failed to verify existing propertyId, will query list', e)
    }
  }

  // Query existing properties under this user key in Channex
  try {
    const listRes = await fetch(`${config.baseUrl}/properties`, { headers })
    if (listRes.ok) {
      const listData = await listRes.json()
      const existingProp = Array.isArray(listData?.data)
        ? listData.data.find((p: any) =>
            p.attributes?.title?.toLowerCase().trim() === property.name.toLowerCase().trim()
          )
        : null

      if (existingProp?.id) {
        await saveChannexPropertyId(propertyId, existingProp.id)
        return existingProp.id
      }
    }
  } catch (err: any) {
    console.warn('[CHANNEX] Could not list properties from Channex API:', err.message)
  }

  // Create new Property in Channex
  const payload = {
    property: {
      title: property.name,
      currency: 'INR',
      email: property.email || 'support@stayin.com',
      phone: property.phone || '+919876543210',
      zip_code: '110001',
      country: 'IN',
      city: property.address?.split(',')?.[1]?.trim() || 'City',
      address: property.address || 'Hotel Address',
      timezone: 'Asia/Kolkata'
    }
  }

  console.log(`[CHANNEX] Creating Property "${property.name}" in Channex (${config.environment})...`)
  const createRes = await fetch(`${config.baseUrl}/properties`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Channex Property creation failed (${createRes.status}): ${errText}`)
  }

  const createData = await createRes.json()
  const channexPropertyId = createData?.data?.id

  if (!channexPropertyId) {
    throw new Error('Channex Property creation succeeded but returned no Property ID.')
  }

  await saveChannexPropertyId(propertyId, channexPropertyId)
  return channexPropertyId
}

/**
 * Saves the returned Channex Property ID in the OtaConnection credentials
 */
async function saveChannexPropertyId(propertyId: string, channexPropertyId: string) {
  const connections = await prisma.otaConnection.findMany({
    where: { propertyId }
  })

  for (const conn of connections) {
    const creds: any = conn.credentials || {}
    await prisma.otaConnection.update({
      where: { id: conn.id },
      data: {
        credentials: {
          ...creds,
          channexPropertyId,
          lastSyncedAt: new Date().toISOString()
        }
      }
    })
  }
}

/**
 * Fetches all room types from Channex for a given property.
 */
export async function getChannexRoomTypes(
  channexPropertyId: string,
  config: ChannexConfig
): Promise<Array<{ id: string; title: string; count_of_rooms: number }>> {
  const res = await fetch(`${config.baseUrl}/room_types?filter[property_id]=${channexPropertyId}`, {
    headers: {
      'user-api-key': config.apiKey,
      'Content-Type': 'application/json'
    }
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Failed to fetch room types from Channex (${res.status}): ${errText}`)
  }

  const data = await res.json()
  return (data?.data || []).map((item: any) => ({
    id: item.id,
    title: item.attributes?.title || '',
    count_of_rooms: Number(item.attributes?.count_of_rooms || 1)
  }))
}

/**
 * Creates or updates a Room Type in Channex.
 */
export async function createOrUpdateChannexRoomType(
  channexPropertyId: string,
  roomTypeTitle: string,
  countOfRooms: number,
  maxOccupancy: number,
  config: ChannexConfig,
  existingRoomTypes?: Array<{ id: string; title: string; count_of_rooms: number }>
): Promise<string> {
  const headers = {
    'user-api-key': config.apiKey,
    'Content-Type': 'application/json'
  }

  const roomTypes = existingRoomTypes || await getChannexRoomTypes(channexPropertyId, config)
  const existing = roomTypes.find(rt => rt.title.toLowerCase().trim() === roomTypeTitle.toLowerCase().trim())

  if (existing) {
    // If room count changed, update it in Channex
    if (existing.count_of_rooms !== countOfRooms) {
      try {
        await fetch(`${config.baseUrl}/room_types/${existing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            room_type: { count_of_rooms: countOfRooms }
          })
        })
      } catch (err: any) {
        console.warn(`[CHANNEX] Failed to update count_of_rooms for ${roomTypeTitle}:`, err.message)
      }
    }
    return existing.id
  }

  // Create new Room Type in Channex
  console.log(`[CHANNEX] Creating room type "${roomTypeTitle}" (count: ${countOfRooms}) in Channex...`)
  const payload = {
    room_type: {
      property_id: channexPropertyId,
      title: roomTypeTitle,
      count_of_rooms: countOfRooms,
      occ_adults: maxOccupancy || 2,
      occ_children: 1,
      occ_infants: 0,
      default_occupancy: maxOccupancy || 2
    }
  }

  const createRes = await fetch(`${config.baseUrl}/room_types`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })

  if (!createRes.ok) {
    const errText = await createRes.text()
    throw new Error(`Failed to create room type in Channex (${createRes.status}): ${errText}`)
  }

  const result = await createRes.json()
  const channexRoomTypeId = result?.data?.id

  if (!channexRoomTypeId) {
    throw new Error(`Channex returned no ID for room type "${roomTypeTitle}".`)
  }

  return channexRoomTypeId
}

/**
 * Creates or ensures Rate Plan exists in Channex for a given Room Type.
 */
export async function ensureChannexRatePlan(
  channexPropertyId: string,
  channexRoomTypeId: string,
  ratePlanTitle: string,
  basePrice: number,
  config: ChannexConfig
): Promise<string | null> {
  const headers = {
    'user-api-key': config.apiKey,
    'Content-Type': 'application/json'
  }

  try {
    // Check existing rate plans
    const listRes = await fetch(`${config.baseUrl}/rate_plans?filter[property_id]=${channexPropertyId}`, { headers })
    if (listRes.ok) {
      const data = await listRes.json()
      const existing = (data?.data || []).find((rp: any) =>
        rp.attributes?.room_type_id === channexRoomTypeId &&
        rp.attributes?.title?.toLowerCase().trim() === ratePlanTitle.toLowerCase().trim()
      )
      if (existing) return existing.id
    }

    // Create Rate Plan
    const payload = {
      rate_plan: {
        property_id: channexPropertyId,
        room_type_id: channexRoomTypeId,
        title: ratePlanTitle,
        currency: 'INR',
        sell_mode: 'per_room',
        rate_mode: 'manual',
        options: [
          {
            occupancy: 2,
            is_primary: true,
            rate: Math.max(1, Math.round(basePrice))
          }
        ]
      }
    }

    const createRes = await fetch(`${config.baseUrl}/rate_plans`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    })

    if (createRes.ok) {
      const createData = await createRes.json()
      return createData?.data?.id || null
    }
  } catch (err: any) {
    console.warn(`[CHANNEX] Rate Plan creation error for ${ratePlanTitle}:`, err.message)
  }

  return null
}

/**
 * FULL SYNC:
 * 1. Checks / creates Channex property.
 * 2. Gets Channex property ID.
 * 3. Fetches all existing room types from StayIn.
 * 4. Loops through those room types.
 * 5. Calls Channex POST /room_types for each missing room type.
 * 6. Saves the returned Channex room IDs against StayIn room IDs in RoomOtaMapping.
 * 7. Repeats the same process for rate plans.
 */
export async function syncAllStayInRoomsToChannex(propertyId: string) {
  const config = await getChannexConfig(propertyId)
  if (!config) {
    throw new Error('No active Channex integration configured for this property.')
  }

  // 1 & 2: Get or Create Channex Property
  const channexPropertyId = await getOrCreateChannexProperty(propertyId, config)

  // 3 & 4: Fetch StayIn rooms & group by room type
  const rooms = await prisma.room.findMany({
    where: { propertyId },
    orderBy: { roomNumber: 'asc' }
  })

  if (rooms.length === 0) {
    return {
      success: true,
      channexPropertyId,
      message: 'Property has no rooms configured yet.',
      roomTypesSynced: 0,
      roomsMapped: 0
    }
  }

  // Group rooms by type
  const roomTypeGroups = new Map<string, typeof rooms>()
  rooms.forEach(r => {
    const key = (r.type || r.category || 'Standard Room').trim()
    if (!roomTypeGroups.has(key)) {
      roomTypeGroups.set(key, [])
    }
    roomTypeGroups.get(key)!.push(r)
  })

  // Fetch existing room types in Channex
  const existingChannexRoomTypes = await getChannexRoomTypes(channexPropertyId, config)

  // Get or create Channex OTA connection record
  const otaConnection = await prisma.otaConnection.upsert({
    where: {
      propertyId_otaName: {
        propertyId,
        otaName: 'CHANNEX'
      }
    },
    update: {
      status: 'CONNECTED',
      lastSync: new Date()
    },
    create: {
      propertyId,
      otaName: 'CHANNEX',
      status: 'CONNECTED',
      credentials: {
        apiKey: config.apiKey,
        channexPropertyId,
        environment: config.environment
      },
      lastSync: new Date()
    }
  })

  // Also update any child OTA connections (BOOKING_COM, AIRBNB, etc.) to store the channexPropertyId
  await saveChannexPropertyId(propertyId, channexPropertyId)

  const syncedRoomTypes: any[] = []
  let totalMapped = 0

  // 5 & 6: Loop through room types, create in Channex, and save IDs
  for (const [roomTypeTitle, typeRooms] of Array.from(roomTypeGroups.entries())) {
    const countOfRooms = typeRooms.length
    const maxOccupancy = Math.max(...typeRooms.map(r => r.maxOccupancy || 2))
    const avgBasePrice = typeRooms.reduce((acc, r) => acc + (r.basePrice || 0), 0) / countOfRooms

    // Create or update room type in Channex
    const channexRoomTypeId = await createOrUpdateChannexRoomType(
      channexPropertyId,
      roomTypeTitle,
      countOfRooms,
      maxOccupancy,
      config,
      existingChannexRoomTypes
    )

    // 7: Ensure Rate Plan in Channex
    const ratePlanId = await ensureChannexRatePlan(
      channexPropertyId,
      channexRoomTypeId,
      `${roomTypeTitle} Standard Rate`,
      avgBasePrice,
      config
    )

    // Save Channex Room ID in RoomOtaMapping for EVERY room in this type
    for (const room of typeRooms) {
      await prisma.roomOtaMapping.upsert({
        where: {
          roomId_otaConnectionId: {
            roomId: room.id,
            otaConnectionId: otaConnection.id
          }
        },
        update: {
          otaRoomId: channexRoomTypeId,
          ratePlanCode: ratePlanId || 'EP',
          customRate: room.basePrice,
          isActive: true
        },
        create: {
          propertyId,
          roomId: room.id,
          otaConnectionId: otaConnection.id,
          otaRoomId: channexRoomTypeId,
          ratePlanCode: ratePlanId || 'EP',
          customRate: room.basePrice,
          isActive: true
        }
      })
      totalMapped++
    }

    syncedRoomTypes.push({
      roomType: roomTypeTitle,
      countOfRooms,
      channexRoomTypeId,
      ratePlanId,
      mappedRooms: typeRooms.map(r => r.roomNumber)
    })
  }

  return {
    success: true,
    channexPropertyId,
    roomTypesSynced: syncedRoomTypes.length,
    roomsMapped: totalMapped,
    details: syncedRoomTypes
  }
}

/**
 * AUTOMATIC SYNCHRONIZATION EVENT:
 * Called whenever a new room is created or updated in StayIn.
 * e.g. Executive Suite - 3 rooms
 */
export async function syncSingleRoomToChannex(room: {
  id: string
  propertyId: string
  roomNumber: string
  type: string
  category?: string
  basePrice: number
  maxOccupancy: number
}) {
  const config = await getChannexConfig(room.propertyId)
  if (!config) {
    // No Channex integration active for this hotel; skip silently
    return null
  }

  console.log(`[CHANNEX] Triggering auto-sync event for new StayIn room #${room.roomNumber} (${room.type})...`)

  // 1. Get or verify Channex property
  const channexPropertyId = await getOrCreateChannexProperty(room.propertyId, config)

  // 2. Count total rooms of this type in StayIn
  const roomTypeTitle = (room.type || room.category || 'Standard Room').trim()
  const sameTypeRooms = await prisma.room.findMany({
    where: {
      propertyId: room.propertyId,
      type: room.type
    }
  })

  const countOfRooms = Math.max(1, sameTypeRooms.length)

  // 3. Create or update Room Type in Channex
  const channexRoomTypeId = await createOrUpdateChannexRoomType(
    channexPropertyId,
    roomTypeTitle,
    countOfRooms,
    room.maxOccupancy || 2,
    config
  )

  // 4. Ensure Rate Plan
  const ratePlanId = await ensureChannexRatePlan(
    channexPropertyId,
    channexRoomTypeId,
    `${roomTypeTitle} Standard Rate`,
    room.basePrice,
    config
  )

  // 5. Get or create Channex OTA connection
  const otaConnection = await prisma.otaConnection.upsert({
    where: {
      propertyId_otaName: {
        propertyId: room.propertyId,
        otaName: 'CHANNEX'
      }
    },
    update: {
      lastSync: new Date()
    },
    create: {
      propertyId: room.propertyId,
      otaName: 'CHANNEX',
      status: 'CONNECTED',
      credentials: {
        apiKey: config.apiKey,
        channexPropertyId,
        environment: config.environment
      },
      lastSync: new Date()
    }
  })

  // 6. Save returned Channex Room ID in RoomOtaMapping
  const mapping = await prisma.roomOtaMapping.upsert({
    where: {
      roomId_otaConnectionId: {
        roomId: room.id,
        otaConnectionId: otaConnection.id
      }
    },
    update: {
      otaRoomId: channexRoomTypeId,
      ratePlanCode: ratePlanId || 'EP',
      customRate: room.basePrice,
      isActive: true
    },
    create: {
      propertyId: room.propertyId,
      roomId: room.id,
      otaConnectionId: otaConnection.id,
      otaRoomId: channexRoomTypeId,
      ratePlanCode: ratePlanId || 'EP',
      customRate: room.basePrice,
      isActive: true
    }
  })

  console.log(`[CHANNEX] Successfully synced Room #${room.roomNumber} with Channex Room Type ID: ${channexRoomTypeId}`)

  return {
    success: true,
    channexPropertyId,
    channexRoomTypeId,
    mapping
  }
}

