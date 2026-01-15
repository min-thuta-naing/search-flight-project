'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingDown, TrendingUp, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import { SeasonalBreakdown } from '@/components/seasonal-breakdown'
import { AirlineFlights } from '@/components/airline-flights'

import { PricePredictionGraph } from '@/components/price-prediction-graph'
import { WeatherDisplay } from '@/components/weather-display'
import { RecommendationCard } from '@/components/recommendation-card'
import { FlightSearchParams } from '@/components/flight-search-form'
import { thaiMonthsFull } from '@/services/data/constants'
import { FlightAnalysisResult } from '@/lib/flight-analysis'
import { savePriceStat } from '@/lib/stats'
import { THAI_AIRLINES } from '@/services/data/constants'
import { useState, useEffect, useRef } from 'react'
import { flightService } from '@/lib/services/flight-service'
import { statisticsApi } from '@/lib/api/statistics-api'
import { flightApi } from '@/lib/api/flight-api'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { formatDateToUTCString } from '@/lib/utils'

interface PriceAnalysisProps {
  searchParams?: FlightSearchParams | null
  onFlightPricesChange?: (flightPrices: Array<{
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
  }> | null) => void
}

export function PriceAnalysis({ searchParams, onFlightPricesChange }: PriceAnalysisProps) {
  const [analysis, setAnalysis] = useState<FlightAnalysisResult | null>(null)
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [cheapestDates, setCheapestDates] = useState<Array<{
    departureDate: string
    returnDate?: string
    price: number
    currency: string
  }> | null>(null)
  const [loadingCheapestDates, setLoadingCheapestDates] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // Debounce searchParams to prevent too many requests
  const debouncedSearchParams = useDebounce(searchParams, 500)
  // ✅ ลบ debouncedSelectedAirlines ออก - ไม่ต้องใช้แล้ว

  // ✅ Clear analysis immediately when travel class changes (before debounce)
  // This prevents showing stale/wrong season data when travel class changes
  useEffect(() => {
    if (searchParams?.travelClass) {
      // Clear old analysis immediately to prevent showing wrong season
      setAnalysis(null)
      setLoading(true)
      // ✅ Clear flightPrices ใน parent component เมื่อ travel class เปลี่ยน
      if (onFlightPricesChange) {
        onFlightPricesChange(null)
      }
    }
  }, [searchParams?.travelClass, onFlightPricesChange])

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel any pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (!debouncedSearchParams) {
      setAnalysis(null)
      setLoading(false)
      // ✅ Clear flightPrices ใน parent component เมื่อไม่มีข้อมูล
      if (onFlightPricesChange) {
        onFlightPricesChange(null)
      }
      return
    }

    // Create new abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setLoading(true)

    // ✅ เรียก API โดยส่ง selectedAirlines = [] เพื่อได้ข้อมูลทั้งหมด
    // airline-flights component จะ filter client-side เอง
    const paramsWithAirlines: FlightSearchParams = {
      ...debouncedSearchParams,
      selectedAirlines: [], // ส่ง [] เพื่อได้ข้อมูลทั้งหมด
    }

    flightService
      .analyzePrices(paramsWithAirlines)
      .then((result) => {
        // Check if component is still mounted and request wasn't aborted
        if (!isMountedRef.current || abortController.signal.aborted) {
          return
        }

        setAnalysis(result)

        // ✅ ส่ง flightPrices กลับไปให้ parent component เพื่อให้ PopularDestinations ใช้
        if (onFlightPricesChange && result.flightPrices) {
          const flightPricesWithRoute = result.flightPrices.map(fp => ({
            ...fp,
            origin: debouncedSearchParams?.origin,
            destination: debouncedSearchParams?.destination,
          }))
          onFlightPricesChange(flightPricesWithRoute)
        }
        setLoading(false)

        // Save price statistics to backend database (non-blocking)
        // Don't await this to avoid blocking
        // ✅ แปลงราคารวมกลับเป็นราคาต่อคน (เพื่อเก็บราคาต่อคนใน statistics)
        // เพราะ recommendedPeriod.price เป็นราคาที่คูณด้วย passengerCount แล้ว
        const passengerCount = debouncedSearchParams.passengerCount || 1
        const pricePerPerson = Math.round(result.recommendedPeriod.price / passengerCount)

        statisticsApi.savePriceStat({
          origin: debouncedSearchParams.origin,
          destination: debouncedSearchParams.destination,
          originName: debouncedSearchParams.originName,
          destinationName: debouncedSearchParams.destinationName,
          recommendedPrice: pricePerPerson, // ✅ ใช้ราคาต่อคนแทนราคารวม
          season: result.recommendedPeriod.season,
          airline: result.recommendedPeriod.airline,
        }).then(() => {
          // Dispatch custom event to notify stats component to refresh immediately
          window.dispatchEvent(new CustomEvent('flightPriceStatSaved'))
        }).catch((error) => {
          // Silently fail - don't show error to user
          // Only log if not a rate limit error
          if (!error.message?.includes('429')) {
            console.error('Failed to save price statistics to backend:', error);
          }
          // Fallback to localStorage if API fails
          try {
            savePriceStat({
              origin: debouncedSearchParams.origin,
              destination: debouncedSearchParams.destination,
              originName: debouncedSearchParams.originName,
              destinationName: debouncedSearchParams.destinationName,
              recommendedPrice: pricePerPerson, // ✅ ใช้ราคาต่อคนแทนราคารวม
              season: result.recommendedPeriod.season,
              airline: result.recommendedPeriod.airline,
              timestamp: new Date().toISOString(),
            });
          } catch (localStorageError) {
            console.error('Failed to save to localStorage:', localStorageError);
          }
        });
      })
      .catch((error) => {
        // Don't update state if request was aborted
        if (abortController.signal.aborted || !isMountedRef.current) {
          return
        }

        // Don't log rate limit errors as they're expected
        if (!error.message?.includes('429')) {
          console.error('Error analyzing flight prices:', error)
        }
        setAnalysis(null)
        setLoading(false)
      })
  }, [debouncedSearchParams]) // ✅ ลบ debouncedSelectedAirlines ออกจาก dependency

  // แสดง loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4">
        <Card className="p-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-lg font-medium mb-2">กำลังวิเคราะห์ราคาเที่ยวบิน...</p>
            <p className="text-sm text-muted-foreground">กรุณารอสักครู่</p>
          </div>
        </Card>
      </div>
    )
  }

  if (!searchParams || !analysis) {
    return (
      <div className="container mx-auto px-4">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{'เริ่มค้นหาเที่ยวบินของคุณ'}</h2>
          <p className="text-muted-foreground">
            {'กรอกข้อมูลด้านบนเพื่อดูการวิเคราะห์ราคาและคำแนะนำ'}
          </p>
        </div>
      </div>
    )
  }

  const { recommendedPeriod, priceComparison, seasons } = analysis

  const recommendedSeason = seasons.find(s => s.type === recommendedPeriod.season)

  return (
    <div className="container mx-auto px-4 md:px-6 lg:px-35">
      <div className="mb-8 px-0 md:px-11">
        <h2 className="text-3xl font-bold mb-3">
          <span className="inline-block">{'การวิเคราะห์ราคา'}</span>
          <span className="mx-2 text-muted-foreground">{' - '}</span>
          <span className="inline-block">{searchParams.originName}</span>
          <span className="mx-2 text-primary">{' → '}</span>
          <span className="inline-block">{searchParams.destinationName}</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          {searchParams.tripType === 'one-way' ? (
            <>
              <span className="font-medium">{'เที่ยวเดียว'}</span>
              {searchParams.startDate && (
                <span className="ml-3">
                  <span className="text-muted-foreground/70">{' - '}</span>
                  <span className="font-medium">
                    {searchParams.startDate.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </span>
              )}
            </>
          ) : searchParams.tripType === 'round-trip' ? (
            <>
              <span className="font-medium">{'ไป-กลับ'}</span>
              {searchParams.startDate && searchParams.endDate ? (
                <span className="ml-3">
                  <span className="text-muted-foreground/70">{' - '}</span>
                  <span className="font-medium">
                    {searchParams.startDate.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                  <span className="mx-2 text-primary">{' → '}</span>
                  <span className="font-medium">
                    {searchParams.endDate.toLocaleDateString('th-TH', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </span>
              ) : (
                <span className="ml-3">
                  <span className="text-muted-foreground/70">{' - '}</span>
                  <span>{'สำหรับการเดินทาง '}</span>
                  <span className="font-medium">
                    {searchParams.durationRange.min}{'-'}{searchParams.durationRange.max}{' วัน'}
                  </span>
                </span>
              )}
            </>
          ) : (
            <>
              <span>{'สำหรับการเดินทาง '}</span>
              <span className="font-medium">
                {searchParams.durationRange.min}{'-'}{searchParams.durationRange.max}{' วัน'}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-8 w-full max-w-6xl -ml-4 md:-ml-6 lg:ml-11"></div>

      {/* Recommendation Card & Weather Display - Side by Side */}
      {recommendedPeriod && searchParams?.destination && (() => {
        // ✅ Use recommendedPeriod.season from backend instead of calculating from current month
        // Backend calculates season based on selected date, ensuring consistency across travel classes
        // Season is date-based, not travel class-based, so it should be the same for all classes
        const currentSeason = recommendedPeriod.season || (() => {
          // Fallback: Calculate from selected date's month if season not available
          const targetDate = searchParams.startDate || new Date()
          const targetMonth = targetDate.getMonth()
          const monthSeasonMap: Record<number, 'high' | 'normal' | 'low'> = {}
          seasons.forEach(season => {
            season.months.forEach(monthName => {
              const monthIndex = thaiMonthsFull.findIndex(m => m === monthName)
              if (monthIndex !== -1) {
                monthSeasonMap[monthIndex] = season.type
              }
            })
          })
          return monthSeasonMap[targetMonth] || 'normal'
        })()

        return (
          <div className="mb-12 w-full max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Recommendation Card - Left Side (2/3 width) */}
              <div className="md:col-span-2">
                <RecommendationCard
                  recommendedPeriod={recommendedPeriod}
                  seasons={seasons}
                  currentSeason={currentSeason}
                  priceComparison={priceComparison}  // ✅ ส่ง priceComparison เพื่อใช้ basePrice
                  flightPrices={analysis.flightPrices}  // ✅ ส่ง flightPrices เพื่อหาราคาที่ถูกที่สุดจริงๆ
                  searchParams={searchParams}  // ✅ ส่ง searchParams เพื่อใช้ startDate และ tripType
                />
              </div>

              {/* Weather Display - Right Side (1/3 width) */}
              <div className="md:col-span-1">
                <WeatherDisplay
                  destination={searchParams.destination}
                  destinationName={searchParams.destinationName}
                  flightDate={searchParams.startDate}
                />
              </div>
            </div>
          </div>
        )
      })()}

      {/* Seasonal Breakdown (without Recommendation Card) */}
      <div className="mb-12">
        <SeasonalBreakdown
          seasons={seasons}
          recommendedPeriod={null}
          destination={searchParams?.destination}
          priceComparison={priceComparison}  // ✅ ส่ง priceComparison เพื่อใช้ basePrice
          searchParams={searchParams}  // ✅ ส่ง searchParams เพื่อใช้ passengerCount
        />
      </div>

      {/* Price Comparison - If Go Before/After */}
      <div className="w-full max-w-6xl mx-auto grid md:grid-cols-2 gap-4 mb-8">
        <Card className="p-6 border-2 border-orange-200 bg-orange-50/50">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <h3 className="text-2xl font-bold">{'ถ้าคุณไปก่อน'}</h3>
              </div>
              {priceComparison?.ifGoBefore?.date ? (
                searchParams?.tripType === 'round-trip' && priceComparison.ifGoBefore.date.includes(' - ') ? (
                  <div className="space-y-1 ml-7">
                    <div className="text-base text-muted-foreground">
                      {'ออกเดินทาง: '}{priceComparison.ifGoBefore.date.split(' - ')[0]}
                    </div>
                    <div className="text-base text-muted-foreground">
                      {'กลับ: '}{priceComparison.ifGoBefore.date.split(' - ')[1]}
                    </div>
                  </div>
                ) : (
                  <div className="text-base text-muted-foreground ml-7">{'วันที่: '}{priceComparison.ifGoBefore.date}</div>
                )
              ) : (
                <div className="text-base text-muted-foreground ml-7">{'ไม่มีข้อมูล'}</div>
              )}
            </div>
            {priceComparison?.ifGoBefore?.price != null && priceComparison.ifGoBefore.price > 0 && (
              <div className="flex-shrink-0 w-1/2 px-4 py-4 bg-white rounded border border-gray-200">
                <div className="space-y-2 text-center">
                  <div className="text-4xl font-bold text-orange-600">
                    {`฿${priceComparison.ifGoBefore.price.toLocaleString()}`}
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">
                      {(priceComparison.ifGoBefore.difference || 0) >= 0 ? 'แพงกว่า ' : 'ถูกกว่า '}
                    </span>
                    <span className={`font-semibold ${(priceComparison.ifGoBefore.difference || 0) >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {'฿'}{Math.abs(priceComparison.ifGoBefore.difference || 0).toLocaleString()}
                      {'('}
                      {(priceComparison.ifGoBefore.percentage || 0) >= 0 ? '+' : ''}{priceComparison.ifGoBefore.percentage || 0}
                      {'%)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <h3 className="text-2xl font-bold">{'ถ้าคุณไปหลัง'}</h3>
              </div>
              {priceComparison?.ifGoAfter?.date ? (
                searchParams?.tripType === 'round-trip' && priceComparison.ifGoAfter.date.includes(' - ') ? (
                  <div className="space-y-1 ml-7">
                    <div className="text-base text-muted-foreground">
                      {'ออกเดินทาง: '}{priceComparison.ifGoAfter.date.split(' - ')[0]}
                    </div>
                    <div className="text-base text-muted-foreground">
                      {'กลับ: '}{priceComparison.ifGoAfter.date.split(' - ')[1]}
                    </div>
                  </div>
                ) : (
                  <div className="text-base text-muted-foreground ml-7">{'วันที่: '}{priceComparison.ifGoAfter.date}</div>
                )
              ) : (
                <div className="text-base text-muted-foreground ml-7">{'ไม่มีข้อมูล'}</div>
              )}
            </div>
            {priceComparison?.ifGoAfter?.price != null && priceComparison.ifGoAfter.price > 0 && (
              <div className="flex-shrink-0 w-1/2 px-4 py-4 bg-white rounded border border-gray-200">
                <div className="space-y-2 text-center">
                  <div className="text-4xl font-bold text-blue-600">
                    {`฿${priceComparison.ifGoAfter.price.toLocaleString()}`}
                  </div>
                  <div className="text-base">
                    <span className="text-muted-foreground">
                      {(priceComparison.ifGoAfter.difference || 0) >= 0 ? 'แพงกว่า ' : 'ถูกกว่า '}
                    </span>
                    <span className={`font-semibold ${(priceComparison.ifGoAfter.difference || 0) >= 0 ? 'text-blue-600' : 'text-green-600'}`}>
                      {'฿'}{Math.abs(priceComparison.ifGoAfter.difference || 0).toLocaleString()}
                      {'('}
                      {(priceComparison.ifGoAfter.percentage || 0) >= 0 ? '+' : ''}{priceComparison.ifGoAfter.percentage || 0}
                      {'%)'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>


      {/* Cheapest Dates Section */}
      {cheapestDates && cheapestDates.length > 0 && (
        <div className="mt-8 w-full max-w-6xl mx-auto">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="text-xl font-bold">{'วันที่ถูกที่สุด'}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {'วันที่แนะนำสำหรับการเดินทางในราคาที่ดีที่สุด'}
            </p>
            {loadingCheapestDates ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cheapestDates.map((date, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-muted-foreground">
                        {new Date(date.departureDate).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </div>
                      {date.returnDate && (
                        <div className="text-sm text-muted-foreground">
                          {new Date(date.returnDate).toLocaleDateString('th-TH', {
                            day: 'numeric',
                            month: 'short'
                          })}
                        </div>
                      )}
                    </div>
                    <div className="text-2xl font-bold text-primary">
                      ฿{date.price.toLocaleString()}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Airline Flights */}
      <AirlineFlights
        searchParams={searchParams}
        selectedAirlines={selectedAirlines}
        onAirlinesChange={setSelectedAirlines}
        flightPrices={analysis.flightPrices}  // ✅ ส่ง flightPrices จาก analyzeFlightPrices เพื่อให้ใช้ข้อมูลเดียวกัน
      />

      {/* Price Prediction Graph (ML-based) - Replaces the old daily price chart */}
      {analysis.priceGraphData && analysis.priceGraphData.length > 0 && (
        <div className="mt-4 w-full max-w-6xl mx-auto">
          <PricePredictionGraph
            data={analysis.priceGraphData}
            origin={searchParams.originName || searchParams.origin}
            destination={searchParams.destinationName || searchParams.destination}
            loading={loading}
          />
        </div>
      )}
    </div>
  )
}
