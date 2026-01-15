/**
 * Weather-based Season Detection
 * Uses OpenWeatherMap API data to determine season based on actual weather conditions
 * Falls back to static season config if weather data is unavailable
 */

import { weatherService, WeatherData, WeatherForecastData } from './weather-service'
import { getSeasonConfig, SeasonConfig } from '../data/season-config'
import { thaiMonthsFull } from '../data/constants'

export type SeasonType = 'high' | 'normal' | 'low'

export interface WeatherBasedSeasonConfig extends SeasonConfig {
  isWeatherBased: boolean
  weatherData?: {
    currentTemp: number
    humidity: number
    rainfall: number
    weatherCondition: string
    seasonReason: string
  }
}

/**
 * Determine season based on weather conditions
 * Uses temperature, rainfall, and weather conditions to classify season
 */
function determineSeasonFromWeather(
  currentTemp: number,
  rainfall: number,
  humidity: number,
  weatherCondition: string,
  month: number
): { season: SeasonType; reason: string } {
  // Thailand's climate patterns:
  // - High Season (Nov-Feb): Cool and dry, low rainfall
  // - Normal Season (Mar-Apr, Oct): Transition periods
  // - Low Season (May-Oct): Hot and rainy (monsoon)

  const isRainy = rainfall > 0 || weatherCondition.toLowerCase().includes('rain')
  const isHot = currentTemp > 30
  const isCool = currentTemp < 25
  const isDry = humidity < 70

  // High Season indicators: Cool and dry (Nov-Feb)
  if (isCool && isDry && !isRainy && (month === 0 || month === 1 || month === 10 || month === 11)) {
    return {
      season: 'high',
      reason: 'อากาศเย็นสบาย แห้ง ไม่มีฝน - เหมาะสำหรับการท่องเที่ยว'
    }
  }

  // Low Season indicators: Hot and rainy (May-Oct)
  if (isHot && (isRainy || humidity > 80) && (month >= 4 && month <= 9)) {
    return {
      season: 'low',
      reason: 'อากาศร้อนและมีฝนตก - ฤดูมรสุม'
    }
  }

  // Check rainfall pattern for Low Season
  if (rainfall > 5 && (month >= 4 && month <= 9)) {
    return {
      season: 'low',
      reason: `ฝนตกหนัก (${rainfall.toFixed(1)}mm) - ฤดูฝน`
    }
  }

  // High Season for cool weather even if not peak months
  if (isCool && isDry && currentTemp < 28) {
    return {
      season: 'high',
      reason: 'อากาศเย็นสบาย แห้ง - เหมาะสำหรับการท่องเที่ยว'
    }
  }

  // Low Season for very hot weather
  if (isHot && currentTemp > 35) {
    return {
      season: 'low',
      reason: `อากาศร้อนจัด (${currentTemp.toFixed(1)}°C) - ไม่เหมาะกับการท่องเที่ยว`
    }
  }

  // Normal Season for transition periods
  if ((month >= 2 && month <= 3) || month === 9) {
    return {
      season: 'normal',
      reason: 'ช่วงเปลี่ยนฤดู - สภาพอากาศปกติ'
    }
  }

  // Default based on month (fallback)
  if (month >= 4 && month <= 9) {
    return {
      season: 'low',
      reason: 'ฤดูฝน (ตามช่วงเวลา)'
    }
  }

  if (month === 0 || month === 1 || month === 10 || month === 11) {
    return {
      season: 'high',
      reason: 'ฤดูท่องเที่ยว (ตามช่วงเวลา)'
    }
  }

  return {
    season: 'normal',
    reason: 'สภาพอากาศปกติ'
  }
}

/**
 * Get season configuration with weather data integration
 * Attempts to use weather data if available, falls back to static config
 */
export async function getWeatherBasedSeasonConfig(
  destination: string,
  date?: Date
): Promise<WeatherBasedSeasonConfig> {
  const targetDate = date || new Date()
  const month = targetDate.getMonth()

  // Check if weather-based season detection is enabled
  const useWeatherSeason = process.env.NEXT_PUBLIC_USE_WEATHER_SEASON === 'true'

  if (!useWeatherSeason || !weatherService.isAvailable()) {
    // Fall back to static season config
    const staticConfig = getSeasonConfig(destination)
    return {
      ...staticConfig,
      isWeatherBased: false,
    }
  }

  try {
    // Get current weather data
    const currentWeather = await weatherService.getCurrentWeather(destination)
    
    if (!currentWeather) {
      // Fall back to static config if weather data unavailable
      const staticConfig = getSeasonConfig(destination)
      return {
        ...staticConfig,
        isWeatherBased: false,
      }
    }

    // Get forecast for better rainfall estimation (next 5 days average)
    const forecast = await weatherService.getForecast(destination, 5)
    const avgRainfall = forecast
      ? forecast.reduce((sum, day) => sum + day.rain, 0) / forecast.length
      : currentWeather.rain

    // Determine season from weather
    const { season, reason } = determineSeasonFromWeather(
      currentWeather.temp,
      avgRainfall,
      currentWeather.humidity,
      currentWeather.weatherMain,
      month
    )

    // Get static config for months and bestDealDates (priceMultiplier removed - handled by backend)
    const staticConfig = getSeasonConfig(destination)

    // Create weather-based season config
    // We keep the static config structure but override the current season determination
    return {
      ...staticConfig,
      isWeatherBased: true,
      weatherData: {
        currentTemp: currentWeather.temp,
        humidity: currentWeather.humidity,
        rainfall: avgRainfall,
        weatherCondition: currentWeather.weatherDescription,
        seasonReason: reason,
      },
    }
  } catch (error) {
    console.error('Error getting weather-based season config:', error)
    
    // Fall back to static config on error
    const staticConfig = getSeasonConfig(destination)
    return {
      ...staticConfig,
      isWeatherBased: false,
    }
  }
}

/**
 * Get current season type for a destination using weather data
 * Returns 'high', 'normal', or 'low' based on weather conditions
 */
export async function getCurrentSeasonFromWeather(
  destination: string,
  date?: Date
): Promise<SeasonType> {
  const config = await getWeatherBasedSeasonConfig(destination, date)
  
  if (config.isWeatherBased && config.weatherData) {
    // Use weather-based determination
    const month = (date || new Date()).getMonth()
    const { season } = determineSeasonFromWeather(
      config.weatherData.currentTemp,
      config.weatherData.rainfall,
      config.weatherData.humidity,
      config.weatherData.weatherCondition,
      month
    )
    return season
  }

  // Fall back to static month-based determination
  const targetDate = date || new Date()
  const month = targetDate.getMonth()
  const monthName = thaiMonthsFull[month]
  
  const staticConfig = getSeasonConfig(destination)
  
  // Check which season this month belongs to
  if (staticConfig.high.months.includes(monthName)) {
    return 'high'
  }
  if (staticConfig.low.months.includes(monthName)) {
    return 'low'
  }
  return 'normal'
}

/**
 * Get season for a specific date using weather forecast
 * Useful for checking season in the future
 */
export async function getSeasonForDate(
  destination: string,
  date: Date
): Promise<{ season: SeasonType; reason: string; weatherData?: WeatherForecastData }> {
  const useWeatherSeason = process.env.NEXT_PUBLIC_USE_WEATHER_SEASON === 'true'

  if (!useWeatherSeason || !weatherService.isAvailable()) {
    // Use static config
    const month = date.getMonth()
    const monthName = thaiMonthsFull[month]
    const staticConfig = getSeasonConfig(destination)
    
    let season: SeasonType = 'normal'
    if (staticConfig.high.months.includes(monthName)) {
      season = 'high'
    } else if (staticConfig.low.months.includes(monthName)) {
      season = 'low'
    }

    return {
      season,
      reason: `กำหนดตามช่วงเวลา (${monthName})`,
    }
  }

  try {
    // Get forecast for the specific date
    const forecast = await weatherService.getForecast(destination, 10) // Get 10 days to cover the date
    
    if (forecast && forecast.length > 0) {
      // Find forecast for the target date
      const targetDateStr = date.toISOString().split('T')[0]
      const dayForecast = forecast.find(f => {
        const forecastDateStr = f.date.toISOString().split('T')[0]
        return forecastDateStr === targetDateStr
      })

      if (dayForecast) {
        const month = date.getMonth()
        const { season, reason } = determineSeasonFromWeather(
          dayForecast.temp.max, // Use max temperature
          dayForecast.rain,
          dayForecast.humidity,
          dayForecast.weatherMain,
          month
        )

        return {
          season,
          reason,
          weatherData: dayForecast,
        }
      }
    }

    // Fallback to current weather if forecast not available
    const currentWeather = await weatherService.getCurrentWeather(destination)
    if (currentWeather) {
      const month = date.getMonth()
      const { season, reason } = determineSeasonFromWeather(
        currentWeather.temp,
        currentWeather.rain,
        currentWeather.humidity,
        currentWeather.weatherMain,
        month
      )

      return {
        season,
        reason,
      }
    }
  } catch (error) {
    console.error('Error getting season for date:', error)
  }

  // Final fallback to static config
  const month = date.getMonth()
  const monthName = thaiMonthsFull[month]
  const staticConfig = getSeasonConfig(destination)
  
  let season: SeasonType = 'normal'
  if (staticConfig.high.months.includes(monthName)) {
    season = 'high'
  } else if (staticConfig.low.months.includes(monthName)) {
    season = 'low'
  }

  return {
    season,
    reason: `กำหนดตามช่วงเวลา (${monthName})`,
  }
}

