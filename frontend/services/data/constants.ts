/**
 * Constants and utility data
 * Thai month names, provinces, airlines and other constants
 */

// Thai month abbreviations
export const thaiMonths = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
]

// Thai month full names
export const thaiMonthsFull = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
]

// Month order mapping for sorting
export const monthOrder: Record<string, number> = {
  'ม.ค.': 1, 'ก.พ.': 2, 'มี.ค.': 3, 'เม.ย.': 4,
  'พ.ค.': 5, 'มิ.ย.': 6, 'ก.ค.': 7, 'ส.ค.': 8,
  'ก.ย.': 9, 'ต.ค.': 10, 'พ.ย.': 11, 'ธ.ค.': 12,
}

// Thai provinces with commercial airports for flight search
// Format: { value: string, label: string, airportCode: string }
// Note: Label shows only province name (airport codes shown in flight list)
export const PROVINCES = [
  // ภาคกลาง & ตะวันออก
  { value: 'bangkok', label: 'กรุงเทพมหานคร', airportCode: 'BKK' }, // มี 2 สนามบิน: BKK, DMK
  { value: 'rayong', label: 'ระยอง', airportCode: 'UTP' },
  { value: 'trat', label: 'ตราด', airportCode: 'TDX' },
  { value: 'prachuap-khiri-khan', label: 'ประจวบคีรีขันธ์', airportCode: 'HHQ' },
  
  // ภาคเหนือ
  { value: 'chiang-mai', label: 'เชียงใหม่', airportCode: 'CNX' },
  { value: 'chiang-rai', label: 'เชียงราย', airportCode: 'CEI' },
  { value: 'lampang', label: 'ลำปาง', airportCode: 'LPT' },
  { value: 'mae-hong-son', label: 'แม่ฮ่องสอน', airportCode: 'HGN' }, // มี 2 สนามบิน: HGN (แม่ฮ่องสอน), PYY (ปาย)
  { value: 'nan', label: 'น่าน', airportCode: 'NNT' },
  { value: 'phrae', label: 'แพร่', airportCode: 'PRH' },
  { value: 'phitsanulok', label: 'พิษณุโลก', airportCode: 'PHS' },
  { value: 'sukhothai', label: 'สุโขทัย', airportCode: 'THS' },
  { value: 'tak', label: 'ตาก', airportCode: 'MAQ' },
  
  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  { value: 'udon-thani', label: 'อุดรธานี', airportCode: 'UTH' },
  { value: 'khon-kaen', label: 'ขอนแก่น', airportCode: 'KKC' },
  { value: 'ubon-ratchathani', label: 'อุบลราชธานี', airportCode: 'UBP' },
  { value: 'nakhon-phanom', label: 'นครพนม', airportCode: 'KOP' },
  { value: 'sakon-nakhon', label: 'สกลนคร', airportCode: 'SNO' },
  { value: 'roi-et', label: 'ร้อยเอ็ด', airportCode: 'ROI' },
  { value: 'loei', label: 'เลย', airportCode: 'LOE' },
  { value: 'buri-ram', label: 'บุรีรัมย์', airportCode: 'BFV' },
  { value: 'nakhon-ratchasima', label: 'นครราชสีมา', airportCode: 'NAK' },
  
  // ภาคใต้
  { value: 'phuket', label: 'ภูเก็ต', airportCode: 'HKT' },
  { value: 'songkhla', label: 'สงขลา', airportCode: 'HDY' },
  { value: 'krabi', label: 'กระบี่', airportCode: 'KBV' },
  { value: 'surat-thani', label: 'สุราษฎร์ธานี', airportCode: 'URT' },
  { value: 'nakhon-si-thammarat', label: 'นครศรีธรรมราช', airportCode: 'NST' },
  { value: 'trang', label: 'ตรัง', airportCode: 'TST' },
  { value: 'ranong', label: 'ระนอง', airportCode: 'UNN' },
  { value: 'chumphon', label: 'ชุมพร', airportCode: 'CJM' },
  { value: 'narathiwat', label: 'นราธิวาส', airportCode: 'NAW' },
]

// Airport code mapping (province value -> airport code)
export const airportCodes: Record<string, string> = PROVINCES.reduce((acc, province) => {
  acc[province.value] = province.airportCode
  return acc
}, {} as Record<string, string>)

// Provinces with multiple airports (province value -> array of airport codes)
export const multiAirportProvinces: Record<string, string[]> = {
  'bangkok': ['BKK', 'DMK'], // กรุงเทพมี 2 สนามบิน: BKK (สุวรรณภูมิ), DMK (ดอนเมือง)
  'mae-hong-son': ['HGN', 'PYY'], // แม่ฮ่องสอนมี 2 สนามบิน: HGN (แม่ฮ่องสอน), PYY (ปาย)
}

// Thai airlines for flight search
export const THAI_AIRLINES = [
  { value: 'thai-airways', label: 'Thai Airways' },
  { value: 'thai-airasia', label: 'Thai AirAsia' },
  { value: 'thai-lion-air', label: 'Thai Lion Air' },
  { value: 'thai-vietjet', label: 'Thai Vietjet Air' },
  { value: 'bangkok-airways', label: 'Bangkok Airways' },
  { value: 'nok-air', label: 'Nok Air' },
]

// Province names mapping (value -> label)
export const provinceNames: Record<string, string> = PROVINCES.reduce((acc, province) => {
  acc[province.value] = province.label
  return acc
}, {} as Record<string, string>)

/**
 * Get airport code for a province (returns default/primary airport)
 * 
 * @deprecated This function uses hardcoded mapping and should not be used in production.
 * For production, use the Backend API via services/api/airport-code-service.ts
 * 
 * This function is kept only for backward compatibility in mock data source.
 * 
 * For real API usage:
 * - Use: import { getAirportCode } from '@/services/api/airport-code-service'
 * - Backend API: GET /api/flights/airport-code?province=xxx
 */
export function getAirportCode(provinceValue: string): string {
  return airportCodes[provinceValue] || ''
}

/**
 * Get all airport codes for a province (returns array if multiple airports)
 * 
 * @deprecated This function uses hardcoded mapping and should not be used in production.
 * For production, use the Backend API via services/api/airport-code-service.ts
 * 
 * This function is kept only for backward compatibility in mock data source.
 */
export function getAllAirportCodes(provinceValue: string): string[] {
  if (multiAirportProvinces[provinceValue]) {
    return multiAirportProvinces[provinceValue]
  }
  const code = getAirportCode(provinceValue)
  return code ? [code] : []
}

