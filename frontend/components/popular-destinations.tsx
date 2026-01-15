'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Users } from 'lucide-react'
import { statisticsApi } from '@/lib/api/statistics-api'
import { destinationApi } from '@/lib/api/destination-api'
import { flightApi } from '@/lib/api/flight-api'
import { PROVINCES, thaiMonths } from '@/services/data/constants'
import { FlightSearchParams } from '@/components/flight-search-form'
import { formatDateToUTCString } from '@/lib/utils'

// Mapping สำหรับรูปภาพของแต่ละจังหวัด (ใช้ province value)
// ใช้ชื่อไฟล์ตรงกับชื่อจังหวัด (province value) + '.jpg'
// ถ้าไม่มีรูปจริง จะ fallback ไปใช้ placeholder.svg ตาม logic ใน onError
const provinceImages: Record<string, string> = {
  // ภาคกลาง & ตะวันออก
  'bangkok': '/bangkok.jpg',
  'rayong': '/rayong.jpg',
  'trat': '/trat.jpg',
  'prachuap-khiri-khan': '/prachuap-khiri-khan.jpg',
  'chonburi': '/chonburi.jpg',
  'kanchanaburi': '/kanchanaburi.jpg',
  
  // ภาคเหนือ
  'chiang-mai': '/chiang-mai.jpg',
  'chiang-rai': '/chiang-rai.jpg',
  'lampang': '/lampang.jpg',
  'mae-hong-son': '/mae-hong-son.jpg',
  'nan': '/nan.jpg',
  'phrae': '/phrae.jpg',
  'phitsanulok': '/phitsanulok.jpg',
  'sukhothai': '/sukhothai.jpg',
  'tak': '/tak.jpg',
  
  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  'udon-thani': '/udon-thani.jpg',
  'khon-kaen': '/khon-kaen.jpg',
  'nakhon-ratchasima': '/nakhon-ratchasima.jpg',
  'ubon-ratchathani': '/ubon-ratchathani.jpg',
  'nakhon-phanom': '/nakhon-phanom.jpg',
  'sakon-nakhon': '/sakon-nakhon.jpg',
  'roi-et': '/roi-et.jpg',
  'loei': '/loei.jpg',
  'buri-ram': '/buri-ram.jpg',
  
  // ภาคใต้
  'phuket': '/phuket.jpg',
  'krabi': '/krabi.jpg',
  'songkhla': '/songkhla.jpg',
  'hat-yai': '/hat-yai.jpg',
  'surat-thani': '/surat-thani.jpg',
  'nakhon-si-thammarat': '/nakhon-si-thammarat.jpg',
  'trang': '/trang.jpg',
  'ranong': '/ranong.jpg',
  'chumphon': '/chumphon.jpg',
  'narathiwat': '/narathiwat.jpg',
}

// Mock average prices - ใช้ราคาเบื้องต้นที่หลากหลายขึ้น
// หมายเหตุ: สามารถดึงจาก API ได้ในอนาคตด้วย statisticsApi.getPriceStatistics(origin, destination)
const mockAveragePrices: Record<string, number> = {
  // ภาคเหนือ
  'chiang-mai': 3500,
  'chiang-rai': 3800,
  'lampang': 3200,
  'mae-hong-son': 4000,
  'nan': 3300,
  'phrae': 3100,
  'phitsanulok': 2900,
  'sukhothai': 3000,
  'tak': 2800,
  
  // ภาคอีสาน
  'khon-kaen': 2800,
  'udon-thani': 2700,
  'nakhon-ratchasima': 2600,
  'ubon-ratchathani': 3100,
  'nakhon-phanom': 3200,
  'sakon-nakhon': 3000,
  'roi-et': 2900,
  'loei': 3100,
  'buri-ram': 2700,
  
  // ภาคใต้
  'phuket': 3200,
  'songkhla': 2500,
  'hat-yai': 2500,
  'krabi': 3000,
  'surat-thani': 2800,
  'nakhon-si-thammarat': 2400,
  'trang': 2600,
  'ranong': 2900,
  'chumphon': 2700,
  'narathiwat': 3300,
  
  // ภาคกลางและตะวันออก
  'bangkok': 2000, // เที่ยวในประเทศจากกรุงเทพ
  'chonburi': 1800,
  'rayong': 2200,
  'trat': 2500,
  'prachuap-khiri-khan': 2300,
  'kanchanaburi': 2100,
}

// Mock trends - ใช้ค่าเบื้องต้นที่หลากหลาย
const mockTrends: Record<string, string> = {
  'chiang-mai': '+15%',
  'chiang-rai': '+12%',
  'phuket': '+22%',
  'krabi': '+8%',
  'songkhla': '+18%',
  'hat-yai': '+18%',
  'khon-kaen': '+12%',
  'udon-thani': '+10%',
  'nakhon-ratchasima': '+9%',
  'rayong': '+5%',
  'trat': '+7%',
  'prachuap-khiri-khan': '+6%',
}

interface PopularDestinationDisplay {
  destination: string
  destinationName: string | null
  count: number
  provinceValue: string
  image: string
  cheapestPrice: string
  airlineName: string | null
  cheapestDate: string | null // ✅ เพิ่มวันที่ของราคาต่ำสุด
  trend: string
  popular: boolean
}

interface PopularDestinationsProps {
  flightPrices?: Array<{
    id: number
    airline_id: number
    airline_code: string
    airline_name: string
    airline_name_th: string
    departure_date: Date | string
    return_date: Date | string | null
    price: number
    base_price: number
    departure_time: string
    arrival_time: string
    duration: number
    flight_number: string
    trip_type: 'one-way' | 'round-trip'
    season: 'high' | 'normal' | 'low'
    origin?: string
    destination?: string
  }> | null
  currentSearchParams?: FlightSearchParams | null
  onSearch?: (params: FlightSearchParams) => void
}

/**
 * Parse Thai date string to Date object
 * Format: "27 ม.ค. 2569" (Buddhist Era) -> Date(2026, 0, 27)
 */
function parseThaiDate(dateString: string): Date | null {
  try {
    // Format: "27 ม.ค. 2569" or "27 ม.ค. 2569" (Buddhist Era)
    const match = dateString.match(/(\d+)\s+([^\s]+)\s+(\d+)/)
    if (!match) return null
    
    const day = parseInt(match[1], 10)
    const monthAbbr = match[2].trim()
    const buddhistYear = parseInt(match[3], 10)
    
    // Convert Buddhist Era to AD (subtract 543)
    const adYear = buddhistYear - 543
    
    // Find month index from Thai month abbreviations
    const monthIndex = thaiMonths.findIndex(m => m === monthAbbr)
    if (monthIndex === -1) return null
    
    return new Date(adYear, monthIndex, day)
  } catch (error) {
    console.error('Error parsing Thai date:', error)
    return null
  }
}

/**
 * Extract price number from price string
 * Format: "฿880" or "฿1,128" -> 880 or 1128
 */
function extractPrice(priceString: string): number | null {
  try {
    // Remove ฿ and commas, then parse
    const cleaned = priceString.replace(/฿|,/g, '').trim()
    const price = parseInt(cleaned, 10)
    return isNaN(price) ? null : price
  } catch (error) {
    console.error('Error extracting price:', error)
    return null
  }
}

export function PopularDestinations({ flightPrices, currentSearchParams, onSearch }: PopularDestinationsProps = {}) {
  const [destinations, setDestinations] = useState<PopularDestinationDisplay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPopularDestinations = async () => {
      try {
        setLoading(true)
        const stats = await statisticsApi.getStatistics()
        
        // แปลงข้อมูลจาก API เป็นรูปแบบที่ต้องการ
        const destinationsDataPromises = stats.popularDestinations
          .slice(0, 4) // แสดงแค่ 4 อันดับแรก
          .map(async (dest, index) => {
            // หา province value จาก destination name หรือ destination value
            const province = PROVINCES.find(p => 
              p.label === dest.destination_name || 
              p.value === dest.destination ||
              dest.destination_name?.includes(p.label) ||
              p.label.includes(dest.destination_name || '')
            )
            
            const provinceValue = province?.value || dest.destination
            const displayName = dest.destination_name || province?.label || dest.destination
            
            // ดึงข้อมูลราคาต่ำสุดและสายการบิน
            let cheapestPrice: number | null = null
            let airlineName: string | null = null
            let cheapestDate: string | null = null // ✅ เพิ่มวันที่ของราคาต่ำสุด
            let trend = '0%' // ✅ ไม่ใช้ mockTrends แล้ว ใช้ 0% เป็นค่าเริ่มต้น
            
            // ✅ ตรวจสอบว่ามีข้อมูล flightPrices จาก airline-flights หรือไม่ (ถ้าปลายทางตรงกัน)
            // เปรียบเทียบทั้ง destination value และ province value
            const searchDestinationProvince = currentSearchParams?.destination 
              ? PROVINCES.find(p => 
                  p.value === currentSearchParams.destination || 
                  p.label === currentSearchParams.destination
                )
              : null
            const hasMatchingFlightPrices = flightPrices && 
              flightPrices.length > 0 &&
              currentSearchParams?.origin === 'bangkok' &&
              (currentSearchParams?.destination === dest.destination ||
               currentSearchParams?.destination === provinceValue ||
               searchDestinationProvince?.value === provinceValue ||
               searchDestinationProvince?.value === dest.destination)
            
            if (hasMatchingFlightPrices && flightPrices.length > 0) {
              // ✅ ใช้ข้อมูลจาก airline-flights (ราคาที่ถูกที่สุดจากที่แนะนำ)
              const cheapest = flightPrices.reduce((min, flight) => 
                flight.price < min.price ? flight : min
              )
              
              cheapestPrice = cheapest.price
              airlineName = cheapest.airline_name_th || cheapest.airline_name || null
              // ✅ เก็บวันที่ของเที่ยวบินที่ถูกที่สุด
              if (cheapest.departure_date) {
                const date = typeof cheapest.departure_date === 'string' 
                  ? new Date(cheapest.departure_date) 
                  : cheapest.departure_date
                cheapestDate = date.toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })
              }
              
              console.log(`✅ [REAL DATA - AirlineFlights] ${dest.destination} (${displayName}): ${airlineName || 'Unknown'} - ฿${cheapestPrice}`, {
                totalFlights: flightPrices.length,
                cheapestFlight: cheapest
              })
            } else {
              // ✅ ถ้าไม่มีข้อมูลจาก airline-flights ให้ไปดึงข้อมูลใหม่
              try {
                const today = new Date()
                const futureDate = new Date()
                futureDate.setDate(futureDate.getDate() + 90) // ดูข้อมูล 90 วันข้างหน้า
                
                const fetchedFlightPrices = await flightApi.getFlightPrices({
                  origin: 'bangkok',
                  destination: dest.destination,
                  startDate: today.toISOString().split('T')[0],
                  endDate: futureDate.toISOString().split('T')[0],
                  tripType: 'one-way',
                  passengerCount: 1,
                  selectedAirlines: [],
                  travelClass: 'economy',
                })
                
                // หาเที่ยวบินที่ถูกที่สุด
                if (fetchedFlightPrices && fetchedFlightPrices.length > 0) {
                  const cheapest = fetchedFlightPrices.reduce((min, flight) => 
                    flight.price < min.price ? flight : min
                  )
                  
                  cheapestPrice = cheapest.price
                  airlineName = cheapest.airline_name_th || cheapest.airline_name || cheapest.airline || null
                  // ✅ เก็บวันที่ของเที่ยวบินที่ถูกที่สุด
                  if (cheapest.departureDate) {
                    const date = new Date(cheapest.departureDate)
                    cheapestDate = date.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  } else {
                    // Fallback: ใช้ startDate ที่ส่งไป (ไม่แม่นยำ 100% แต่ดีกว่าไม่มี)
                    cheapestDate = today.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })
                  }
                  
                  console.log(`✅ [REAL DATA - API] ${dest.destination} (${displayName}): ${airlineName || 'Unknown'} - ฿${cheapestPrice}`, {
                    totalFlights: fetchedFlightPrices.length,
                    cheapestFlight: cheapest
                  })
                } else {
                  console.warn(`⚠️ [NO DATA - API] ${dest.destination}: API returned empty array`)
                }
              
              } catch (flightError) {
                // ถ้า API error หรือไม่มีข้อมูล ให้ใช้ mock data
                console.warn(`⚠️ [MOCK DATA - API Error] ${dest.destination} (${displayName}): ${flightError instanceof Error ? flightError.message : 'Unknown error'}`, {
                  error: flightError,
                  usingMockPrice: mockAveragePrices[provinceValue] || null
                })
                cheapestPrice = mockAveragePrices[provinceValue] || null
              }
            }
            
            // ✅ ดึง search trend (จำนวนคนค้นหาเพิ่มขึ้น/ลดลง) จาก statistics API
            try {
              const priceStats = await statisticsApi.getPriceStatistics('bangkok', dest.destination)
              console.log(`[PopularDestinations] ${dest.destination} - priceStats:`, {
                searchTrend: priceStats.searchTrend,
                priceTrend: priceStats.priceTrend,
              })
              // ใช้ searchTrend แทน priceTrend (จำนวนคนค้นหาเพิ่มขึ้น/ลดลง)
              if (priceStats.searchTrend) {
                const { trend: trendType, percentage } = priceStats.searchTrend
                console.log(`[PopularDestinations] ${dest.destination} - Using searchTrend: ${trendType} ${percentage}%`)
                if (trendType === 'up') {
                  trend = `+${percentage}%`
                } else if (trendType === 'down') {
                  trend = `-${percentage}%`
                } else {
                  trend = '0%'
                }
              } else if (priceStats.priceTrend) {
                // Fallback: ถ้าไม่มี searchTrend ใช้ priceTrend (ราคา)
                console.log(`[PopularDestinations] ${dest.destination} - Using priceTrend (fallback):`, priceStats.priceTrend)
                const { trend: trendType, percentage } = priceStats.priceTrend
                if (trendType === 'up') {
                  trend = `+${percentage}%`
                } else if (trendType === 'down') {
                  trend = `-${percentage}%`
                } else {
                  trend = '0%'
                }
              } else {
                console.log(`[PopularDestinations] ${dest.destination} - No trend data, using 0%`)
                trend = '0%' // ✅ แสดง 0% เมื่อไม่มีข้อมูลจาก API
              }
            } catch (trendError) {
              // ถ้าไม่มี trend data แสดง 0%
              console.warn(`[PopularDestinations] No trend data for ${dest.destination}, using 0%`, trendError)
              trend = '0%' // ✅ แสดง 0% เมื่อเกิด error
            }
            
            // ถ้ายังไม่มีราคา ให้ใช้ค่า default ตามระยะทางคร่าวๆ
            if (cheapestPrice === null) {
              const fallbackPrice = (() => {
                if (provinceValue.includes('chiang') || provinceValue.includes('mae')) {
                  return 3500
                } else if (provinceValue.includes('phuket') || provinceValue.includes('krabi')) {
                  return 3200
                } else if (provinceValue.includes('rayong') || provinceValue.includes('trat') || provinceValue.includes('prachuap')) {
                  return 2200
                } else if (provinceValue.includes('khon') || provinceValue.includes('udon') || provinceValue.includes('nakhon-ratchasima')) {
                  return 2700
                } else {
                  return 2800
                }
              })()
              
              console.warn(`⚠️ [MOCK DATA - Fallback] ${dest.destination} (${displayName}): No price data, using fallback ฿${fallbackPrice}`)
              cheapestPrice = fallbackPrice
            }
            
            return {
              destination: dest.destination,
              destinationName: displayName,
              count: dest.count,
              provinceValue,
              image: provinceImages[provinceValue] || '/placeholder.svg',
              cheapestPrice: `฿${Math.round(cheapestPrice).toLocaleString()}`,
              airlineName: airlineName,
              cheapestDate: cheapestDate, // ✅ เพิ่มวันที่
              trend: trend,
              popular: index === 0,
            }
          })
        
        const destinationsData = await Promise.all(destinationsDataPromises)
        setDestinations(destinationsData)
      } catch (error) {
        console.error('Error fetching popular destinations:', error)
        // Fallback to empty array on error
        setDestinations([])
      } finally {
        setLoading(false)
      }
    }

    fetchPopularDestinations()
  }, [flightPrices, currentSearchParams])

  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{'ปลายทางยอดนิยม'}</h2>
          <p className="text-muted-foreground">
            {'ดูว่าคนอื่นๆ กำลังค้นหาเที่ยวบินไปที่ไหนกัน'}
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden">
              <div className="h-48 bg-muted animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (destinations.length === 0) {
    return (
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">{'ปลายทางยอดนิยม'}</h2>
          <p className="text-muted-foreground">
            {'ดูว่าคนอื่นๆ กำลังค้นหาเที่ยวบินไปที่ไหนกัน'}
          </p>
        </div>
        <div className="text-center py-12 text-muted-foreground">
          ยังไม่มีข้อมูลการค้นหา
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-2">{'ปลายทางยอดนิยม'}</h2>
        <p className="text-muted-foreground">
          {'ดูว่าคนอื่นๆ กำลังค้นหาเที่ยวบินไปที่ไหนกัน'}
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {destinations.map((dest) => {
          const handleCardClick = () => {
            if (!onSearch) return
            
            // Parse date from Thai format
            const searchDate = dest.cheapestDate ? parseThaiDate(dest.cheapestDate) : null
            if (!searchDate) {
              console.warn('Cannot parse date:', dest.cheapestDate)
              return
            }
            
            // Get origin and destination provinces
            const originProvince = PROVINCES.find(p => p.value === 'bangkok') || PROVINCES[0]
            const destinationProvince = PROVINCES.find(p => 
              p.value === dest.provinceValue || 
              p.label === dest.destinationName
            )
            
            if (!destinationProvince) {
              console.warn('Cannot find destination province:', dest.provinceValue, dest.destinationName)
              return
            }
            
            // Create search params
            const searchParams: FlightSearchParams = {
              origin: originProvince.value,
              originName: originProvince.label,
              destination: destinationProvince.value,
              destinationName: destinationProvince.label,
              durationRange: { min: 3, max: 5 }, // Default duration
              selectedAirlines: [],
              startDate: searchDate,
              endDate: undefined,
              tripType: 'one-way',
              passengerCount: 1,
              travelClass: 'economy',
            }
            
            onSearch(searchParams)
          }
          
          return (
          <Card 
            key={dest.destination} 
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer p-0"
            onClick={handleCardClick}
          >
            <div className="relative h-48 bg-muted rounded-t-xl">
              <img 
                src={dest.image || "/placeholder.svg"} 
                alt={dest.destinationName || dest.destination}
                className="w-full h-full object-cover rounded-t-xl"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = '/placeholder.svg'
                }}
              />
              {dest.popular && (
                <div className="absolute top-0 left-0 z-10">
                  <div 
                    className="bg-yellow-500 px-4 py-2"
                    style={{
                      borderTopLeftRadius: '0.5rem',
                      borderTopRightRadius: '0',
                      borderBottomLeftRadius: '0',
                      borderBottomRightRadius: '0.5rem',
                    }}
                  >
                    <span className="font-semibold text-sm" style={{ color: '#0055a4' }}>
                      {'ยอดนิยม'}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 rounded-b-xl">
              <h3 className="font-bold text-lg mb-3">{dest.destinationName || dest.destination}</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{dest.count.toLocaleString()} {'ครั้ง'}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-sm ${
                    dest.trend.startsWith('-') 
                      ? 'text-red-600' 
                      : dest.trend.startsWith('+') 
                        ? 'text-green-600' 
                        : 'text-muted-foreground'
                  }`}>
                    {dest.trend.startsWith('-') ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    <span>{dest.trend}</span>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground mb-1">{'ราคาถูกที่สุด'}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xl font-bold text-primary">{dest.cheapestPrice}</div>
                    {dest.airlineName && (
                      <div className="text-sm text-muted-foreground">• {dest.airlineName}</div>
                    )}
                  </div>
                  {dest.cheapestDate && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {'วันที่: '}{dest.cheapestDate}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
          )
        })}
      </div>
    </div>
  )
}
