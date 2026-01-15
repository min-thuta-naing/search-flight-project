// Flight price analysis types and interfaces
// 
// ⚠️ NOTE: All business logic has been moved to Backend API.
// This file only contains TypeScript type definitions.
// 
// For actual flight analysis, use:
// - FlightService.analyzePrices() - calls Backend API
// - Or MockFlightDataSource (only when NEXT_PUBLIC_USE_MOCK_DATA=true)
//
// Re-export mock function for backward compatibility (MOCK ONLY)
import { analyzeFlightPrices as mockAnalyzeFlightPrices } from '@/services/mock/flight-mock'

export interface SeasonData {
  type: 'high' | 'normal' | 'low'
  months: string[]
  priceRange: { min: number; max: number }
  bestDeal: {
    dates: string
    price: number
    airline: string
  }
  description: string
}

export interface PriceComparison {
  basePrice?: number  // ✅ ราคาของวันที่เลือกจริงๆ (ใช้เปรียบเทียบกับ before/after)
  baseAirline?: string  // ✅ ชื่อสายการบินของราคาปัจจุบัน
  ifGoBefore: {
    date: string
    price: number
    difference: number
    percentage: number
  }
  ifGoAfter: {
    date: string
    price: number
    difference: number
    percentage: number
  }
}

export interface FlightAnalysisResult {
  recommendedPeriod: {
    startDate: string
    endDate: string
    returnDate: string
    price: number
    airline: string
    season: 'high' | 'normal' | 'low'
    savings: number
  }
  seasons: SeasonData[]
  priceComparison: PriceComparison
  priceChartData: Array<{
    startDate: string
    returnDate: string
    price: number
    season: 'high' | 'normal' | 'low'
    duration?: number
  }>
  flightPrices?: Array<{  // ✅ เพิ่ม flightPrices เพื่อให้ AirlineFlights ใช้ข้อมูลเดียวกัน
    id: number
    airline_id: number
    airline_code: string
    airline_name: string
    airline_name_th: string
    departure_date: Date | string
    return_date: Date | string | null
    price: number
    base_price: number
    departure_time: string
    arrival_time: string
    duration: number
    flight_number: string
    trip_type: 'one-way' | 'round-trip'
    season: 'high' | 'normal' | 'low'
  }>
  // ✅ XGBoost 100-day price prediction graph data
  priceGraphData?: Array<{
    date: string
    low: number
    typical: number
    high: number
    isActual: boolean
  }>
}

/**
 * @deprecated Use FlightService.analyzePrices() instead (calls Backend API)
 * 
 * ⚠️ MOCK DATA ONLY - This function is kept for backward compatibility
 * Only works when NEXT_PUBLIC_USE_MOCK_DATA=true
 * 
 * For production, use FlightService.analyzePrices() which calls Backend API
 */
export function analyzeFlightPrices(
  origin: string,
  destination: string,
  durationRange: { min: number; max: number },
  selectedAirlines: string[],
  startDate?: Date,
  endDate?: Date,
  tripType?: 'one-way' | 'round-trip' | null,
  passengerCount: number = 1
): FlightAnalysisResult {
  // Only use mock in development/testing mode
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA !== 'true') {
    console.warn('⚠️ analyzeFlightPrices: Mock function called but NEXT_PUBLIC_USE_MOCK_DATA is not true. Use FlightService.analyzePrices() instead.');
  }
  return mockAnalyzeFlightPrices(
    origin,
    destination,
    durationRange,
    selectedAirlines,
    startDate,
    endDate,
    tripType,
    passengerCount
  )
}
