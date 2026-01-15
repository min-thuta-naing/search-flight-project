// Data source abstraction - allows switching between mock and real API

import { FlightAnalysisResult } from '@/lib/flight-analysis'
import { FlightSearchParams } from '@/components/flight-search-form'
import { FlightPriceParams, FlightPrice } from '@/lib/api/types'
import { analyzeFlightPrices as mockAnalyzeFlightPrices } from '@/services/mock/flight-mock'
import { flightApi } from '@/lib/api/flight-api'
import { formatDateToUTCString } from '@/lib/utils'

/**
 * Data source interface for flight data
 */
export interface FlightDataSource {
  analyzeFlightPrices(params: FlightSearchParams): Promise<FlightAnalysisResult>
  getFlightPrices?(params: FlightPriceParams): Promise<FlightPrice[]>
}

/**
 * Mock data source implementation
 * 
 * ⚠️ MOCK ONLY - Development/Testing Only
 * 
 * ⚠️ WARNING: This uses hardcoded business logic that should be in Backend.
 * Only use when NEXT_PUBLIC_USE_MOCK_DATA=true for development/testing.
 * 
 * For Production:
 * - Use RealFlightDataSource which calls Backend API
 * - All business logic (pricing, season, calculations) is in Backend
 * - Frontend only displays results from Backend
 */
class MockFlightDataSource implements FlightDataSource {
  async analyzeFlightPrices(
    params: FlightSearchParams
  ): Promise<FlightAnalysisResult> {
    // Use existing mock logic
    return mockAnalyzeFlightPrices(
      params.origin,
      params.destination,
      params.durationRange,
      params.selectedAirlines || [],
      params.startDate,
      params.endDate,
      params.tripType || null,
      params.passengerCount || 1
    )
  }
}

/**
 * Real API data source implementation
 * 
 * ✅ PRODUCTION - Calls actual Backend API:
 * - Season calculation จาก database (season_configs table)
 * - Holiday/festival data จาก database และ iApp API
 * - Price calculation จาก flight_prices table
 * 
 * ใช้ Backend API endpoints:
 * - POST /api/flights/analyze
 * - POST /api/flights/prices
 */
class RealFlightDataSource implements FlightDataSource {
  async analyzeFlightPrices(
    params: FlightSearchParams
  ): Promise<FlightAnalysisResult> {
    // Transform FlightSearchParams to API request format
    // ✅ ส่งเฉพาะส่วนวันที่ (ไม่รวมเวลา) โดยใช้ UTC methods เพื่อให้สอดคล้องกับ backend
    // เช่น "2025-12-11" แทน "2025-12-11T00:00:00.000Z"
    const request = {
      origin: params.origin,
      destination: params.destination,
      durationRange: params.durationRange,
      selectedAirlines: params.selectedAirlines || [],
      startDate: formatDateToUTCString(params.startDate), // ใช้ UTC methods เพื่อให้สอดคล้องกับ backend
      endDate: formatDateToUTCString(params.endDate),
      tripType: params.tripType || null,
      passengerCount: params.passengerCount || 1,
      passengers: params.passengers || { adults: 1, children: 0, infants: 0 },
      travelClass: params.travelClass || 'economy',
    }

    // Debug: Log travel class before sending to backend
    console.log('[Frontend] Sending travelClass to backend:', {
      travelClass: request.travelClass,
      receivedFromParams: params.travelClass,
      default: 'economy',
      requestKeys: Object.keys(request),
      requestObject: request, // Log full request object
    });

    return await flightApi.analyzeFlightPrices(request)
  }

  async getFlightPrices(params: FlightPriceParams): Promise<FlightPrice[]> {
    return await flightApi.getFlightPrices(params)
  }
}

/**
 * Factory function to get the appropriate data source
 * Uses environment variable to determine which source to use
 */
export function getFlightDataSource(): FlightDataSource {
  // Check environment variable to determine data source
  // Default to real API (backend) if not set or set to 'false'
  // Only use mock if explicitly set to 'true'
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'

  return useMock ? new MockFlightDataSource() : new RealFlightDataSource()
}


