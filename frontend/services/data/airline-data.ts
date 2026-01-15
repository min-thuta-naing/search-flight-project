/**
 * Airline data - Display mappings only
 * 
 * ⚠️ NOTE: Business logic (pricing, multipliers, calculations) has been removed.
 * All business logic is now handled by the Backend API.
 * 
 * This file only contains display mappings for UI purposes.
 */

// Map airline values to display names (for UI display only)
export const airlineMap: Record<string, string> = {
  'thai-airways': 'Thai Airways',
  'thai-airasia': 'Thai AirAsia',
  'thai-lion-air': 'Thai Lion Air',
  'thai-vietjet': 'Thai Vietjet Air',
  'bangkok-airways': 'Bangkok Airways',
  'nok-air': 'Nok Air',
}

// Map airline values to IATA codes (for display/filtering only)
export const airlineCodes: Record<string, string> = {
  'thai-airways': 'TG',
  'thai-airasia': 'FD',
  'thai-lion-air': 'SL',
  'thai-vietjet': 'VZ',
  'bangkok-airways': 'PG',
  'nok-air': 'DD', // DD = เด็ดดี (Nok Air's IATA code)
}

