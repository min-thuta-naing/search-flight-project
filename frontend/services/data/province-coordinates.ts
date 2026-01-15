/**
 * Coordinates mapping for Thai provinces
 * Used for OpenWeatherMap API calls to get weather data
 */

export interface ProvinceCoordinates {
  lat: number
  lon: number
  cityName: string // Name for OpenWeatherMap API
}

/**
 * Coordinates for major Thai provinces/cities
 * Format: province-value -> { lat, lon, cityName }
 */
export const provinceCoordinates: Record<string, ProvinceCoordinates> = {
  // ภาคกลาง & ตะวันออก
  'bangkok': { lat: 13.7563, lon: 100.5018, cityName: 'Bangkok' },
  'rayong': { lat: 12.6814, lon: 101.2817, cityName: 'Rayong' },
  'trat': { lat: 12.2417, lon: 102.5153, cityName: 'Trat' },
  'prachuap-khiri-khan': { lat: 11.8200, lon: 99.7847, cityName: 'Prachuap Khiri Khan' },
  
  // ภาคเหนือ
  'chiang-mai': { lat: 18.7883, lon: 98.9853, cityName: 'Chiang Mai' },
  'chiang-rai': { lat: 19.9083, lon: 99.8325, cityName: 'Chiang Rai' },
  'lampang': { lat: 18.2923, lon: 99.4928, cityName: 'Lampang' },
  'mae-hong-son': { lat: 19.3017, lon: 97.9689, cityName: 'Mae Hong Son' },
  'nan': { lat: 18.7833, lon: 100.7833, cityName: 'Nan' },
  'phrae': { lat: 18.1450, lon: 100.1411, cityName: 'Phrae' },
  'phitsanulok': { lat: 16.8150, lon: 100.2633, cityName: 'Phitsanulok' },
  'sukhothai': { lat: 17.0125, lon: 99.8233, cityName: 'Sukhothai' },
  'tak': { lat: 16.8833, lon: 99.1289, cityName: 'Tak' },
  
  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  'udon-thani': { lat: 17.4075, lon: 102.7931, cityName: 'Udon Thani' },
  'khon-kaen': { lat: 16.4328, lon: 102.8356, cityName: 'Khon Kaen' },
  'ubon-ratchathani': { lat: 15.2281, lon: 104.8564, cityName: 'Ubon Ratchathani' },
  'nakhon-phanom': { lat: 17.4108, lon: 104.7786, cityName: 'Nakhon Phanom' },
  'sakon-nakhon': { lat: 17.1561, lon: 104.1547, cityName: 'Sakon Nakhon' },
  'roi-et': { lat: 16.0531, lon: 103.6531, cityName: 'Roi Et' },
  'loei': { lat: 17.4861, lon: 101.7228, cityName: 'Loei' },
  'buri-ram': { lat: 14.9944, lon: 103.1033, cityName: 'Buri Ram' },
  'nakhon-ratchasima': { lat: 14.9700, lon: 102.1019, cityName: 'Nakhon Ratchasima' },
  
  // ภาคใต้
  'phuket': { lat: 7.8804, lon: 98.3923, cityName: 'Phuket' },
  'songkhla': { lat: 7.2050, lon: 100.5953, cityName: 'Songkhla' },
  'krabi': { lat: 8.0863, lon: 98.9063, cityName: 'Krabi' },
  'surat-thani': { lat: 9.1386, lon: 99.3336, cityName: 'Surat Thani' },
  'nakhon-si-thammarat': { lat: 8.4333, lon: 99.9667, cityName: 'Nakhon Si Thammarat' },
  'trang': { lat: 7.5564, lon: 99.6114, cityName: 'Trang' },
  'ranong': { lat: 9.9628, lon: 98.6389, cityName: 'Ranong' },
  'chumphon': { lat: 10.4931, lon: 99.1800, cityName: 'Chumphon' },
  'narathiwat': { lat: 6.4264, lon: 101.8231, cityName: 'Narathiwat' },
}

/**
 * Normalize province value for coordinate lookup
 * Handles cases like 'bangkok-dmk' -> 'bangkok'
 */
function normalizeProvinceForCoordinates(province: string): string {
  if (province.startsWith('bangkok-')) {
    return 'bangkok'
  }
  return province
}

/**
 * Get coordinates for a province
 * Returns coordinates if available, null otherwise
 */
export function getProvinceCoordinates(province: string): ProvinceCoordinates | null {
  const normalized = normalizeProvinceForCoordinates(province.toLowerCase().replace(/ /g, '-'))
  return provinceCoordinates[normalized] || null
}

/**
 * Get coordinates or fallback to a default location (Bangkok)
 */
export function getProvinceCoordinatesWithFallback(province: string): ProvinceCoordinates {
  return getProvinceCoordinates(province) || provinceCoordinates['bangkok']
}

