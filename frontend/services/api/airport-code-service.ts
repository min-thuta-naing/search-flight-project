/**
 * Airport Code Service
 * 
 * ✅ PRODUCTION - Uses Backend API for airport code conversion
 * 
 * สำหรับ Mock Data Source:
 * - ใช้ getAirportCode() จาก services/data/constants.ts (deprecated)
 * 
 * สำหรับ Production:
 * - ใช้ Backend API: GET /api/flights/airport-code?province=xxx
 * - Backend มี mapping ที่อัปเดตและถูกต้อง
 */

import { flightApi } from '@/lib/api/flight-api'

// Simple in-memory cache for airport codes (province -> airport code)
const airportCodeCache = new Map<string, string>()

/**
 * Get airport code for a province using Backend API
 * Uses caching to reduce API calls
 */
export async function getAirportCode(province: string): Promise<string> {
  // Check cache first
  const cached = airportCodeCache.get(province.toLowerCase())
  if (cached) {
    return cached
  }

  // If already an airport code (3 uppercase letters), return as is
  if (/^[A-Z]{3}$/.test(province)) {
    airportCodeCache.set(province.toLowerCase(), province)
    return province
  }

  try {
    // Call Backend API
    const airportCode = await flightApi.getAirportCode(province)
    
    // Cache the result
    airportCodeCache.set(province.toLowerCase(), airportCode)
    
    return airportCode
  } catch (error) {
    console.error(`[AirportCodeService] Failed to get airport code for province "${province}":`, error)
    
    // Fallback: return province as uppercase (best effort)
    const fallback = province.toUpperCase()
    airportCodeCache.set(province.toLowerCase(), fallback)
    return fallback
  }
}

/**
 * Get all airport codes for a province (handles multiple airports like Bangkok)
 * For now, returns single airport code. Can be extended to support multiple airports.
 */
export async function getAllAirportCodes(province: string): Promise<string[]> {
  const airportCode = await getAirportCode(province)
  
  // Handle provinces with multiple airports
  if (province.toLowerCase() === 'bangkok') {
    return ['BKK', 'DMK']
  }
  if (province.toLowerCase() === 'mae-hong-son') {
    return ['HGN', 'PYY']
  }
  
  return airportCode ? [airportCode] : []
}

/**
 * Clear the airport code cache (useful for testing or when data changes)
 */
export function clearAirportCodeCache(): void {
  airportCodeCache.clear()
}

