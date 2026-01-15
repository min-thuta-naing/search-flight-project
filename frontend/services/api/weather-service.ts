/**
 * Weather Service (Frontend - UI Display Only)
 * 
 * ⚠️ NOTE: ไฟล์นี้ใช้สำหรับแสดงผลข้อมูล weather ใน UI เท่านั้น
 * 
 * สำหรับการคำนวณ season จาก weather:
 * - Backend มี weatherCalculationService สำหรับคำนวณ season
 * - Backend เก็บข้อมูล weather ใน weather_data table
 * - Frontend weather service นี้ใช้เฉพาะสำหรับแสดงผลใน components
 * 
 * Integrates with OpenWeatherMap API to get weather data
 * Used for displaying weather information in UI components
 */

import { getProvinceCoordinatesWithFallback, ProvinceCoordinates } from '../data/province-coordinates'

/**
 * OpenWeatherMap API Response Types
 */
export interface WeatherData {
  temp: number // Temperature in Celsius
  feelsLike: number
  humidity: number // Percentage
  pressure: number // hPa
  visibility: number // meters
  uvIndex: number
  windSpeed: number // m/s
  windDirection: number // degrees
  cloudiness: number // percentage
  weatherMain: string // e.g., "Clear", "Rain", "Clouds"
  weatherDescription: string
  rain: number // mm (if available)
  pm25: number | null // PM2.5 in µg/m³ (if available)
  timestamp: number // Unix timestamp
}

export interface WeatherForecastData {
  date: Date
  temp: {
    min: number
    max: number
    day: number
    night: number
  }
  weatherMain: string
  weatherDescription: string
  humidity: number
  windSpeed: number
  rain: number
  cloudiness: number
}

export interface OpenWeatherMapCurrentResponse {
  coord: { lat: number; lon: number }
  weather: Array<{
    main: string
    description: string
    icon: string
  }>
  base: string
  main: {
    temp: number
    feels_like: number
    temp_min: number
    temp_max: number
    pressure: number
    humidity: number
  }
  visibility: number
  wind: {
    speed: number
    deg: number
  }
  clouds: {
    all: number
  }
  rain?: {
    '1h'?: number
    '3h'?: number
  }
  dt: number
  sys: {
    type: number
    id: number
    country: string
    sunrise: number
    sunset: number
  }
  timezone: number
  id: number
  name: string
  cod: number
}

export interface OpenWeatherMapForecastResponse {
  cod: string
  message: number
  cnt: number
  list: Array<{
    dt: number
    main: {
      temp: number
      feels_like: number
      temp_min: number
      temp_max: number
      pressure: number
      humidity: number
    }
    weather: Array<{
      main: string
      description: string
      icon: string
    }>
    clouds: {
      all: number
    }
    wind: {
      speed: number
      deg: number
    }
    rain?: {
      '3h'?: number
    }
    dt_txt: string
  }>
  city: {
    id: number
    name: string
    coord: { lat: number; lon: number }
    country: string
    timezone: number
    sunrise: number
    sunset: number
  }
}

export interface OpenWeatherMapAirPollutionResponse {
  coord: {
    lon: number
    lat: number
  }
  list: Array<{
    dt: number
    main: {
      aqi: number // Air Quality Index: 1=Good, 2=Fair, 3=Moderate, 4=Poor, 5=Very Poor
    }
    components: {
      co: number // Carbon monoxide (µg/m³)
      no: number // Nitrogen monoxide (µg/m³)
      no2: number // Nitrogen dioxide (µg/m³)
      o3: number // Ozone (µg/m³)
      so2: number // Sulphur dioxide (µg/m³)
      pm2_5: number // PM2.5 (µg/m³)
      pm10: number // PM10 (µg/m³)
      nh3: number // Ammonia (µg/m³)
    }
  }>
}

/**
 * Weather Service Class
 */
export class WeatherService {
  private apiKey: string
  private baseUrl = 'https://api.openweathermap.org/data/2.5'

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY || ''
    
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      console.warn('OpenWeatherMap API key is not configured. Weather features will not work.')
    }
  }

  /**
   * Check if weather service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_api_key_here'
  }

  /**
   * Get current weather for a province
   */
  async getCurrentWeather(province: string): Promise<WeatherData | null> {
    if (!this.isAvailable()) {
      console.warn('OpenWeatherMap API key is not configured')
      return null
    }

    try {
      const coords = getProvinceCoordinatesWithFallback(province)
      const url = `${this.baseUrl}/weather?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric&lang=th`

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenWeatherMap API error:', response.status, errorData)
        return null
      }

      const data: OpenWeatherMapCurrentResponse = await response.json()
      
      // Get PM2.5 data from Air Pollution API
      let pm25: number | null = null
      try {
        const airPollutionData = await this.getAirPollution(province)
        pm25 = airPollutionData
      } catch (error) {
        console.warn('Failed to fetch PM2.5 data:', error)
        // Continue without PM2.5 data
      }
      
      return {
        temp: data.main.temp,
        feelsLike: data.main.feels_like,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        visibility: data.visibility,
        uvIndex: 0, // UV index requires separate API call
        windSpeed: data.wind.speed,
        windDirection: data.wind.deg || 0,
        cloudiness: data.clouds.all,
        weatherMain: data.weather[0]?.main || 'Unknown',
        weatherDescription: data.weather[0]?.description || 'Unknown',
        rain: data.rain?.['1h'] || data.rain?.['3h'] || 0,
        pm25: pm25,
        timestamp: data.dt,
      }
    } catch (error) {
      console.error('Error fetching current weather:', error)
      return null
    }
  }

  /**
   * Get 5-day weather forecast for a province
   */
  async getForecast(province: string, days: number = 5): Promise<WeatherForecastData[] | null> {
    if (!this.isAvailable()) {
      console.warn('OpenWeatherMap API key is not configured')
      return null
    }

    try {
      const coords = getProvinceCoordinatesWithFallback(province)
      const url = `${this.baseUrl}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}&units=metric&lang=th&cnt=${days * 8}` // 8 forecasts per day (3-hour intervals)

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenWeatherMap Forecast API error:', response.status, errorData)
        return null
      }

      const data: OpenWeatherMapForecastResponse = await response.json()
      
      // Group forecasts by date and get daily min/max
      const dailyForecasts: Map<string, WeatherForecastData> = new Map()

      data.list.forEach(item => {
        const date = new Date(item.dt * 1000)
        const dateKey = date.toISOString().split('T')[0] // YYYY-MM-DD

        if (!dailyForecasts.has(dateKey)) {
          dailyForecasts.set(dateKey, {
            date: new Date(dateKey),
            temp: {
              min: item.main.temp_min,
              max: item.main.temp_max,
              day: item.main.temp,
              night: item.main.temp,
            },
            weatherMain: item.weather[0]?.main || 'Unknown',
            weatherDescription: item.weather[0]?.description || 'Unknown',
            humidity: item.main.humidity,
            windSpeed: item.wind.speed,
            rain: item.rain?.['3h'] || 0,
            cloudiness: item.clouds.all,
          })
        } else {
          const existing = dailyForecasts.get(dateKey)!
          // Update min/max temperatures
          existing.temp.min = Math.min(existing.temp.min, item.main.temp_min)
          existing.temp.max = Math.max(existing.temp.max, item.main.temp_max)
          // Use day temperature for daytime hours (6 AM - 6 PM)
          const hour = date.getHours()
          if (hour >= 6 && hour < 18) {
            existing.temp.day = item.main.temp
          } else {
            existing.temp.night = item.main.temp
          }
          // Accumulate rain
          existing.rain += item.rain?.['3h'] || 0
        }
      })

      return Array.from(dailyForecasts.values()).slice(0, days)
    } catch (error) {
      console.error('Error fetching weather forecast:', error)
      return null
    }
  }

  /**
   * Get current air pollution data (PM2.5) for a province
   */
  async getAirPollution(province: string): Promise<number | null> {
    if (!this.isAvailable()) {
      return null
    }

    try {
      const coords = getProvinceCoordinatesWithFallback(province)
      const url = `${this.baseUrl}/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${this.apiKey}`

      const response = await fetch(url)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('OpenWeatherMap Air Pollution API error:', response.status, errorData)
        return null
      }

      const data: OpenWeatherMapAirPollutionResponse = await response.json()
      
      if (data.list && data.list.length > 0) {
        return data.list[0].components.pm2_5
      }
      
      return null
    } catch (error) {
      console.error('Error fetching air pollution data:', error)
      return null
    }
  }
}

// Export singleton instance
export const weatherService = new WeatherService()

