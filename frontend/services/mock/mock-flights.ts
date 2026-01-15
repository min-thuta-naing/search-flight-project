/**
 * Mock flight data generation
 * Generate mock flight data for each airline
 */

import { airlineMap, airlineCodes } from '../data/airline-data'
import { calculatePricingFactors } from './pricing-factors' // ⚠️ MOCK ONLY
import { getAllAirportCodes, getAirportCode } from '../data/constants'

// ⚠️ MOCK ONLY - Fallback function for removed business logic
function getBasePriceForRoute(origin: string, destination: string, airline: string): number {
  const basePrices: Record<string, number> = {
    'thai-airways': 4000,
    'bangkok-airways': 3800,
    'thai-airasia': 2500,
    'thai-lion-air': 2300,
    'thai-vietjet': 2400,
    'nok-air': 2200,
  }
  return basePrices[airline] || 3000
}

export interface Flight {
  airline: string
  flightNumber: string
  departureTime: string
  arrivalTime: string
  duration: string
  price: number
  date: string
  originAirportCode?: string // รหัสสนามบินต้นทาง
  destinationAirportCode?: string // รหัสสนามบินปลายทาง
}

/**
 * Generate mock flight data for each airline
 * If origin or destination is Bangkok, generates flights from both BKK and DMK
 */
export function generateFlightsForAirline(
  airline: string,
  origin: string,
  destination: string,
  startDate?: Date,
  endDate?: Date
): Flight[] {
  const airlineName = airlineMap[airline] || airline
  const basePrice = getBasePriceForRoute(origin, destination, airline)
  
  // Get all airport codes for origin and destination (handles multi-airport cities like Bangkok)
  const originAirports = getAllAirportCodes(origin)
  const destinationAirports = getAllAirportCodes(destination)
  
  // Generate flights for each airport combination
  const flights: Flight[] = []
  
  // Generate 2 flights per airport combination (or 4 total if single airport)
  const flightsPerCombination = 2
  const totalCombinations = originAirports.length * destinationAirports.length
  const totalFlights = totalCombinations * flightsPerCombination
  
  const dates = startDate ? [startDate] : [
    new Date(2025, 4, 15), // May 15
    new Date(2025, 4, 20), // May 20
    new Date(2025, 5, 1),  // June 1
    new Date(2025, 5, 10), // June 10
  ]
  
  // Fixed times for testing: 08:00, 12:00, 16:00, 20:00
  const fixedTimes = [
    { hour: 8, minute: 0, durationHours: 1, durationMinutes: 30 },
    { hour: 12, minute: 0, durationHours: 2, durationMinutes: 0 },
    { hour: 16, minute: 0, durationHours: 1, durationMinutes: 45 },
    { hour: 20, minute: 0, durationHours: 2, durationMinutes: 15 },
  ]
  
  let flightIndex = 0
  
  // Generate flights for each airport combination
  for (const originAirport of originAirports) {
    for (const destinationAirport of destinationAirports) {
      for (let i = 0; i < flightsPerCombination; i++) {
        const date = dates[flightIndex % dates.length]
        const dateStr = date.toLocaleDateString('th-TH', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
        
        // ใช้เวลาคงที่แทนการสุ่ม
        const time = fixedTimes[flightIndex % fixedTimes.length]
        const departureHour = time.hour
        const departureMinute = time.minute
        const durationHours = time.durationHours
        const durationMinutes = time.durationMinutes
        
        const arrivalHour = departureHour + durationHours
        const arrivalMinute = departureMinute + durationMinutes
        
        // คำนวณราคาโดยใช้ pricing factors (เทศกาล, วันในสัปดาห์, การจองล่วงหน้า)
        const today = new Date()
        const factors = calculatePricingFactors(today, date)
        const finalPrice = Math.round(basePrice * factors.totalMultiplier)

        // Get IATA airline code (e.g., 'DD' for Nok Air, 'TG' for Thai Airways)
        const airlineCode = airlineCodes[airline] || airline.substring(0, 2).toUpperCase()
        
        // Generate flight number: airline code + 3-4 digit number
        // Format: DD 1000, TG 2001, etc.
        const flightNum = (1000 + flightIndex * 10 + i).toString()
        
        flights.push({
          airline: airlineName,
          flightNumber: `${airlineCode} ${flightNum}`,
          departureTime: `${departureHour.toString().padStart(2, '0')}:${departureMinute.toString().padStart(2, '0')}`,
          arrivalTime: `${(arrivalHour % 24).toString().padStart(2, '0')}:${(arrivalMinute % 60).toString().padStart(2, '0')}`,
          duration: `${durationHours}h ${durationMinutes}m`,
          price: finalPrice,
          date: dateStr,
          originAirportCode: originAirport,
          destinationAirportCode: destinationAirport,
        })
        
        flightIndex++
      }
    }
  }
  
  return flights.sort((a, b) => a.price - b.price) // Sort by price
}

