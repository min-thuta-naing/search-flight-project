// Destination API client

import { apiClient } from './client'

export interface BookedDestination {
  destination: string
  analytics: {
    flights: number
    travelers: number
  }
}

export interface TraveledDestination {
  destination: string
  analytics: {
    flights: number
    travelers: number
  }
}

export interface InspirationDestination {
  destination: string
  price: {
    total: string
    currency: string
  }
  departureDate?: string
  returnDate?: string
}

export interface MostBookedDestinationsResponse {
  origin: string
  period: string
  destinations: BookedDestination[]
}

export interface MostTraveledDestinationsResponse {
  origin: string
  period: string
  destinations: TraveledDestination[]
}

export interface InspirationSearchResponse {
  origin: string
  maxPrice?: number
  currency: string
  destinations: InspirationDestination[]
}

export class DestinationApi {
  /**
   * Get most booked destinations from an origin
   */
  async getMostBookedDestinations(
    origin: string,
    period?: string
  ): Promise<MostBookedDestinationsResponse> {
    return apiClient.get<MostBookedDestinationsResponse>('/destinations/most-booked', {
      origin,
      ...(period && { period }),
    })
  }

  /**
   * Get most traveled destinations from an origin
   */
  async getMostTraveledDestinations(
    origin: string,
    period?: string
  ): Promise<MostTraveledDestinationsResponse> {
    return apiClient.get<MostTraveledDestinationsResponse>('/destinations/most-traveled', {
      origin,
      ...(period && { period }),
    })
  }

  /**
   * Search destinations by budget (inspiration search)
   */
  async searchDestinationsByBudget(
    origin: string,
    maxPrice?: number,
    currency: string = 'THB',
    departureDate?: string,
    oneWay: boolean = false
  ): Promise<InspirationSearchResponse> {
    return apiClient.get<InspirationSearchResponse>('/destinations/inspiration', {
      origin,
      ...(maxPrice && { maxPrice: maxPrice.toString() }),
      currency,
      ...(departureDate && { departureDate }),
      oneWay: oneWay.toString(),
    })
  }
}

export const destinationApi = new DestinationApi()

