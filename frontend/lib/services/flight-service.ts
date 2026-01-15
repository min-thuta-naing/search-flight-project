// Service layer for flight data operations
// Provides a clean interface for components to interact with flight data

import { getFlightDataSource } from './data-source'
import { FlightSearchParams } from '@/components/flight-search-form'
import { FlightAnalysisResult } from '@/lib/flight-analysis'
import { FlightPriceParams, FlightPrice } from '@/lib/api/types'

export class FlightService {
  private dataSource = getFlightDataSource()

  /**
   * Analyze flight prices based on search parameters
   * This is the main method components should use
   */
  async analyzePrices(
    params: FlightSearchParams
  ): Promise<FlightAnalysisResult> {
    try {
      // Add any business logic here (validation, transformation, etc.)
      // For now, just delegate to data source
      return await this.dataSource.analyzeFlightPrices(params)
    } catch (error) {
      console.error('Error analyzing flight prices:', error)
      throw error
    }
  }

  /**
   * Get flight prices for specific dates
   * Optional method - only available if data source supports it
   */
  async getFlightPrices(
    params: FlightPriceParams
  ): Promise<FlightPrice[] | null> {
    try {
      if (this.dataSource.getFlightPrices) {
        return await this.dataSource.getFlightPrices(params)
      }
      return null
    } catch (error) {
      console.error('Error getting flight prices:', error)
      throw error
    }
  }
}

// Export singleton instance for convenience
export const flightService = new FlightService()

