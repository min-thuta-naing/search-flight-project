// Formatting utilities for flight data display
// All business logic has been moved to Backend API

/**
 * Format date range to Thai format
 * For one-way: shows single date
 * For round-trip: shows date range
 */
export function formatThaiDateRange(
  start: Date,
  end: Date,
  tripType?: 'one-way' | 'round-trip' | null
): string {
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  
  const startDay = start.getDate()
  const startMonth = thaiMonths[start.getMonth()]
  const startYear = start.getFullYear()
  
  // ถ้าเป็น one-way แสดงแค่วันที่เดียว
  if (tripType === 'one-way') {
    return `${startDay} ${startMonth} ${startYear}`
  }
  
  // ถ้าเป็น round-trip แสดงช่วงวันที่
  const endDay = end.getDate()
  const endMonth = thaiMonths[end.getMonth()]
  const endYear = end.getFullYear()
  
  // ถ้าเดือนเดียวกัน
  if (startMonth === endMonth && startYear === endYear) {
    return `${startDay}-${endDay} ${startMonth} ${startYear}`
  }
  // ถ้าปีเดียวกัน แต่เดือนต่างกัน
  if (startYear === endYear) {
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`
  }
  // ถ้าปีต่างกัน
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`
}

/**
 * Parse bestDealDates string to Date object
 * Example: "15-22 มิถุนายน 2025" -> Date(2025, 5, 15)
 */
export function parseBestDealDate(dateString: string): Date {
  const match = dateString.match(/(\d+)(?:\s*-\s*\d+)?\s+(.+?)\s+(\d+)/)
  if (match) {
    const day = parseInt(match[1])
    const monthName = match[2]
    const year = parseInt(match[3])
    
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    const monthIndex = thaiMonths.findIndex(m => m === monthName)
    
    if (monthIndex !== -1) {
      return new Date(year, monthIndex, day)
    }
  }
  
  // Fallback: ใช้วันที่ปัจจุบัน
  return new Date()
}

/**
 * Calculate return date from start date and duration
 * Example: "15 พฤษภาคม 2025" + 7 days -> "22 พฤษภาคม 2025"
 */
export function calculateReturnDate(startDate: string, duration: number): string {
  const monthNames: Record<string, number> = {
    'มกราคม': 0, 'กุมภาพันธ์': 1, 'มีนาคม': 2,
    'เมษายน': 3, 'พฤษภาคม': 4, 'มิถุนายน': 5,
    'กรกฎาคม': 6, 'สิงหาคม': 7, 'กันยายน': 8,
    'ตุลาคม': 9, 'พฤศจิกายน': 10, 'ธันวาคม': 11,
  }
  
  const match = startDate.match(/(\d+)\s+(.+?)\s+(\d+)/)
  if (match) {
    const day = parseInt(match[1])
    const month = monthNames[match[2]] ?? 0
    const year = parseInt(match[3])
    const date = new Date(year, month, day)
    
    // Add duration days
    date.setDate(date.getDate() + Math.round(duration))
    
    // Format back to Thai date string
    const thaiMonths = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ]
    
    return `${date.getDate()} ${thaiMonths[date.getMonth()]} ${date.getFullYear()}`
  }
  
  return startDate
}

// Note: Price calculations are now handled by Backend API
// Frontend only displays the results from backend

