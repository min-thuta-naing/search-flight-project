// Statistics utilities for flight searches

export interface SearchStat {
  origin?: string
  originName?: string
  destination?: string
  destinationName?: string
  durationRange?: string
  tripType?: 'one-way' | 'round-trip' | null
  // Legacy fields for backward compatibility
  country?: string
  countryName?: string
  duration?: number
  timestamp: string
}

export interface PriceStat {
  origin: string
  destination: string
  originName: string
  destinationName: string
  recommendedPrice: number
  season: 'high' | 'normal' | 'low'
  airline: string
  timestamp: string
}

export interface FlightStats {
  searches: SearchStat[]
  prices: PriceStat[]
}

export function getFlightStats(): FlightStats {
  if (typeof window === 'undefined') {
    return { searches: [], prices: [] }
  }

  try {
    const stats = localStorage.getItem('flightStats')
    const parsed = stats ? JSON.parse(stats) : { searches: [], prices: [] }
    // Ensure prices array exists for backward compatibility
    return {
      searches: parsed.searches || [],
      prices: parsed.prices || []
    }
  } catch {
    return { searches: [], prices: [] }
  }
}

export function getMostSearchedCountry(): { country: string; count: number } | null {
  const stats = getFlightStats()
  if (stats.searches.length === 0) return null

  const countryCounts: Record<string, number> = {}
  
  stats.searches.forEach((search) => {
    // Support both new format (destination) and legacy format (country)
    const country = search.destination || search.country || ''
    if (country) {
      countryCounts[country] = (countryCounts[country] || 0) + 1
    }
  })

  const entries = Object.entries(countryCounts)
  if (entries.length === 0) return null

  const [country, count] = entries.reduce((max, current) => 
    current[1] > max[1] ? current : max
  )

  return { country, count }
}

export function getMostSearchedDuration(): { duration: string; count: number } | null {
  const stats = getFlightStats()
  if (stats.searches.length === 0) return null

  const durationCounts: Record<string, number> = {}
  
  stats.searches.forEach((search) => {
    // นับเฉพาะ round-trip (ไป-กลับ) เท่านั้น - ไม่นับ one-way, null, หรือ undefined
    if (search.tripType === 'round-trip') {
      // Support both new format (durationRange) and legacy format (duration)
      const duration = search.durationRange || (search.duration ? `${search.duration} วัน` : '')
      if (duration) {
        durationCounts[duration] = (durationCounts[duration] || 0) + 1
      }
    }
    // ไม่นับถ้า tripType เป็น 'one-way', null, หรือ undefined
  })

  const entries = Object.entries(durationCounts)
  if (entries.length === 0) return null

  const [duration, count] = entries.reduce((max, current) => 
    current[1] > max[1] ? current : max
  )

  return { duration, count }
}

export function getTotalSearches(): number {
  const stats = getFlightStats()
  return stats.searches.length
}

export function savePriceStat(priceStat: PriceStat): void {
  if (typeof window === 'undefined') return

  try {
    const stats = getFlightStats()
    stats.prices.push(priceStat)
    // Keep only last 1000 price records to avoid localStorage overflow
    if (stats.prices.length > 1000) {
      stats.prices = stats.prices.slice(-1000)
    }
    localStorage.setItem('flightStats', JSON.stringify(stats))
  } catch (error) {
    console.error('Failed to save price stat:', error)
  }
}

export function getAveragePrice(origin?: string, destination?: string): number | null {
  const stats = getFlightStats()
  if (stats.prices.length === 0) return null

  let filteredPrices = stats.prices
  if (origin && destination) {
    filteredPrices = stats.prices.filter(
      p => p.origin === origin && p.destination === destination
    )
  }

  if (filteredPrices.length === 0) return null

  const sum = filteredPrices.reduce((acc, p) => acc + p.recommendedPrice, 0)
  return Math.round(sum / filteredPrices.length)
}

export function getPriceTrend(origin?: string, destination?: string): {
  trend: 'up' | 'down' | 'stable'
  percentage: number
} | null {
  const stats = getFlightStats()
  if (stats.prices.length < 2) return null

  let filteredPrices = stats.prices
  if (origin && destination) {
    filteredPrices = stats.prices.filter(
      p => p.origin === origin && p.destination === destination
    )
  }

  if (filteredPrices.length < 2) return null

  // Get recent prices (last 10 records)
  const recentPrices = filteredPrices.slice(-10)
  const olderPrices = filteredPrices.slice(-20, -10)

  if (olderPrices.length === 0) return null

  const recentAvg = recentPrices.reduce((acc, p) => acc + p.recommendedPrice, 0) / recentPrices.length
  const olderAvg = olderPrices.reduce((acc, p) => acc + p.recommendedPrice, 0) / olderPrices.length

  const percentage = Math.round(((recentAvg - olderAvg) / olderAvg) * 100)
  
  if (Math.abs(percentage) < 2) {
    return { trend: 'stable', percentage: 0 }
  }

  return {
    trend: percentage > 0 ? 'up' : 'down',
    percentage: Math.abs(percentage)
  }
}

export function getTotalPriceRecords(): number {
  const stats = getFlightStats()
  return stats.prices.length
}

export function getPopularProvinces(limit: number = 5): Array<{ province: string; count: number }> {
  const stats = getFlightStats()
  if (stats.searches.length === 0) return []

  const provinceCounts: Record<string, number> = {}
  
  stats.searches.forEach((search) => {
    // Support both new format (destination) and legacy format (country)
    const province = search.destination || search.country || ''
    if (province) {
      provinceCounts[province] = (provinceCounts[province] || 0) + 1
    }
  })

  const entries = Object.entries(provinceCounts)
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)

  return entries
}

export function getMonthlySearchStats(): Array<{ month: string; count: number }> {
  const stats = getFlightStats()
  if (!stats || !stats.searches || stats.searches.length === 0) return []

  const monthCounts: Record<string, number> = {}
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ]
  
  stats.searches.forEach((search) => {
    if (search && search.timestamp) {
      try {
        const date = new Date(search.timestamp)
        if (!isNaN(date.getTime())) {
          const monthIndex = date.getMonth()
          const monthName = thaiMonths[monthIndex] || ''
          if (monthName) {
            monthCounts[monthName] = (monthCounts[monthName] || 0) + 1
          }
        }
      } catch {
        // Ignore invalid dates
      }
    }
  })

  // Sort by month order (not by count)
  const monthOrder: Record<string, number> = {
    'มกราคม': 1, 'กุมภาพันธ์': 2, 'มีนาคม': 3, 'เมษายน': 4,
    'พฤษภาคม': 5, 'มิถุนายน': 6, 'กรกฎาคม': 7, 'สิงหาคม': 8,
    'กันยายน': 9, 'ตุลาคม': 10, 'พฤศจิกายน': 11, 'ธันวาคม': 12,
  }

  const entries = Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => (monthOrder[a.month] || 0) - (monthOrder[b.month] || 0))

  return entries
}

