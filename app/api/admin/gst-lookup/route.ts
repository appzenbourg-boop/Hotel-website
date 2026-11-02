import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/options'
import { prisma } from '@/lib/db'
import { validateGSTIN } from '@/lib/utils'
import { 
  INDIAN_GST_STATE_CODES, 
  GST_ENTITY_TYPES, 
  KNOWN_CORPORATE_GSTIN 
} from '@/lib/gst-helper'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const rawGstin = searchParams.get('gstin')

  if (!rawGstin) {
    return NextResponse.json({ success: false, error: 'GSTIN is required' }, { status: 400 })
  }

  const cleanGstin = rawGstin.trim().toUpperCase().replace(/\s+/g, '')
  const validation = validateGSTIN(cleanGstin)

  if (!validation.isValid) {
    return NextResponse.json({ 
      success: false, 
      error: validation.message || 'Invalid GSTIN format' 
    }, { status: 400 })
  }

  const stateCode = cleanGstin.slice(0, 2)
  const pan = cleanGstin.slice(2, 12)
  const entityChar = cleanGstin.charAt(5)
  const stateName = INDIAN_GST_STATE_CODES[stateCode] || 'India'
  const entityType = GST_ENTITY_TYPES[entityChar] || 'Registered Taxpayer'

  // 1. Tier 1: Check existing local database (Booking or Guest)
  try {
    const existingBooking = await prisma.booking.findFirst({
      where: {
        guestGstNumber: cleanGstin,
        guestCompanyName: { not: null }
      },
      select: {
        guestCompanyName: true,
        guestCompanyAddress: true
      },
      orderBy: { createdAt: 'desc' }
    })

    if (existingBooking?.guestCompanyName) {
      return NextResponse.json({
        success: true,
        data: {
          gstin: cleanGstin,
          companyName: existingBooking.guestCompanyName,
          tradeName: existingBooking.guestCompanyName,
          companyAddress: existingBooking.guestCompanyAddress || `Registered Address, ${stateName}, India`,
          state: stateName,
          stateCode,
          pan,
          entityType,
          source: 'DATABASE_HISTORY'
        }
      })
    }

    const existingGuest = await prisma.guest.findFirst({
      where: {
        gstNumber: cleanGstin,
        companyName: { not: null }
      },
      select: {
        companyName: true,
        companyAddress: true
      }
    })

    if (existingGuest?.companyName) {
      return NextResponse.json({
        success: true,
        data: {
          gstin: cleanGstin,
          companyName: existingGuest.companyName,
          tradeName: existingGuest.companyName,
          companyAddress: existingGuest.companyAddress || `Registered Address, ${stateName}, India`,
          state: stateName,
          stateCode,
          pan,
          entityType,
          source: 'GUEST_PROFILE'
        }
      })
    }
  } catch (dbErr) {
    console.warn('GST DB lookup warning:', dbErr)
  }

  // 2. Tier 2: Check Known Corporate Directory
  if (KNOWN_CORPORATE_GSTIN[cleanGstin]) {
    const corp = KNOWN_CORPORATE_GSTIN[cleanGstin]
    return NextResponse.json({
      success: true,
      data: {
        gstin: cleanGstin,
        companyName: corp.legalName,
        tradeName: corp.tradeName,
        companyAddress: corp.address,
        state: corp.state || stateName,
        stateCode,
        pan,
        entityType,
        source: 'CORPORATE_DIRECTORY'
      }
    })
  }

  // 3. Tier 3: Online Free Fetch Attempt (with timeout)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)

    const onlineRes = await fetch(`https://sheet.gstincheck.co.in/check/free/${cleanGstin}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }).catch(() => null)
    clearTimeout(timer)

    if (onlineRes && onlineRes.ok) {
      const json = await onlineRes.json()
      if (json && json.flag && json.data) {
        const d = json.data
        const legalName = d.lgnm || d.legalName || d.tradeNam || ''
        const tradeName = d.tradeNam || d.tradeName || legalName
        const addrObj = d.pradr?.addr
        let fullAddr = ''
        if (addrObj) {
          fullAddr = [addrObj.bno, addrObj.bnm, addrObj.st, addrObj.loc, addrObj.city, addrObj.dst, addrObj.stcd, addrObj.pncd]
            .filter(Boolean)
            .join(', ')
        } else if (typeof d.address === 'string') {
          fullAddr = d.address
        }

        if (legalName) {
          return NextResponse.json({
            success: true,
            data: {
              gstin: cleanGstin,
              companyName: legalName,
              tradeName: tradeName || legalName,
              companyAddress: fullAddr || `Registered Office, ${stateName}, India`,
              state: stateName,
              stateCode,
              pan,
              entityType,
              source: 'ONLINE_PORTAL'
            }
          })
        }
      }
    }
  } catch (onlineErr) {
    // Non-blocking fallback
  }

  // 4. Tier 4: Smart Synthesis from State & PAN Entity Structure
  const isCorporate = entityChar === 'C'
  const isFirm = entityChar === 'F'
  const defaultCompanyName = isCorporate 
    ? `Corporate Entity (${pan})` 
    : isFirm 
    ? `Partnership Firm (${pan})`
    : `Registered Taxpayer (${pan})`

  return NextResponse.json({
    success: true,
    data: {
      gstin: cleanGstin,
      companyName: defaultCompanyName,
      tradeName: defaultCompanyName,
      companyAddress: `Registered Office, ${stateName}, India`,
      state: stateName,
      stateCode,
      pan,
      entityType,
      isSynthesized: true,
      source: 'DECODED_GSTIN'
    }
  })
}
