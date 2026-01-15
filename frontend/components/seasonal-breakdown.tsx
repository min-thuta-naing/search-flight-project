'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, Info, AlertCircle, TrendingUp, Minus } from 'lucide-react'
import { SeasonData } from '@/lib/flight-analysis'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogOverlay } from '@/components/ui/dialog'
// Note: defaultSeasons removed - seasons should come from Backend API
// Fallback empty array if no seasons provided
import { getSeasonDetails, type Region } from '@/services/data/season-details'
import { provinceToRegion } from '@/services/data/season-config'
import { thaiMonths, thaiMonthsFull } from '@/services/data/constants'
import { useState } from 'react'

interface RecommendedPeriod {
  startDate: string
  endDate: string
  returnDate: string
  price: number
  airline: string
  season: 'high' | 'normal' | 'low'
  savings: number
}

interface SeasonalBreakdownProps {
  seasons?: SeasonData[]
  recommendedPeriod?: RecommendedPeriod | null
  destination?: string // เพิ่ม destination เพื่อหา region
  priceComparison?: { basePrice?: number } | null  // ✅ เพิ่ม priceComparison เพื่อใช้ basePrice
  searchParams?: {  // ✅ เพิ่ม searchParams เพื่อใช้ passengerCount
    passengerCount?: number
  }
}

export function SeasonalBreakdown({ seasons: propSeasons, recommendedPeriod, destination, priceComparison, searchParams }: SeasonalBreakdownProps) {
  // ⚠️ NOTE: Seasons should come from Backend API
  // If no seasons provided, show empty state (backend should always provide seasons)
  const seasons = propSeasons || []
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)
  const [selectedSeason, setSelectedSeason] = useState<'high' | 'normal' | 'low' | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  // หา region จาก destination
  const getRegion = (): Region => {
    if (!destination) return 'default'
    const normalizedDestination = destination.toLowerCase().replace(/ /g, '-')
    const normalized = normalizedDestination.startsWith('bangkok-') ? 'bangkok' : normalizedDestination
    const region = provinceToRegion[normalized]
    return (region as Region) || 'default'
  }
  
  const currentRegion = getRegion()

  // Get current month
  const currentMonth = new Date().getMonth()

  // Default season classification (used as fallback only when backend data is missing)
  // Default season classification: Low (May-Sep), Normal (Mar-Apr, Oct), High (Nov-Feb)
  const defaultMonthSeasonMap: Record<number, 'high' | 'normal' | 'low'> = {
    0: 'high',   // มกราคม - Jan
    1: 'high',   // กุมภาพันธ์ - Feb
    2: 'normal', // มีนาคม - Mar
    3: 'normal', // เมษายน - Apr
    4: 'low',    // พฤษภาคม - May
    5: 'low',    // มิถุนายน - Jun
    6: 'low',    // กรกฎาคม - Jul
    7: 'low',    // สิงหาคม - Aug
    8: 'low',    // กันยายน - Sep
    9: 'normal', // ตุลาคม - Oct
    10: 'high',  // พฤศจิกายน - Nov
    11: 'high',  // ธันวาคม - Dec
  }

  // Initialize empty monthSeasonMap - will be populated from backend data
  const monthSeasonMap: Record<number, 'high' | 'normal' | 'low'> = {}

  // Track which months have been assigned to avoid duplicates
  const assignedMonths = new Set<number>()

  // Map months from backend data (prioritize low > normal > high to avoid conflicts)
  // Process in order: low, normal, high to ensure low season takes priority
  const seasonOrder: Array<'low' | 'normal' | 'high'> = ['low', 'normal', 'high']
  seasonOrder.forEach(seasonType => {
    const season = seasons.find(s => s.type === seasonType)
    if (season && season.months && season.months.length > 0) {
      season.months.forEach(monthName => {
        const monthIndex = thaiMonthsFull.findIndex(m => m === monthName)
        if (monthIndex !== -1 && !assignedMonths.has(monthIndex)) {
          monthSeasonMap[monthIndex] = season.type
          assignedMonths.add(monthIndex)
        }
      })
    }
  })

  // Fill in missing months with default classification (only if backend data is incomplete)
  for (let i = 0; i < 12; i++) {
    if (!(i in monthSeasonMap)) {
      monthSeasonMap[i] = defaultMonthSeasonMap[i] || 'normal'
    }
  }

  // Debug logging
  console.log('[SeasonalBreakdown] Seasons data from backend:', seasons.map(s => ({
    type: s.type,
    months: s.months,
    monthsLength: s.months?.length || 0
  })))
  console.log('[SeasonalBreakdown] Assigned months:', Array.from(assignedMonths).sort((a, b) => a - b).map(m => `${m}:${thaiMonthsFull[m]}`))
  console.log('[SeasonalBreakdown] Final monthSeasonMap:', Object.keys(monthSeasonMap).sort((a, b) => parseInt(a) - parseInt(b)).map(m => `${m}:${thaiMonthsFull[parseInt(m)]}=${monthSeasonMap[parseInt(m)]}`))
  console.log('[SeasonalBreakdown] Low season months:', Object.keys(monthSeasonMap).filter(m => monthSeasonMap[parseInt(m)] === 'low').map(m => thaiMonthsFull[parseInt(m)]))
  console.log('[SeasonalBreakdown] Normal season months:', Object.keys(monthSeasonMap).filter(m => monthSeasonMap[parseInt(m)] === 'normal').map(m => thaiMonthsFull[parseInt(m)]))
  console.log('[SeasonalBreakdown] High season months:', Object.keys(monthSeasonMap).filter(m => monthSeasonMap[parseInt(m)] === 'high').map(m => thaiMonthsFull[parseInt(m)]))

  // Get current season
  const currentSeason = monthSeasonMap[currentMonth] || 'normal'

  // Get low season months for recommendation
  const lowSeasonData = seasons.find(s => s.type === 'low')
  const lowSeasonMonths = lowSeasonData?.months.join(', ') || ''

  // Get season color
  const getSeasonColor = (type: 'high' | 'normal' | 'low') => {
    switch (type) {
      case 'low':
        return 'bg-green-500'
      case 'normal':
        return 'bg-blue-500'
      case 'high':
        return 'bg-red-500'
    }
  }

  // Get recommendation styling based on current season
  const getRecommendationConfig = () => {
    switch (currentSeason) {
      case 'low':
        return {
          borderColor: '',
          bgColor: '',
          iconBg: '',
          iconColor: 'text-white',
          icon: TrendingDown,
          badgeBg: '',
          badgeText: 'Low Season',
          priceColor: '',
          savingsColor: '',
          showRecommendation: true,
          customColor: '#4bb836',
        }
      case 'high':
        return {
          borderColor: 'border-red-500',
          bgColor: 'bg-red-500/5',
          iconBg: 'bg-red-500',
          iconColor: 'text-white',
          icon: AlertCircle,
          badgeBg: 'bg-red-500 text-white',
          badgeText: 'High Season',
          priceColor: 'text-red-600',
          savingsColor: 'text-red-600',
          showRecommendation: false,
        }
      case 'normal':
        return {
          borderColor: 'border-blue-500',
          bgColor: 'bg-blue-500/5',
          iconBg: 'bg-blue-500',
          iconColor: 'text-white',
          icon: Minus,
          badgeBg: 'bg-blue-500 text-white',
          badgeText: 'Normal Season',
          priceColor: 'text-blue-600',
          savingsColor: 'text-blue-600',
          showRecommendation: false,
        }
    }
  }

  const recConfig = getRecommendationConfig()
  const RecIcon = recConfig.icon

  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold">{'การแบ่งช่วงตามฤดูกาล'}</h3>
      </div>

      {/* Best Deal Recommendation */}
      {recommendedPeriod && (() => {
        const currentSeasonData = seasons.find(s => s.type === currentSeason)
        const otherSeasons = seasons.filter(s => s.type !== currentSeason)
        const passengerCount = searchParams?.passengerCount || 1
        
        // ✅ ใช้ basePrice จาก priceComparison (ราคาของวันที่เลือกจริงๆ) แทน bestDeal ของ season
        // เพราะ "ถ้าคุณไปก่อน/หลัง" เปรียบเทียบกับ basePrice นี้
        // ✅ แปลงเป็นราคาต่อคนเพื่อเปรียบเทียบได้ง่าย
        const currentPriceTotal = priceComparison?.basePrice || currentSeasonData?.bestDeal.price || recommendedPeriod.price
        const currentPrice = Math.round(currentPriceTotal / passengerCount)
        
        // Calculate comparison with other seasons
        // ✅ แปลงราคาเป็นราคาต่อคนเพื่อเปรียบเทียบได้ง่าย
        const seasonComparisons = otherSeasons.map(season => {
          const seasonPriceTotal = season.bestDeal.price
          const seasonPrice = Math.round(seasonPriceTotal / passengerCount)
          const difference = seasonPrice - currentPrice
          const percentage = Math.round((difference / currentPrice) * 100)
          return {
            type: season.type,
            name: season.type === 'low' ? 'Low Season' : season.type === 'normal' ? 'Normal Season' : 'High Season',
            price: seasonPrice, // ราคาต่อคน
            priceTotal: seasonPriceTotal, // ราคารวม (สำหรับแสดง)
            priceRange: {
              min: Math.round(season.priceRange.min / passengerCount),
              max: Math.round(season.priceRange.max / passengerCount),
              minTotal: season.priceRange.min,
              maxTotal: season.priceRange.max,
            },
            difference,
            percentage,
            months: season.months.join(', '),
            bestDealDates: season.bestDeal.dates, // ✅ เพิ่ม bestDeal dates
            bestDealAirline: season.bestDeal.airline, // ✅ เพิ่ม bestDeal airline
          }
        })

        return (
          <div
            onMouseMove={(e) => {
              setMousePosition({ x: e.clientX, y: e.clientY })
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="relative"
          >
            <Card 
              className={`p-8 mb-6 border-2 cursor-help ${currentSeason === 'low' ? '' : `${recConfig.borderColor} ${recConfig.bgColor}`}`}
              style={currentSeason === 'low' ? {
                borderColor: '#4bb836',
                backgroundColor: 'rgba(75, 184, 54, 0.05)'
              } : undefined}
            >
              <div className="flex items-start gap-6">
                <div 
                  className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${currentSeason === 'low' ? '' : recConfig.iconBg}`}
                  style={currentSeason === 'low' ? { backgroundColor: '#4bb836' } : undefined}
                >
                  <RecIcon className={`w-7 h-7 ${recConfig.iconColor}`} />
            </div>
                <div className="flex-1 w-full">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-bold">{'คำแนะนำของเรา'}</h3>
                <Badge 
                  className={currentSeason === 'low' ? 'text-white' : recConfig.badgeBg}
                  style={currentSeason === 'low' ? { backgroundColor: '#4bb836' } : undefined}
                >
                  {recConfig.badgeText}
                </Badge>
              </div>
              
              {currentSeason === 'low' ? (
                <>
                  <p className="text-lg mb-4 leading-relaxed">
                    {'ช่วงที่แนะนำคือ'} <strong>{recommendedPeriod.startDate}</strong>
                    {recommendedPeriod.endDate && ` - ${recommendedPeriod.endDate}`}
                    {recommendedPeriod.returnDate && ` (กลับวันที่ ${recommendedPeriod.returnDate})`}
                    {' ('}
                    {recommendedPeriod.season === 'low' ? 'Low Season' : 
                     recommendedPeriod.season === 'normal' ? 'Normal Season' : 'High Season'}
                    {')'}
                  </p>
                  <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{'ราคาไป-กลับ'}</div>
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: '#4bb836' }}
                      >
                        {'฿'}{recommendedPeriod.price.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{'สายการบิน'}</div>
                      <div className="text-lg font-semibold">{recommendedPeriod.airline}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">{'ประหยัดได้ถึง'}</div>
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: '#4bb836' }}
                      >
                        {'฿'}{recommendedPeriod.savings.toLocaleString()}
                      </div>
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-5 bg-background rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-2">{'แนะนำจองในช่วง Low Season'}</div>
                      <div 
                        className="text-lg font-semibold mb-2"
                        style={{ color: '#4bb836' }}
                      >
                        {lowSeasonMonths}
                      </div>
                    {lowSeasonData && (
                        <>
                          {lowSeasonData.bestDeal?.price && lowSeasonData.bestDeal.price > 0 && (
                            <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-xs text-muted-foreground mb-1">{'ราคาที่ถูกที่สุด'}</div>
                              <div 
                                className="text-xl font-bold mb-1"
                                style={{ color: '#4bb836' }}
                              >
                                {'฿'}{lowSeasonData.bestDeal.price.toLocaleString()}
                              </div>
                              {lowSeasonData.bestDeal.dates && (
                                <div className="text-xs text-muted-foreground">
                                  {'ช่วงวันที่: '}
                                  <span className="font-semibold text-green-700">
                                    {lowSeasonData.bestDeal.dates}
                                  </span>
                                </div>
                              )}
                              {lowSeasonData.bestDeal.airline && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {'สายการบิน: '}
                                  <span 
                                    className="font-semibold"
                                    style={{ color: '#4bb836' }}
                                  >
                                    {lowSeasonData.bestDeal.airline}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          <div className="text-sm text-muted-foreground mb-2">
                        {'ราคาโดยรวม: ฿'}{lowSeasonData.priceRange.min.toLocaleString()}
                        {' - ฿'}{lowSeasonData.priceRange.max.toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                    {(currentSeason === 'high' || currentSeason === 'normal') && (
                      <div className="p-5 bg-background rounded-lg border">
                        <div className="text-sm text-muted-foreground mb-2">
                          {currentSeason === 'high' 
                            ? 'ราคาวันนี้ (High Season)'
                            : 'ราคาวันนี้ (Normal Season)'}
                        </div>
                        <div className={`text-2xl font-bold ${recConfig.priceColor}`}>
                          {'฿'}{currentPrice.toLocaleString()}
                        </div>
                        {priceComparison?.baseAirline && (
                          <div className="text-sm text-muted-foreground mt-2">
                            {'สายการบิน: '}
                            <span className="font-semibold">{priceComparison.baseAirline}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
        
        {/* Floating comparison tooltip that follows mouse */}
        {isHovering && (
          <div
            className="fixed z-50 max-w-lg p-4 bg-popover text-popover-foreground rounded-lg border shadow-lg pointer-events-none"
            style={{
              left: `${mousePosition.x + 15}px`,
              top: `${mousePosition.y + 15}px`,
              transform: 'translate(0, 0)',
            }}
          >
            <div className="space-y-4">
              <div>
                <div className="font-semibold mb-2 text-sm">
                  {'เปรียบเทียบกับ Season อื่นๆ'}
                </div>
                <div className="space-y-3">
                  {/* Current Season */}
                  <div className="p-2 bg-background rounded border">
                    <div className="flex items-center justify-between mb-1">
                      <span 
                        className={`text-sm font-medium ${currentSeason === 'low' ? 'text-black' : ''}`}
                      >
                        {currentSeason === 'low' ? 'Low Season' : 
                         currentSeason === 'normal' ? 'Normal Season' : 'High Season'}
                        {' (ปัจจุบัน)'}
                      </span>
                      <div className="text-right">
                        <div 
                          className={`text-sm font-bold ${currentSeason === 'low' ? '' : recConfig.priceColor}`}
                          style={currentSeason === 'low' ? { color: '#4bb836' } : undefined}
                        >
                          {'฿'}{currentPrice.toLocaleString()}
                          <span className="text-xs font-normal text-muted-foreground ml-1">ต่อคน</span>
                        </div>
                        {passengerCount > 1 && currentPriceTotal > 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {'฿'}{currentPriceTotal.toLocaleString()} รวม ({passengerCount} คน)
                          </div>
                        )}
                      </div>
                    </div>
                    {currentSeasonData && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          {'ช่วง: '}{currentSeasonData.months.join(', ')}
                        </div>
                        {currentSeasonData.bestDeal?.price && currentSeasonData.bestDeal.price > 0 && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                            <div className="text-xs font-semibold mb-1">{'ราคาที่ถูกที่สุด'}</div>
                            <div className="text-sm font-bold" style={{ color: currentSeason === 'low' ? '#4bb836' : undefined }}>
                              {'฿'}{Math.round(currentSeasonData.bestDeal.price / passengerCount).toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground ml-1">ต่อคน</span>
                            </div>
                            {currentSeasonData.bestDeal.dates && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {'ช่วงวันที่: '}
                                <span className="font-semibold">{currentSeasonData.bestDeal.dates}</span>
                              </div>
                            )}
                            {currentSeasonData.bestDeal.airline && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {'สายการบิน: '}
                                <span className="font-semibold">{currentSeasonData.bestDeal.airline}</span>
                              </div>
                            )}
                          </div>
                        )}
                        {currentSeasonData.priceRange.min > 0 && currentSeasonData.priceRange.max > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {'ราคาโดยรวม: ฿'}{Math.round(currentSeasonData.priceRange.min / passengerCount).toLocaleString()}
                            {' - ฿'}{Math.round(currentSeasonData.priceRange.max / passengerCount).toLocaleString()}
                            {' ต่อคน'}
                            {passengerCount > 1 && (
                              <span className="ml-1">
                                {'(รวม ฿'}{currentSeasonData.priceRange.min.toLocaleString()}
                                {' - ฿'}{currentSeasonData.priceRange.max.toLocaleString()}{')'}
                              </span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Other Seasons */}
                  {seasonComparisons.map((comp) => {
                    const isCheaper = comp.difference < 0
                    const compColor = comp.type === 'low' ? 'text-green-600' : 
                                     comp.type === 'normal' ? 'text-blue-600' : 'text-red-600'
                    
                    return (
                        <div key={comp.type} className="p-2 bg-background rounded border">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{comp.name}</span>
                            <div className="text-right">
                              <div className={`text-sm font-bold ${compColor}`}>
                                {'฿'}{comp.price.toLocaleString()}
                                <span className="text-xs font-normal text-muted-foreground ml-1">ต่อคน</span>
                              </div>
                              {passengerCount > 1 && comp.priceTotal > 0 && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {'฿'}{comp.priceTotal.toLocaleString()} รวม ({passengerCount} คน)
                                </div>
                              )}
                            </div>
                          </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {'ช่วง: '}{comp.months}
                          </span>
                          <span className={isCheaper ? 'text-green-600' : 'text-red-600'}>
                            {isCheaper ? 'ถูกกว่า' : 'แพงกว่า'} {Math.abs(comp.percentage)}%
                          </span>
                        </div>
                        {comp.bestDealDates && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                            <div className="text-xs font-semibold mb-1">{'ราคาที่ถูกที่สุด'}</div>
                            <div className={`text-sm font-bold ${compColor}`}>
                              {'฿'}{comp.price.toLocaleString()}
                              <span className="text-xs font-normal text-muted-foreground ml-1">ต่อคน</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {'ช่วงวันที่: '}
                              <span className="font-semibold">{comp.bestDealDates}</span>
                            </div>
                            {comp.bestDealAirline && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                {'สายการบิน: '}
                                <span className="font-semibold">{comp.bestDealAirline}</span>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {'ราคาโดยรวม: ฿'}{comp.priceRange.min.toLocaleString()}
                          {' - ฿'}{comp.priceRange.max.toLocaleString()}
                          {' ต่อคน'}
                          {passengerCount > 1 && (
                            <span className="ml-1">
                              {'(รวม ฿'}{comp.priceRange.minTotal.toLocaleString()}
                              {' - ฿'}{comp.priceRange.maxTotal.toLocaleString()}{')'}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
        )
      })()}

      {/* Timeline Bar Chart */}
      <Card className="p-8">
        <div className="mb-6 flex items-center gap-2">
          <h4 className="font-semibold">{'การเลือกช่วงเวลา'}</h4>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1 rounded-full hover:bg-secondary transition-colors">
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-2">
                {seasons.map(season => (
                  <div key={season.type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${getSeasonColor(season.type)}`} />
                    <span className="text-xs">
                      <strong>{season.type === 'low' ? 'Low' : season.type === 'normal' ? 'Normal' : 'High'} Season:</strong>{' '}
                      {season.months.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Timeline Buttons */}
        <div className="flex gap-2 flex-wrap">
          {thaiMonths.map((month, index) => {
            const season = monthSeasonMap[index] || 'normal'
            const isCurrent = index === currentMonth
            
            return (
              <Dialog 
                key={index}
                open={isDialogOpen && selectedSeason === season} 
                onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if (!open) setSelectedSeason(null)
                }}
              >
                <Tooltip>
                  <DialogTrigger asChild>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          setSelectedSeason(season)
                          setIsDialogOpen(true)
                        }}
                        className={`rounded-lg px-7 py-3 font-medium text-base min-w-[60px] cursor-pointer transition-all text-white ${
                          isCurrent 
                            ? 'ring-2 ring-offset-2 ring-primary z-10 scale-105 shadow-lg' 
                            : 'hover:opacity-90 hover:scale-105'
                        }`}
                        style={{
                          backgroundColor: season === 'high' ? '#f45151' :
                                         season === 'low' ? '#38B120' :
                                         '#236fb0'
                        }}
                      >
                        {month}
                      </button>
                    </TooltipTrigger>
                  </DialogTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <div className="font-semibold">{thaiMonthsFull[index]}</div>
                      <div className="text-xs">
                        {season === 'low' ? 'Low Season' : 
                         season === 'normal' ? 'Normal Season' : 
                         'High Season'}
                      </div>
                      {seasons.find(s => s.type === season) && (() => {
                        const seasonInfo = seasons.find(s => s.type === season)!
                        return (
                          <>
                            {seasonInfo.bestDeal?.price && seasonInfo.bestDeal.price > 0 && (
                              <div 
                                className="text-xs font-bold mt-1"
                                style={{
                                  color: season === 'high' ? '#f45151' :
                                         season === 'low' ? '#38B120' :
                                         '#ffffff'
                                }}
                              >
                                {'ราคาถูกสุด: ฿'}{seasonInfo.bestDeal.price.toLocaleString()}
                              </div>
                            )}
                            <div 
                              className="text-xs font-medium"
                              style={{
                                color: season === 'high' ? '#f45151' :
                                       season === 'low' ? '#38B120' :
                                       '#ffffff'
                              }}
                            >
                              {'฿'}{seasonInfo.priceRange.min.toLocaleString()}
                              {' - '}
                              {'฿'}{seasonInfo.priceRange.max.toLocaleString()}
                            </div>
                          </>
                        )
                      })()}
                      <div 
                        className="text-xs mt-1"
                        style={{ color: '#87CEEB' }}
                      >
                        {'คลิกเพื่อดูรายละเอียด'}
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
                <DialogContent 
                  className="max-w-2xl max-h-[80vh] overflow-y-auto"
                  overlayClassName="bg-black/20"
                >
                    {(() => {
                      // ใช้ข้อมูลจาก seasons prop (Backend/Database) เป็นหลัก
                      const seasonData = seasons.find(s => s.type === season)
                      
                      // ใช้ region-based configs เป็น fallback สำหรับข้อมูลเพิ่มเติม
                      const seasonDetail = getSeasonDetails(currentRegion, season)
                      
                      // สร้าง title จาก season data
                      const seasonTitle = season === 'low' ? 'Low Season' : 
                                         season === 'normal' ? 'Normal Season' : 'High Season'
                      
                      // ใช้ description จาก season data หรือ fallback
                      const description = seasonData?.description || seasonDetail.description
                      
                      return (
                        <>
                          <DialogHeader>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                              <div className={`w-4 h-4 rounded ${
                                season === 'low' ? 'bg-green-500' :
                                season === 'normal' ? 'bg-blue-500' :
                                'bg-red-500'
                              }`} />
                              {seasonTitle} - {seasonData?.months.join(', ') || seasonDetail.title}
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Description จาก Backend/Database */}
                            <p className="text-lg text-muted-foreground">{description}</p>
                            
                            {/* Best Deal Information */}
                            {seasonData?.bestDeal && seasonData.bestDeal.price > 0 && (
                              <div className="p-4 rounded-lg border-2" style={{
                                borderColor: season === 'low' ? '#4bb836' :
                                            season === 'normal' ? '#236fb0' :
                                            '#f45151',
                                backgroundColor: season === 'low' ? 'rgba(75, 184, 54, 0.05)' :
                                               season === 'normal' ? 'rgba(35, 111, 176, 0.05)' :
                                               'rgba(244, 81, 81, 0.05)'
                              }}>
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <span>ราคาที่ถูกที่สุดใน{seasonTitle}</span>
                                </h4>
                                <div className="space-y-2">
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-sm text-muted-foreground">ราคา:</span>
                                    <span 
                                      className="text-2xl font-bold"
                                      style={{
                                        color: season === 'low' ? '#4bb836' :
                                               season === 'normal' ? '#236fb0' :
                                               '#f45151'
                                      }}
                                    >
                                      {'฿'}{seasonData.bestDeal.price.toLocaleString()}
                                    </span>
                                  </div>
                                  {seasonData.bestDeal.dates && (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-sm text-muted-foreground">ช่วงวันที่:</span>
                                      <span className="text-base font-semibold">{seasonData.bestDeal.dates}</span>
                                    </div>
                                  )}
                                  {seasonData.bestDeal.airline && (
                                    <div className="flex items-baseline gap-2">
                                      <span className="text-sm text-muted-foreground">สายการบิน:</span>
                                      <span className="text-base font-semibold">{seasonData.bestDeal.airline}</span>
                                    </div>
                                  )}
                                  {seasonData.priceRange.min > 0 && seasonData.priceRange.max > 0 && (
                                    <div className="pt-2 mt-2 border-t">
                                      <div className="text-xs text-muted-foreground">
                                        {'ราคาโดยรวมในช่วงนี้: ฿'}{seasonData.priceRange.min.toLocaleString()}
                                        {' - ฿'}{seasonData.priceRange.max.toLocaleString()}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* ข้อมูลเพิ่มเติมจาก region-based configs (fallback) */}
                            <div>
                              <h4 className="font-semibold mb-2">สภาพอากาศ:</h4>
                              <p className="text-muted-foreground">{seasonDetail.weather}</p>
                            </div>
                            
                            {season === 'low' && seasonDetail.whyCheap && (
                              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                <h4 className="font-semibold text-green-800 mb-2">ทำไมราคาถูกและคนไม่ค่อยไป?</h4>
                                <p className="text-green-700">{seasonDetail.whyCheap}</p>
                              </div>
                            )}
                            
                            {season === 'high' && seasonDetail.whyExpensive && (
                              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <h4 className="font-semibold text-red-800 mb-2">ทำไมราคาแพงและคนเยอะ?</h4>
                                <p className="text-red-700">{seasonDetail.whyExpensive}</p>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="font-semibold mb-2">
                                {season === 'low' ? 'เหตุผลที่คนไม่ค่อยไป:' : 
                                 season === 'high' ? 'เหตุผลที่คนเยอะ:' : 
                                 'ลักษณะของฤดูกาล:'}
                              </h4>
                              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {seasonDetail.reasons.map((reason, idx) => (
                                  <li key={idx}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                            
                            {seasonDetail.events.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">เทศกาลและกิจกรรม:</h4>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                  {seasonDetail.events.map((event, idx) => (
                                    <li key={idx}>{event}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {seasonDetail.holidays.length > 0 && (
                              <div>
                                <h4 className="font-semibold mb-2">วันหยุดสำคัญ:</h4>
                                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                  {seasonDetail.holidays.map((holiday, idx) => (
                                    <li key={idx}>{holiday}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div>
                              <h4 className="font-semibold mb-2">คำแนะนำ:</h4>
                              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                {seasonDetail.tips.map((tip, idx) => (
                                  <li key={idx}>{tip}</li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </DialogContent>
                </Dialog>
              )
            })}
          </div>

          {/* Price Legend */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: '#66CC33' }} />
              <span className="text-sm font-medium">{'ราคาถูกสุด'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: '#3399FF' }} />
              <span className="text-sm font-medium">{'ราคามาตรฐาน'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-4 rounded" style={{ backgroundColor: '#FF6666' }} />
              <span className="text-sm font-medium">{'ราคาสูง'}</span>
            </div>
          </div>
        </Card>
    </div>
  )
}
