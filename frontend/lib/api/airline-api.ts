// Airline API client

import { apiClient } from './client'

export interface Airline {
  id: number
  code: string
  name: string
  name_th: string
  created_at?: string
  updated_at?: string
}

export class AirlineApi {
  /**
   * Get all airlines
   */
  async getAllAirlines(): Promise<Airline[]> {
    return apiClient.get<Airline[]>('/airlines')
  }

  /**
   * Get airline by code
   */
  async getAirlineByCode(code: string): Promise<Airline> {
    return apiClient.get<Airline>(`/airlines/${code.toUpperCase()}`)
  }
}

export const airlineApi = new AirlineApi()

