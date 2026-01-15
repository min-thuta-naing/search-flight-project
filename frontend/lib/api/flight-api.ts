// Flight-specific API calls

import { apiClient } from './client'
import {
  AnalyzeFlightPricesRequest,
  AnalyzeFlightPricesResponse,
  FlightPriceParams,
  FlightPrice,
  CheapestDatesRequest,
  PriceAnalysisRequest,
  PredictPriceRequest,
  PredictPriceResponse,
  PriceTrendRequest,
  PriceTrendResponse,
  PredictPriceRangeRequest,
  PredictPriceRangeResponse,
} from './types'

export interface CheapestDatesResponse {
  cheapestDates: Array<{
    departureDate: string
    returnDate?: string
    price: number
    currency: string
  }>
}

export interface PriceAnalysisResponse {
  price: {
    total: string
    currency: string
  }
  breakdown?: {
    base: string
    taxes: string
    fees: string
  }
  fareDetails?: {
    cabin: string
    fareBasis: string
  }
}

export class FlightApi {
  /**
   * Analyze flight prices based on search parameters
   */
  async analyzeFlightPrices(
    params: AnalyzeFlightPricesRequest
  ): Promise<AnalyzeFlightPricesResponse> {
    return apiClient.post<AnalyzeFlightPricesResponse>(
      '/flights/analyze',
      params
    )
  }

  /**
   * Get flight prices for specific dates
   */
  async getFlightPrices(params: FlightPriceParams): Promise<FlightPrice[]> {
    return apiClient.post<FlightPrice[]>('/flights/prices', params)
  }

  /**
   * Get available airlines for a route
   */
  async getAvailableAirlines(
    origin: string,
    destination: string
  ): Promise<string[]> {
    return apiClient.get<string[]>('/flights/airlines', {
      origin,
      destination,
    })
  }

  /**
   * Find cheapest dates for a route
   */
  async getCheapestDates(
    params: CheapestDatesRequest
  ): Promise<CheapestDatesResponse> {
    return apiClient.post<CheapestDatesResponse>('/flights/cheapest-dates', params)
  }

  /**
   * Get price analysis for a specific route and date
   */
  async getPriceAnalysis(
    params: PriceAnalysisRequest
  ): Promise<PriceAnalysisResponse> {
    return apiClient.post<PriceAnalysisResponse>('/flights/price-analysis', params)
  }

  /**
   * Predict price for a future date
   */
  async predictPrice(
    params: PredictPriceRequest
  ): Promise<PredictPriceResponse> {
    return apiClient.post<PredictPriceResponse>('/flights/predict-price', params)
  }

  /**
   * Get price trend analysis
   */
  async getPriceTrend(
    params: PriceTrendRequest
  ): Promise<PriceTrendResponse> {
    return apiClient.post<PriceTrendResponse>('/flights/price-trend', params)
  }

  /**
   * Predict prices for a date range
   */
  async predictPriceRange(
    params: PredictPriceRangeRequest
  ): Promise<PredictPriceRangeResponse> {
    return apiClient.post<PredictPriceRangeResponse>(
      '/flights/predict-price-range',
      params
    )
  }

  /**
   * Convert province value to airport code
   * 
   * @deprecated Backend now automatically converts province/country names to airport codes.
   * This method is kept for backward compatibility but may not be needed.
   * Frontend should send province/country names directly to backend endpoints.
   */
  async getAirportCode(province: string): Promise<string> {
    const response = await apiClient.get<{ province: string; airportCode: string }>(
      '/flights/airport-code',
      { province }
    )
    return response.airportCode
  }
}

export const flightApi = new FlightApi()

