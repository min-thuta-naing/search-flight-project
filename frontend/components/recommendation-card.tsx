'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { SeasonData } from '@/lib/flight-analysis'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDateToUTCString } from '@/lib/utils'

interface RecommendedPeriod {
  startDate: string
  endDate: string
  returnDate: string
  price: number
  airline: string
  season: 'high' | 'normal' | 'low'
  savings: number
}

interface RecommendationCardProps {
  recommendedPeriod: RecommendedPeriod
  seasons: SeasonData[]
  currentSeason: 'high' | 'normal' | 'low'
  priceComparison?: { basePrice?: number; baseAirline?: string } | null  // ✅ เพิ่ม priceComparison เพื่อใช้ basePrice และ baseAirline
  flightPrices?: Array<{  // ✅ เพิ่ม flightPrices เพื่อหาราคาที่ถูกที่สุดจริงๆ
    departure_date: Date | string
    price: number
    trip_type: 'one-way' | 'round-trip'
    airline_name_th?: string
  }>
  searchParams?: {  // ✅ เพิ่ม searchParams เพื่อใช้ startDate และ tripType
    startDate?: Date
    tripType?: 'one-way' | 'round-trip' | null
    passengerCount?: number
    passengers?: {
      adults: number
      children: number
      infants: number
    }
  }
}

export function RecommendationCard({ recommendedPeriod, seasons, currentSeason, priceComparison, flightPrices, searchParams }: RecommendationCardProps) {
  const currentSeasonData = seasons.find(s => s.type === currentSeason)
  const lowSeasonData = seasons.find(s => s.type === 'low')
  const lowSeasonMonths = lowSeasonData?.months.join(', ') || ''
  
  // ✅ หาราคาที่ถูกที่สุดจาก flightPrices (ข้อมูลเดียวกับ AirlineFlights) ถ้ามี
  // เพื่อให้ราคาเท่ากับราคาใน AirlineFlights
  let currentPrice = priceComparison?.basePrice || 0
  
  // ✅ ถ้ามี flightPrices และ startDate ให้หาราคาที่ถูกที่สุดจาก flightPrices
  if (flightPrices && flightPrices.length > 0 && searchParams?.startDate) {
    const startDate = searchParams.startDate
    const tripType = searchParams.tripType || 'round-trip'
    const passengerCount = searchParams.passengerCount || 1
    
    // ✅ ใช้ UTC methods เพื่อให้สอดคล้องกับ backend
    // Backend ใช้ parseISO(dateOnly + 'T00:00:00.000Z') ซึ่งสร้าง UTC date
    const startDateStr = formatDateToUTCString(startDate) || ''
    
    // ✅ Normalize flight date เป็น UTC date string (ใช้ utility function)
    const normalizeFlightDate = (date: Date | string): string => {
      return formatDateToUTCString(date) || ''
    }
    
    // Filter เที่ยวบินในวันที่เลือกและ tripType ที่ตรงกัน
    const matchingFlights = flightPrices.filter(fp => {
      if (fp.trip_type !== tripType) {
        return false
      }
      const fpDateStr = normalizeFlightDate(fp.departure_date)
      return fpDateStr === startDateStr
    })
    
    // หาราคาที่ถูกที่สุด
    if (matchingFlights.length > 0) {
      const cheapestPrice = Math.min(...matchingFlights.map(fp => fp.price))
      // currentPrice = Math.round(cheapestPrice * passengerCount)
      currentPrice = Math.round(cheapestPrice)
      
      // ✅ อัพเดท baseAirline จากเที่ยวบินที่ถูกที่สุด
      if (priceComparison && !priceComparison.baseAirline) {
        const cheapestFlight = matchingFlights.find(fp => fp.price === cheapestPrice)
        if (cheapestFlight?.airline_name_th) {
          priceComparison.baseAirline = cheapestFlight.airline_name_th
        }
      }
    }
  }
  
  // Fallback: Calculate current price from priceRange if basePrice is not available
  if (currentPrice === 0) {
    currentPrice = currentSeasonData?.bestDeal.price || 0
  if (currentPrice === 0 && currentSeasonData?.priceRange) {
    // Use average of priceRange if bestDeal.price is 0
    const { min, max } = currentSeasonData.priceRange
    if (min > 0 && max > 0) {
      currentPrice = Math.round((min + max) / 2)
    } else if (min > 0) {
      currentPrice = min
    } else if (max > 0) {
      currentPrice = max
    }
  }
  // Fallback to recommendedPeriod.price if still 0
  if (currentPrice === 0) {
    currentPrice = recommendedPeriod.price || 0
    }
  }

  const isLowSeason = currentSeason === 'low'
  const isHighSeason = currentSeason === 'high'
  const isNormalSeason = currentSeason === 'normal'
  
  // Calculate season comparisons
  const normalSeasonData = seasons.find(s => s.type === 'normal')
  const highSeasonData = seasons.find(s => s.type === 'high')
  
  // Get price for each season (use bestDeal or average of priceRange)
  const getSeasonPrice = (seasonData: SeasonData | undefined): number => {
    if (!seasonData) return 0
    // ✅ Priority 1: Use bestDeal.price if available and > 0
    if (seasonData.bestDeal?.price && seasonData.bestDeal.price > 0) {
      return seasonData.bestDeal.price
    }
    // ✅ Priority 2: Use average of priceRange if available
    const { min, max } = seasonData.priceRange
    if (min > 0 && max > 0) {
      return Math.round((min + max) / 2)
    }
    // ✅ Priority 3: Use min or max if one is available
    if (min > 0) return min
    if (max > 0) return max
    // ❌ REMOVED: Fallback to currentPrice - this causes Low and High Season to show same price
    // Each season should have its own price from backend data
    // Last resort: return 0 (will show "-" in UI)
    return 0
  }
  
  // ✅ ใช้ bestDeal.price ของ currentSeason เป็นฐานในการเปรียบเทียบ
  // เพื่อให้การเปรียบเทียบยุติธรรม (bestDeal vs bestDeal)
  const currentSeasonBestDealPrice = getSeasonPrice(currentSeasonData)
  const comparisonBasePrice = currentSeasonBestDealPrice > 0 
    ? currentSeasonBestDealPrice 
    : currentPrice // Fallback to currentPrice if bestDeal not available
  
  const seasonComparisons = [
    {
      type: 'low' as const,
      name: 'Low Season',
      data: lowSeasonData,
      price: getSeasonPrice(lowSeasonData),
      months: lowSeasonData?.months.join(', ') || '',
      priceRange: lowSeasonData?.priceRange || { min: 0, max: 0 },
    },
    {
      type: 'normal' as const,
      name: 'Normal Season',
      data: normalSeasonData,
      price: getSeasonPrice(normalSeasonData),
      months: normalSeasonData?.months.join(', ') || '',
      priceRange: normalSeasonData?.priceRange || { min: 0, max: 0 },
    },
    {
      type: 'high' as const,
      name: 'High Season',
      data: highSeasonData,
      price: getSeasonPrice(highSeasonData),
      months: highSeasonData?.months.join(', ') || '',
      priceRange: highSeasonData?.priceRange || { min: 0, max: 0 },
    },
  ].map(comp => {
    const difference = comp.price - comparisonBasePrice  // ✅ ใช้ comparisonBasePrice แทน currentPrice
    const percentage = comparisonBasePrice > 0 
      ? Math.round((difference / comparisonBasePrice) * 100) 
      : 0
    return {
      ...comp,
      difference,
      percentage,
    }
  }).filter(comp => comp.type !== currentSeason) // Filter out current season
  
  // Get card border and background color based on season
  const getCardClassName = () => {
    if (isLowSeason) {
      return 'border-green-500 bg-green-50/50'
    } else if (isNormalSeason) {
      return 'border-blue-500 bg-blue-50/50'
    } else {
      return 'border-red-500 bg-red-50/50'
    }
  }
  
  return (
    <Card 
      className={`p-8 border-2 h-full ${getCardClassName()}`}
    >
      <div className="flex items-start gap-6">
        {(isLowSeason || isHighSeason || isNormalSeason) && (
          <div 
            className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
              isLowSeason ? '' : 
              isNormalSeason ? 'bg-blue-500' : 
              'bg-red-500'
            }`}
            style={isLowSeason ? { backgroundColor: '#4bb836' } : undefined}
          >
            {isLowSeason ? (
              <TrendingDown className="w-7 h-7 text-white" />
            ) : isNormalSeason ? (
              <Minus className="w-7 h-7 text-white" />
            ) : (
              <TrendingUp className="w-7 h-7 text-white" />
            )}
          </div>
        )}
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold">{'คำแนะนำของเรา'}</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                  aria-label="เปรียบเทียบกับ Season อื่นๆ"
                >
                  <Info className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-96" align="start">
                <div className="space-y-4">
                  <div className="font-semibold text-sm mb-2">
                    {'เปรียบเทียบกับ Season อื่นๆ'}
                  </div>
                  
                  {/* Current Season */}
                  <div className="p-3 bg-background rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {currentSeason === 'low' ? 'Low Season' : 
                         currentSeason === 'normal' ? 'Normal Season' : 'High Season'}
                        {' (ปัจจุบัน)'}
                      </span>
                      <div 
                        className={`text-sm font-bold ${currentSeason === 'low' ? 'text-green-600' : currentSeason === 'high' ? 'text-red-600' : 'text-blue-600'}`}
                      >
                        {'฿'}{comparisonBasePrice > 0 ? comparisonBasePrice.toLocaleString() : currentPrice > 0 ? currentPrice.toLocaleString() : '-'}
                      </div>
                    </div>
                    {currentSeasonData && (
                      <div className="text-xs text-muted-foreground">
                        {'ช่วง: '}{currentSeasonData.months.join(', ')}
                      </div>
                    )}
                    {currentSeasonData && currentSeasonData.priceRange.min > 0 && currentSeasonData.priceRange.max > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {'ราคา: ฿'}{currentSeasonData.priceRange.min.toLocaleString()}
                        {' - ฿'}{currentSeasonData.priceRange.max.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Other Seasons */}
                  <div className="space-y-2">
                    {seasonComparisons.map((comp) => {
                      const isCheaper = comp.difference < 0
                      const compColor = comp.type === 'low' ? 'text-green-600' : 
                                       comp.type === 'normal' ? 'text-blue-600' : 'text-red-600'
                      
                      return (
                        <div key={comp.type} className="p-3 bg-background rounded-lg border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comp.name}</span>
                            <div className={`text-sm font-bold ${compColor}`}>
                              {'฿'}{comp.price > 0 ? comp.price.toLocaleString() : '-'}
                            </div>
                          </div>
                          {/* ✅ Always show months if available */}
                          {comp.months && (
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">
                                {'ช่วง: '}{comp.months || 'ไม่มีข้อมูล'}
                              </span>
                              {/* ✅ Show percentage comparison only if both prices are available */}
                              {comp.price > 0 && comparisonBasePrice > 0 && (
                                <span className={isCheaper ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {isCheaper ? 'ถูกกว่า' : 'แพงกว่า'} {Math.abs(comp.percentage)}%
                                </span>
                              )}
                            </div>
                          )}
                          {/* ✅ Always show price range if available */}
                          {comp.priceRange.min > 0 && comp.priceRange.max > 0 ? (
                            <div className="text-xs text-muted-foreground">
                              {'ราคา: ฿'}{comp.priceRange.min.toLocaleString()}
                              {' - ฿'}{comp.priceRange.max.toLocaleString()}
                            </div>
                          ) : comp.price > 0 ? (
                            // ✅ Fallback: Show single price if priceRange not available
                            <div className="text-xs text-muted-foreground">
                              {'ราคา: ฿'}{comp.price.toLocaleString()}
                            </div>
                          ) : (
                            // ✅ Show message if no price data
                            <div className="text-xs text-muted-foreground italic">
                              {'ไม่มีข้อมูลราคาในช่วงนี้'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <Badge className={
              isLowSeason ? 'bg-green-500 text-white' : 
              isNormalSeason ? 'bg-blue-500 text-white' : 
              'bg-red-500 text-white'
            }>
              {currentSeason === 'low' ? 'Low Season' : 
               currentSeason === 'normal' ? 'Normal Season' : 'High Season'}
            </Badge>
          </div>
          
          {currentSeason === 'low' ? (
            <>
              <p className="text-lg mb-4 leading-relaxed">
                {'ตอนนี้อยู่ในช่วง Low Season ราคาตั๋วเครื่องบินต่ำสุด เหมาะสำหรับการจองทันที'}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-2">{'ราคาวันนี้ (Low Season)'}</div>
                  {(currentPrice > 0 || recommendedPeriod.price > 0) ? (
                    <>
                      <div className="text-2xl font-bold text-green-600">
                        {'฿'}{(currentPrice > 0 ? currentPrice : recommendedPeriod.price).toLocaleString()}
                      </div>
                      {(priceComparison?.baseAirline || recommendedPeriod.airline) && (
                        <div className="text-sm text-muted-foreground mt-2">
                          {'สายการบิน: '}
                          <span className="font-semibold">{priceComparison?.baseAirline || recommendedPeriod.airline}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {'กำลังรอข้อมูลราคา'}
                    </div>
                  )}
                </div>
                <div className="p-5 bg-background rounded-lg border">
                  <div className="text-sm text-muted-foreground mb-2">{'เปรียบเทียบกับ Season อื่นๆ'}</div>
                  {seasonComparisons.length > 0 ? (
                    <div className="space-y-2">
                      {seasonComparisons.map((comp) => {
                        // ✅ ใช้ bestDeal price ของ Low Season สำหรับเปรียบเทียบ
                        const lowSeasonBestDealPrice = getSeasonPrice(lowSeasonData)
                        const lowSeasonPrice = lowSeasonBestDealPrice > 0 ? lowSeasonBestDealPrice : (currentPrice > 0 ? currentPrice : recommendedPeriod.price)
                        const isMoreExpensive = comp.price > lowSeasonPrice
                        const difference = comp.price - lowSeasonPrice
                        const percentage = lowSeasonPrice > 0 
                          ? Math.round((difference / lowSeasonPrice) * 100) 
                          : 0
                        const compColor = comp.type === 'normal' ? 'text-blue-600' : 'text-red-600'
                        return (
                          <div key={comp.type} className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{comp.name}:</span>
                            <span className={`font-semibold ${compColor}`}>
                              {isMoreExpensive ? 'แพงกว่า' : 'ถูกกว่า'} {Math.abs(percentage)}%
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {'ไม่มีข้อมูลเปรียบเทียบ'}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="text-lg mb-4 leading-relaxed">
                {currentSeason === 'high' 
                  ? 'ตอนนี้อยู่ในช่วง High Season ราคาตั๋วเครื่องบินสูงสุด แนะนำให้จองในช่วง Low Season เพื่อประหยัดค่าใช้จ่าย'
                  : 'ตอนนี้อยู่ในช่วง Normal Season แนะนำให้จองในช่วง Low Season เพื่อประหยัดค่าใช้จ่ายมากขึ้น'}
              </p>
              {currentSeason === 'high' ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 bg-background rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">{'แนะนำจองในช่วง Low Season'}</div>
                    {lowSeasonData && (
                      (lowSeasonData.priceRange.min > 0 && lowSeasonData.priceRange.max > 0) || 
                      (lowSeasonData.bestDeal?.price && lowSeasonData.bestDeal.price > 0)
                    ) ? (
                      <>
                        {lowSeasonData.priceRange.min > 0 && lowSeasonData.priceRange.max > 0 ? (
                          <div className="text-sm text-muted-foreground mb-2">
                            {'ราคา: ฿'}{lowSeasonData.priceRange.min.toLocaleString()}
                            {' - ฿'}{lowSeasonData.priceRange.max.toLocaleString()}
                          </div>
                        ) : lowSeasonData.bestDeal?.price && lowSeasonData.bestDeal.price > 0 ? (
                          <div className="text-2xl font-bold mb-2" style={{ color: '#4bb836' }}>
                            {'฿'}{lowSeasonData.bestDeal.price.toLocaleString()}
                          </div>
                        ) : null}
                        {lowSeasonData.bestDeal?.airline && (
                          <div className="text-sm text-muted-foreground">
                            {'สายการบินที่ถูกที่สุด: '}
                            <span 
                              className="font-semibold"
                              style={{ color: '#4bb836' }}
                            >
                              {lowSeasonData.bestDeal.airline}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {'ยังไม่มีข้อมูลราคาสำหรับ Low Season ในช่วงเวลานี้'}
                        <br />
                        <span className="text-xs">{'แนะนำให้ตรวจสอบข้อมูลใหม่ในภายหลัง'}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 bg-background rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">{'ราคาวันนี้ (High Season)'}</div>
                    {currentPrice > 0 ? (
                      <>
                      <div className="text-2xl font-bold text-red-600">
                        {'฿'}{currentPrice.toLocaleString()}
                      </div>
                        {priceComparison?.baseAirline && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {'สายการบิน: '}
                            <span className="font-semibold">{priceComparison.baseAirline}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {'กำลังรอข้อมูลราคา'}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-5 bg-background rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">{'แนะนำจองในช่วง Low Season'}</div>
                    {lowSeasonData && (
                      (lowSeasonData.priceRange.min > 0 && lowSeasonData.priceRange.max > 0) || 
                      (lowSeasonData.bestDeal?.price && lowSeasonData.bestDeal.price > 0)
                    ) ? (
                      <>
                        {lowSeasonData.priceRange.min > 0 && lowSeasonData.priceRange.max > 0 ? (
                          <div className="text-sm text-muted-foreground mb-2">
                            {'ราคา: ฿'}{lowSeasonData.priceRange.min.toLocaleString()}
                            {' - ฿'}{lowSeasonData.priceRange.max.toLocaleString()}
                          </div>
                        ) : lowSeasonData.bestDeal?.price && lowSeasonData.bestDeal.price > 0 ? (
                          <div className="text-2xl font-bold mb-2" style={{ color: '#4bb836' }}>
                            {'฿'}{lowSeasonData.bestDeal.price.toLocaleString()}
                          </div>
                        ) : null}
                        {lowSeasonData.bestDeal?.airline && (
                          <div className="text-sm text-muted-foreground">
                            {'สายการบินที่ถูกที่สุด: '}
                            <span 
                              className="font-semibold"
                              style={{ color: '#4bb836' }}
                            >
                              {lowSeasonData.bestDeal.airline}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {'ยังไม่มีข้อมูลราคาสำหรับ Low Season ในช่วงเวลานี้'}
                        <br />
                        <span className="text-xs">{'แนะนำให้ตรวจสอบข้อมูลใหม่ในภายหลัง'}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5 bg-background rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">{'ราคาวันนี้ (Normal Season)'}</div>
                    {currentPrice > 0 ? (
                      <>
                      <div className="text-2xl font-bold text-blue-600">
                        {'฿'}{currentPrice.toLocaleString()}
                      </div>
                        {priceComparison?.baseAirline && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {'สายการบิน: '}
                            <span className="font-semibold">{priceComparison.baseAirline}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        {'กำลังรอข้อมูลราคา'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Card>
  )
}


