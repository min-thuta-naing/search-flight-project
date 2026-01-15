/**
 * Mock flight data generator
 * 
 * ⚠️ MOCK DATA SOURCE ONLY - ใช้เฉพาะเมื่อ NEXT_PUBLIC_USE_MOCK_DATA=true
 * 
 * ไฟล์นี้มี hardcoded logic สำหรับ:
 * - Season calculation (hardcoded เดือน)
 * - Holiday/festival data (hardcoded จาก pricing-factors.ts)
 * - Price calculation (mock multipliers)
 * 
 * สำหรับ Production:
 * - ใช้ Backend API แทน (RealFlightDataSource)
 * - Backend มีข้อมูล holiday/festival จาก database และ iApp API
 * - Backend มี season calculation จากข้อมูลจริง
 * 
 * ไฟล์นี้ยังคงใช้ได้สำหรับ development/testing เท่านั้น
 */

import { getSeasonConfig } from '../data/season-config'
import { airlineMap } from '../data/airline-data'
import { calculatePricingFactors } from './pricing-factors' // ⚠️ MOCK ONLY - Uses hardcoded holiday data
import { THAI_AIRLINES } from '../data/constants'
import { FlightAnalysisResult, SeasonData, PriceComparison } from '@/lib/flight-analysis'
import { parseBestDealDate, calculateReturnDate, formatThaiDateRange } from '@/lib/flight-utils'

// ⚠️ MOCK ONLY - Fallback functions for removed business logic
// These are only used when NEXT_PUBLIC_USE_MOCK_DATA=true
function getBasePrice(origin: string, destination: string, avgDuration: number): number {
  // Fallback: simple default price calculation
  return 2500 * (1 + (avgDuration - 5) * 0.05)
}

function getBasePriceForRoute(origin: string, destination: string, airline: string): number {
  // Fallback: simple default prices by airline
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

function getAirlineSeasonMultiplier(airline: string, season: 'low' | 'normal' | 'high'): { min: number; max: number } {
  // Fallback: default multipliers
  const defaultMultipliers = {
    low: { min: 0.7, max: 0.85 },
    normal: { min: 0.85, max: 1.1 },
    high: { min: 1.1, max: 1.5 },
  }
  return defaultMultipliers[season]
}

function getSeasonFromDate(date: Date): 'high' | 'normal' | 'low' {
  const month = date.getMonth()
  if (month >= 4 && month <= 9) return 'low'
  if (month >= 2 && month <= 3) return 'normal'
  return 'high'
}

/**
 * Mock data generator for flight prices
 * This function generates mock flight analysis data based on search parameters
 * 
 * @deprecated สำหรับ production ควรใช้ Backend API แทน
 */
export function analyzeFlightPrices(
  origin: string,
  destination: string,
  durationRange: { min: number; max: number },
  selectedAirlines: string[],
  startDate?: Date,
  endDate?: Date,
  tripType?: 'one-way' | 'round-trip' | null,
  passengerCount: number = 1
): FlightAnalysisResult {
  // Generate mock data based on origin, destination and duration range
  const avgDuration = (durationRange.min + durationRange.max) / 2
  const basePrice = getBasePrice(origin, destination, avgDuration)
  
  // Calculate seasons based on destination and historical data
  const seasonConfig = getSeasonConfig(destination)
  
  // Helper function: คำนวณราคาจริงของแต่ละสายการบินและเลือกที่ถูกที่สุด
  const getCheapestAirlineForSeason = (
    origin: string,
    destination: string,
    selectedAirlines: string[],
    season: 'high' | 'normal' | 'low',
    seasonMultiplier: { min: number; max: number },
    travelDate?: Date,
    bookingDate?: Date
  ): { airline: string; price: number } => {
    const today = bookingDate || new Date()
    const targetDate = travelDate || new Date()

    if (selectedAirlines.length === 0) {
      let baseSeasonPrice = basePrice * (seasonMultiplier.min + seasonMultiplier.max) / 2
      if (travelDate) {
        const factors = calculatePricingFactors(today, travelDate)
        baseSeasonPrice *= factors.totalMultiplier
      }
      return { airline: 'Thai Airways', price: Math.round(baseSeasonPrice) }
    }

    // คำนวณราคาของแต่ละสายการบิน (ใช้ multipliers เฉพาะแต่ละสายการบิน)
    const airlinePrices = selectedAirlines.map(airlineKey => {
      const airlineName = airlineMap[airlineKey] || airlineKey
      const airlineBasePrice = getBasePriceForRoute(origin, destination, airlineKey)
      
      // ใช้ multipliers เฉพาะแต่ละสายการบินแทนที่จะใช้ seasonMultiplier เดียวกัน
      const airlineSeasonMultiplier = getAirlineSeasonMultiplier(airlineKey, season)
      
      let seasonPrice: number
      if (season === 'low') {
        seasonPrice = airlineBasePrice * airlineSeasonMultiplier.min
      } else if (season === 'high') {
        seasonPrice = airlineBasePrice * airlineSeasonMultiplier.max
      } else {
        seasonPrice = airlineBasePrice * (airlineSeasonMultiplier.min + airlineSeasonMultiplier.max) / 2
      }

      if (travelDate) {
        const factors = calculatePricingFactors(today, travelDate)
        seasonPrice *= factors.totalMultiplier
      }

      return {
        airlineKey,
        airlineName,
        price: seasonPrice,
      }
    })

    const cheapest = airlinePrices.reduce((best, current) => 
      current.price < best.price ? current : best
    )

    return {
      airline: cheapest.airlineName,
      price: Math.round(cheapest.price),
    }
  }

  // คำนวณ "สายการบินที่ถูกที่สุด" จากทุกสายการบิน
  const allAirlines = THAI_AIRLINES.map(a => a.value)
  
  // Helper function: คำนวณ priceRange จากราคาจริงของทุกสายการบิน
  const calculatePriceRange = (
    season: 'low' | 'normal' | 'high',
    seasonMultiplier: { min: number; max: number },
    bestDealDate: Date,
    bestDealPrice: number
  ): { min: number; max: number } => {
    const today = new Date()
    const prices: number[] = []
    
    // คำนวณราคาของทุกสายการบิน
    allAirlines.forEach(airlineKey => {
      const airlineBasePrice = getBasePriceForRoute(origin, destination, airlineKey)
      const airlineSeasonMultiplier = getAirlineSeasonMultiplier(airlineKey, season)
      
      // คำนวณราคาสูงสุดของสายการบินนี้ (ใช้ max multiplier)
      const factors = calculatePricingFactors(today, bestDealDate)
      
      const maxPrice = airlineBasePrice * airlineSeasonMultiplier.max * factors.totalMultiplier
      prices.push(Math.round(maxPrice))
    })
    
    // min ใช้ bestDeal.price (ราคาที่ถูกที่สุด)
    // max ใช้ราคาสูงสุดจากทุกสายการบิน
    return {
      min: bestDealPrice,
      max: Math.max(...prices),
    }
  }
  
  const seasons: SeasonData[] = [
    {
      type: 'low',
      months: seasonConfig.low.months,
      priceRange: { min: 0, max: 0 }, // Placeholder, will be calculated below
      bestDeal: (() => {
        const bestDealDate = startDate || parseBestDealDate(seasonConfig.low.bestDealDates)
        // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
        const fallbackMultiplier = { min: 0.7, max: 0.85 }
        const cheapest = getCheapestAirlineForSeason(origin, destination, allAirlines, 'low', fallbackMultiplier, bestDealDate, new Date())
        return {
          dates: seasonConfig.low.bestDealDates,
          price: cheapest.price,
          airline: cheapest.airline,
        }
      })(),
      description: 'ราคาถูกที่สุดของปี เหมาะสำหรับผู้ที่มีความยืดหยุ่นในการเดินทาง',
    },
    {
      type: 'normal',
      months: seasonConfig.normal.months,
      priceRange: { min: 0, max: 0 }, // Placeholder, will be calculated below
      bestDeal: (() => {
        const bestDealDate = startDate || parseBestDealDate(seasonConfig.normal.bestDealDates)
        // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
        const fallbackMultiplier = { min: 0.85, max: 1.1 }
        const cheapest = getCheapestAirlineForSeason(origin, destination, allAirlines, 'normal', fallbackMultiplier, bestDealDate, new Date())
        return {
          dates: seasonConfig.normal.bestDealDates,
          price: cheapest.price,
          airline: cheapest.airline,
        }
      })(),
      description: 'ราคาปานกลาง อากาศดี เหมาะสำหรับการท่องเที่ยว',
    },
    {
      type: 'high',
      months: seasonConfig.high.months,
      priceRange: { min: 0, max: 0 }, // Placeholder, will be calculated below
      bestDeal: (() => {
        const bestDealDate = startDate || parseBestDealDate(seasonConfig.high.bestDealDates)
        // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
        const fallbackMultiplier = { min: 1.1, max: 1.5 }
        const cheapest = getCheapestAirlineForSeason(origin, destination, allAirlines, 'high', fallbackMultiplier, bestDealDate, new Date())
        return {
          dates: seasonConfig.high.bestDealDates,
          price: cheapest.price,
          airline: cheapest.airline,
        }
      })(),
      description: 'ช่วงเทศกาลและปิดเทอม ราคาสูงสุด แนะนำจองล่วงหน้า',
    },
  ]
  
  // คำนวณ priceRange หลังจากได้ bestDeal แล้ว
  seasons.forEach(season => {
    const bestDealDate = startDate || parseBestDealDate(
      season.type === 'low' ? seasonConfig.low.bestDealDates :
      season.type === 'normal' ? seasonConfig.normal.bestDealDates :
      seasonConfig.high.bestDealDates
    )
    // ⚠️ MOCK ONLY: Use fallback multipliers instead of seasonConfig.priceMultiplier
    const seasonMultiplier = 
      season.type === 'low' ? { min: 0.7, max: 0.85 } :
      season.type === 'normal' ? { min: 0.85, max: 1.1 } :
      { min: 1.1, max: 1.5 }
    
    season.priceRange = calculatePriceRange(season.type, seasonMultiplier, bestDealDate, season.bestDeal.price)
  })

  const bestDeal = seasons.reduce((best, season) => {
    return season.bestDeal.price < best.bestDeal.price ? season : best
  })

  // คำนวณวันที่ "ไปก่อน" และ "ไปหลัง"
  let recommendedStartDate: Date
  let recommendedEndDate: Date
  
  if (startDate) {
    recommendedStartDate = new Date(startDate)
    if (endDate && tripType === 'round-trip') {
      recommendedEndDate = new Date(endDate)
    } else {
      recommendedEndDate = new Date(startDate)
      recommendedEndDate.setDate(recommendedEndDate.getDate() + Math.round(avgDuration))
    }
  } else {
    recommendedStartDate = parseBestDealDate(bestDeal.bestDeal.dates)
    recommendedEndDate = new Date(recommendedStartDate)
    recommendedEndDate.setDate(recommendedEndDate.getDate() + Math.round(avgDuration))
  }
  
  // คำนวณราคาของวันที่ที่เลือกจริง (ใช้ allAirlines เพื่อให้การเปรียบเทียบถูกต้อง)
  const recommendedSeason = getSeasonFromDate(recommendedStartDate)
  // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
  const recommendedMultiplier = 
    recommendedSeason === 'low' ? { min: 0.7, max: 0.85 } :
    recommendedSeason === 'normal' ? { min: 0.85, max: 1.1 } :
    { min: 1.1, max: 1.5 }
  const recommendedCheapest = getCheapestAirlineForSeason(
    origin,
    destination,
    allAirlines, // ใช้ allAirlines แทน selectedAirlines เพื่อให้การเปรียบเทียบถูกต้อง
    recommendedSeason,
    recommendedMultiplier,
    recommendedStartDate,
    new Date()
  )
  let baseRecommendedPrice = recommendedCheapest.price
  if (tripType === 'one-way') {
    baseRecommendedPrice = baseRecommendedPrice * 0.5
  }
  
  // คำนวณวันที่ "ไปก่อน" และ "ไปหลัง"
  const beforeStartDate = new Date(recommendedStartDate)
  beforeStartDate.setDate(beforeStartDate.getDate() - 7)
  const beforeEndDate = new Date(beforeStartDate)
  beforeEndDate.setDate(beforeEndDate.getDate() + Math.round(avgDuration))
  
  const afterStartDate = new Date(recommendedStartDate)
  afterStartDate.setDate(afterStartDate.getDate() + 7)
  const afterEndDate = new Date(afterStartDate)
  afterEndDate.setDate(afterEndDate.getDate() + Math.round(avgDuration))
  
  // คำนวณราคาสำหรับ "ไปก่อน" และ "ไปหลัง"
  const beforeSeason = getSeasonFromDate(beforeStartDate)
  // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
  const beforeMultiplier = 
    beforeSeason === 'low' ? { min: 0.7, max: 0.85 } :
    beforeSeason === 'normal' ? { min: 0.85, max: 1.1 } :
    { min: 1.1, max: 1.5 }
  const beforeCheapest = getCheapestAirlineForSeason(
    origin,
    destination,
    allAirlines,
    beforeSeason,
    beforeMultiplier,
    beforeStartDate,
    new Date()
  )
  let beforePrice = beforeCheapest.price
  if (tripType === 'one-way') {
    beforePrice = beforePrice * 0.5
  }
  
  const afterSeason = getSeasonFromDate(afterStartDate)
  // ⚠️ MOCK ONLY: Use fallback multiplier instead of seasonConfig.priceMultiplier
  const afterMultiplier = 
    afterSeason === 'low' ? { min: 0.7, max: 0.85 } :
    afterSeason === 'normal' ? { min: 0.85, max: 1.1 } :
    { min: 1.1, max: 1.5 }
  const afterCheapest = getCheapestAirlineForSeason(
    origin,
    destination,
    allAirlines,
    afterSeason,
    afterMultiplier,
    afterStartDate,
    new Date()
  )
  let afterPrice = afterCheapest.price
  if (tripType === 'one-way') {
    afterPrice = afterPrice * 0.5
  }
  
  const beforeDifference = beforePrice - baseRecommendedPrice
  const beforePercentage = Math.round((beforeDifference / baseRecommendedPrice) * 100)
  
  const afterDifference = afterPrice - baseRecommendedPrice
  const afterPercentage = Math.round((afterDifference / baseRecommendedPrice) * 100)
  
  const priceComparison: PriceComparison = {
    ifGoBefore: {
      date: formatThaiDateRange(beforeStartDate, beforeEndDate, tripType),
      price: Math.round(beforePrice * passengerCount),
      difference: Math.round(beforeDifference * passengerCount),
      percentage: beforePercentage,
    },
    ifGoAfter: {
      date: formatThaiDateRange(afterStartDate, afterEndDate, tripType),
      price: Math.round(afterPrice * passengerCount),
      difference: Math.round(afterDifference * passengerCount),
      percentage: afterPercentage,
    },
  }

  const priceChartData = generateChartData(origin, destination, basePrice, durationRange, selectedAirlines, startDate, endDate, tripType)

  // ใช้ recommendedStartDate และ recommendedEndDate ที่คำนวณจากวันที่ที่ผู้ใช้เลือกจริง
  const thaiMonths = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
  
  const startDateStr = `${recommendedStartDate.getDate()} ${thaiMonths[recommendedStartDate.getMonth()]} ${recommendedStartDate.getFullYear()}`
  
  // สำหรับ one-way ไม่ต้องแสดง endDate
  let endDateStr: string
  if (tripType === 'one-way') {
    endDateStr = ''
  } else {
    endDateStr = `${recommendedEndDate.getDate()} ${thaiMonths[recommendedEndDate.getMonth()]} ${recommendedEndDate.getFullYear()}`
  }
  
  let returnDateStr: string
  if (tripType === 'round-trip' && endDate) {
    returnDateStr = `${endDate.getDate()} ${thaiMonths[endDate.getMonth()]} ${endDate.getFullYear()}`
  } else if (tripType === 'round-trip') {
    // คำนวณ return date จาก recommendedStartDate + avgDuration
    const calculatedReturnDate = new Date(recommendedStartDate)
    calculatedReturnDate.setDate(calculatedReturnDate.getDate() + Math.round(avgDuration))
    returnDateStr = `${calculatedReturnDate.getDate()} ${thaiMonths[calculatedReturnDate.getMonth()]} ${calculatedReturnDate.getFullYear()}`
  } else {
    // one-way ไม่มี return date
    returnDateStr = ''
  }

  const baseHighSeasonPrice = seasons.find(s => s.type === 'high')!.bestDeal.price

  const finalRecommendedPrice = tripType === 'one-way'
    ? bestDeal.bestDeal.price * 0.5
    : bestDeal.bestDeal.price;
  
  const finalHighSeasonPrice = tripType === 'one-way'
    ? baseHighSeasonPrice * 0.5
    : baseHighSeasonPrice;

  return {
    recommendedPeriod: {
      startDate: startDateStr,
      endDate: endDateStr,
      returnDate: returnDateStr,
      price: Math.round(finalRecommendedPrice * passengerCount),
      airline: bestDeal.bestDeal.airline,
      season: bestDeal.type,
      savings: Math.round((finalHighSeasonPrice - finalRecommendedPrice) * passengerCount),
    },
    seasons: seasons.map(season => {
      const priceFactor = tripType === 'one-way' ? 0.5 : 1;
      return {
        ...season,
        priceRange: {
          min: Math.round(season.priceRange.min * priceFactor * passengerCount),
          max: Math.round(season.priceRange.max * priceFactor * passengerCount),
        },
        bestDeal: {
          ...season.bestDeal,
          price: Math.round(season.bestDeal.price * priceFactor * passengerCount),
        },
      }
    }),
    priceComparison,
    priceChartData: priceChartData.map(data => ({
      ...data,
      price: Math.round(data.price * passengerCount),
    })),
  }
}

/**
 * Generate chart data for price trend visualization
 * Uses actual cheapest airline prices for each date
 */
function generateChartData(
  origin: string,
  destination: string,
  basePrice: number,
  durationRange: { min: number; max: number },
  selectedAirlines: string[],
  userStartDate?: Date,
  userEndDate?: Date,
  tripType?: 'one-way' | 'round-trip' | null
): Array<{
  startDate: string
  returnDate: string
  price: number
  season: 'high' | 'normal' | 'low'
  duration?: number
}> {
  const months = [
    { abbr: 'ม.ค.', name: 'มกราคม', season: 'high' as const },
    { abbr: 'ก.พ.', name: 'กุมภาพันธ์', season: 'high' as const },
    { abbr: 'มี.ค.', name: 'มีนาคม', season: 'normal' as const },
    { abbr: 'เม.ย.', name: 'เมษายน', season: 'normal' as const },
    { abbr: 'พ.ค.', name: 'พฤษภาคม', season: 'low' as const },
    { abbr: 'มิ.ย.', name: 'มิถุนายน', season: 'low' as const },
    { abbr: 'ก.ค.', name: 'กรกฎาคม', season: 'low' as const },
    { abbr: 'ส.ค.', name: 'สิงหาคม', season: 'low' as const },
    { abbr: 'ก.ย.', name: 'กันยายน', season: 'low' as const },
    { abbr: 'ต.ค.', name: 'ตุลาคม', season: 'low' as const },
    { abbr: 'พ.ย.', name: 'พฤศจิกายน', season: 'high' as const },
    { abbr: 'ธ.ค.', name: 'ธันวาคม', season: 'high' as const },
  ]

  // ⚠️ MOCK ONLY: Hardcoded season calculation (should use Backend API in production)
  const getSeasonFromDateLocal = (date: Date): 'high' | 'normal' | 'low' => {
    const month = date.getMonth()
    const monthData = months[month]
    return monthData ? monthData.season : 'normal'
  }

  const formatThaiDate = (date: Date): string => {
    const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
      'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
    return `${date.getDate()} ${thaiMonths[date.getMonth()]}`
  }

  // Helper function: คำนวณราคาที่ถูกที่สุดจากสายการบินที่มี
  const getCheapestPriceForDate = (
    travelDate: Date,
    season: 'high' | 'normal' | 'low'
  ): number => {
    const today = new Date()
    const airlinesToUse = selectedAirlines.length > 0 ? selectedAirlines : THAI_AIRLINES.map(a => a.value)
    
    // คำนวณราคาของแต่ละสายการบินและเลือกที่ถูกที่สุด
    const airlinePrices = airlinesToUse.map(airlineKey => {
      const airlineBasePrice = getBasePriceForRoute(origin, destination, airlineKey)
      const airlineSeasonMultiplier = getAirlineSeasonMultiplier(airlineKey, season)
      
      let seasonPrice: number
      if (season === 'low') {
        seasonPrice = airlineBasePrice * airlineSeasonMultiplier.min
      } else if (season === 'high') {
        seasonPrice = airlineBasePrice * airlineSeasonMultiplier.max
      } else {
        seasonPrice = airlineBasePrice * (airlineSeasonMultiplier.min + airlineSeasonMultiplier.max) / 2
      }

      const factors = calculatePricingFactors(today, travelDate)
      seasonPrice *= factors.totalMultiplier
      
      return seasonPrice
    })
    
    const cheapestPrice = Math.min(...airlinePrices)
    
    if (tripType === 'one-way') {
      return cheapestPrice * 0.5
    }
    
    return cheapestPrice
  }

  const data: Array<{ startDate: string; returnDate: string; price: number; season: 'high' | 'normal' | 'low'; duration?: number }> = []
  
  let durationToUse: number
  if (userStartDate && userEndDate) {
    const diffTime = Math.abs(userEndDate.getTime() - userStartDate.getTime())
    durationToUse = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  } else {
    durationToUse = (durationRange.min + durationRange.max) / 2
  }

  if (userStartDate) {
    let chartStartDate: Date
    let chartEndDate: Date
    
    // ✅ ใช้ userEndDate เป็นจุดสิ้นสุด (หรือ userStartDate ถ้าไม่มี userEndDate)
    const endPointDate = userEndDate || userStartDate
    
    // ✅ แสดงย้อนหลัง 90 วัน (ประมาณ 3 เดือน) จากจุดสิ้นสุด
    const tempStartDate = new Date(endPointDate)
    tempStartDate.setDate(tempStartDate.getDate() - 90)
    
    // ✅ แสดงครบทั้งเดือน: เริ่มจากวันที่ 1 ของเดือนแรก และจบที่วันสุดท้ายของเดือนสุดท้าย
    chartStartDate = new Date(tempStartDate.getFullYear(), tempStartDate.getMonth(), 1)
    const endMonth = endPointDate.getMonth()
    const endYear = endPointDate.getFullYear()
    chartEndDate = new Date(endYear, endMonth + 1, 0) // วันสุดท้ายของเดือนสุดท้าย
    
    const currentDate = new Date(chartStartDate)
    const endDate = new Date(chartEndDate)
    const stepDays = 1
    
    while (currentDate <= endDate) {
      const season = getSeasonFromDateLocal(currentDate)
      
      let returnDate: Date | null = null
      if (tripType === 'round-trip') {
        returnDate = new Date(currentDate)
        returnDate.setDate(returnDate.getDate() + Math.round(durationToUse))
      }

      const calculatedPrice = Math.round(getCheapestPriceForDate(currentDate, season))
      
      const duration = tripType === 'round-trip' && returnDate 
        ? Math.round(durationToUse)
        : 0
      
      data.push({
        startDate: formatThaiDate(currentDate),
        returnDate: tripType === 'one-way' || !returnDate ? '' : formatThaiDate(returnDate),
        price: calculatedPrice,
        season,
        duration,
      })

      currentDate.setDate(currentDate.getDate() + stepDays)
    }
  } else {
    months.forEach((month) => {
      const currentYear = new Date().getFullYear()
      const monthIndex = months.findIndex(m => m.abbr === month.abbr)
      
      // ✅ แก้ไข: สร้างข้อมูลทุกวันของเดือน แทนที่จะเป็นแค่ 2 จุด (วันที่ 1 และ 15)
      // หาวันสุดท้ายของเดือน (ใช้เดือนถัดไปวันที่ 0 เพื่อหาวันสุดท้ายของเดือนปัจจุบัน)
      const lastDayOfMonth = new Date(currentYear, monthIndex + 1, 0)
      const daysInMonth = lastDayOfMonth.getDate()
      
      // Loop ผ่านทุกวันของเดือน (จากวันที่ 1 ถึงวันสุดท้าย)
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDateObj = new Date(currentYear, monthIndex, day)
        const season = getSeasonFromDateLocal(currentDateObj)
        
        // คำนวณ return date สำหรับ round-trip
        let returnDate: Date | null = null
        if (tripType === 'round-trip') {
          returnDate = new Date(currentDateObj)
          returnDate.setDate(returnDate.getDate() + Math.round(durationToUse))
        }
        
        const calculatedPrice = Math.round(getCheapestPriceForDate(currentDateObj, season))
        const duration = tripType === 'round-trip' && returnDate ? Math.round(durationToUse) : 0
      
      data.push({
          startDate: formatThaiDate(currentDateObj),
          returnDate: tripType === 'one-way' || !returnDate ? '' : formatThaiDate(returnDate),
          price: calculatedPrice,
          season,
        duration,
      })
      }
    })
  }

  return data
}

