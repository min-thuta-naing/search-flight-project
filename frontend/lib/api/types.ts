// API request and response types

import { FlightAnalysisResult } from '@/lib/flight-analysis'
import { FlightSearchParams } from '@/components/flight-search-form'

export interface FlightPriceParams {
  origin: string
  destination: string
  startDate: string
  endDate?: string
  tripType: 'one-way' | 'round-trip'
  passengerCount: number
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  selectedAirlines: string[]
  travelClass?: 'economy' | 'business' | 'first'
}

export interface FlightPrice {
  airline: string
  airline_code?: string
  airline_name?: string
  airline_name_th?: string
  price: number
  departureTime: string
  arrivalTime: string
  duration: number
  flightNumber: string
  departureDate?: string
  airplane?: string | null
  often_delayed?: boolean
  carbon_emissions?: string | null
  legroom?: string | null
}

export interface AnalyzeFlightPricesRequest {
  origin: string
  destination: string
  durationRange: { min: number; max: number }
  selectedAirlines: string[]
  startDate?: string
  endDate?: string
  tripType?: 'one-way' | 'round-trip' | null
  passengerCount: number
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  travelClass?: 'economy' | 'business' | 'first'
}

export interface AnalyzeFlightPricesResponse extends FlightAnalysisResult {}

// Price Prediction Types
export interface PredictPriceRequest {
  origin: string
  destination: string
  targetDate: string
  tripType?: 'one-way' | 'round-trip'
  daysOfHistory?: number
}

export interface PredictPriceResponse {
  predictedPrice: number
  confidence: 'high' | 'medium' | 'low'
  rSquared: number
  minPrice: number
  maxPrice: number
}

export interface PriceTrendRequest {
  origin: string
  destination: string
  tripType?: 'one-way' | 'round-trip'
  daysAhead?: number
}

export interface PriceTrendResponse {
  trend: 'increasing' | 'decreasing' | 'stable'
  changePercent: number
  currentAvgPrice: number
  futureAvgPrice: number
}

export interface PredictPriceRangeRequest {
  origin: string
  destination: string
  startDate: string
  endDate: string
  tripType?: 'one-way' | 'round-trip'
}

export interface PriceForecastItem {
  date: string
  predictedPrice: number
  minPrice: number
  maxPrice: number
}

export interface PredictPriceRangeResponse {
  forecast: PriceForecastItem[]
}

export interface CheapestDatesRequest {
  origin: string
  destination: string
  startDate: string
  endDate: string
  tripType?: 'one-way' | 'round-trip'
}

export interface PriceAnalysisRequest {
  origin: string
  destination: string
  departureDate: string
}


