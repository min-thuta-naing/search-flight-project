'use client'

import { useState, useEffect } from 'react'
import { WeatherForecastData } from '@/services/api/weather-service'
import { weatherService } from '@/services/api/weather-service'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  CloudRain, 
  Sun, 
  CloudSun, 
  Cloud, 
  Droplets, 
  Thermometer, 
  Wind,
  Calendar,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { thaiMonthsFull } from '@/services/data/constants'

interface WeatherForecastProps {
  destination: string
  destinationName?: string
  flightDate?: Date // วันที่จะบิน
}

export function WeatherForecast({ destination, destinationName, flightDate }: WeatherForecastProps) {
  const [forecast, setForecast] = useState<WeatherForecastData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchForecast() {
      if (!destination) return

      setLoading(true)
      setError(null)

      try {
        const forecastData = await weatherService.getForecast(destination, 5)
        
        if (forecastData && forecastData.length > 0) {
          setForecast(forecastData)
        } else {
          setError('ไม่สามารถโหลดข้อมูลพยากรณ์อากาศได้')
        }
      } catch (err) {
        console.error('Error fetching forecast:', err)
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลพยากรณ์อากาศ')
      } finally {
        setLoading(false)
      }
    }

    fetchForecast()
  }, [destination])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-3 text-sm text-muted-foreground">กำลังโหลดข้อมูลพยากรณ์อากาศ...</span>
      </div>
    )
  }

  if (error || !forecast) {
    return (
      <div className="flex items-center justify-center py-8 text-orange-600">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="text-sm">{error || 'ไม่สามารถโหลดข้อมูลพยากรณ์อากาศได้'}</span>
      </div>
    )
  }

  // คำนวณจำนวนวันจากวันนี้
  const getDaysFromToday = (date: Date): number => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const targetDate = new Date(date)
    targetDate.setHours(0, 0, 0, 0)
    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // หาวันที่ตรงกับ flightDate
  const flightForecast = flightDate 
    ? forecast.find(f => {
        const forecastDate = new Date(f.date)
        const flight = new Date(flightDate)
        forecastDate.setHours(0, 0, 0, 0)
        flight.setHours(0, 0, 0, 0)
        return forecastDate.getTime() === flight.getTime()
      })
    : null

  // Get weather icon
  const getWeatherIcon = (weatherMain: string) => {
    const main = weatherMain.toLowerCase()
    if (main.includes('rain') || main.includes('drizzle')) {
      return <CloudRain className="w-6 h-6 text-blue-500" />
    } else if (main.includes('cloud')) {
      return <CloudSun className="w-6 h-6 text-gray-500" />
    } else {
      return <Sun className="w-6 h-6 text-yellow-500" />
    }
  }

  // Check if it will rain
  const willRain = (rain: number): boolean => {
    return rain > 0.5 // ถ้าฝนมากกว่า 0.5mm ถือว่าฝนตก
  }

  return (
    <div className="space-y-6">
      {/* Flight Date Info (if provided) */}
      {flightDate && flightForecast && (
        <Card className="p-4 border-2 border-blue-300 bg-blue-50/50">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">
                สภาพอากาศวันที่คุณจะบิน
              </h4>
              <p className="text-sm text-blue-800 mb-3">
                {(() => {
                  const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
                  const dayName = dayNames[flightDate.getDay()]
                  const day = flightDate.getDate()
                  const month = thaiMonthsFull[flightDate.getMonth()]
                  const year = flightDate.getFullYear()
                  return `วัน${dayName}, ${day} ${month} ${year}`
                })()}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  {getWeatherIcon(flightForecast.weatherMain)}
                  <div>
                    <div className="text-sm font-medium capitalize">
                      {flightForecast.weatherDescription}
                    </div>
                    <div className="text-xs text-muted-foreground">สภาพอากาศ</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Thermometer className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-sm font-medium">
                      {Math.round(flightForecast.temp.min)}-{Math.round(flightForecast.temp.max)}°C
                    </div>
                    <div className="text-xs text-muted-foreground">อุณหภูมิ</div>
                  </div>
                </div>
              </div>
              {/* Afternoon weather (บ่าย = 12:00-18:00) */}
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">ช่วงบ่าย:</span>
                  <span className="text-blue-800">
                    อุณหภูมิประมาณ {Math.round(flightForecast.temp.day)}°C,{' '}
                    {willRain(flightForecast.rain) 
                      ? `มีฝนตกประมาณ ${flightForecast.rain.toFixed(1)}mm`
                      : 'ไม่มีฝน'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 5-Day Forecast */}
      <div>
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          <span>พยากรณ์อากาศ 5 วันข้างหน้า</span>
        </h4>
        <div className="space-y-3">
          {forecast.map((day, index) => {
            const daysFromToday = getDaysFromToday(day.date)
            const isToday = daysFromToday === 0
            const isTomorrow = daysFromToday === 1
            const isFlightDay = flightDate && 
              new Date(day.date).toDateString() === new Date(flightDate).toDateString()

            return (
              <Card 
                key={index} 
                className={`p-4 border-2 ${
                  isFlightDay 
                    ? 'border-blue-400 bg-blue-50/50' 
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Date Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-semibold">
                          {(() => {
                            if (isToday) return 'วันนี้'
                            if (isTomorrow) return 'พรุ่งนี้'
                            const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
                            const dayName = dayNames[day.date.getDay()]
                            const dayNum = day.date.getDate()
                            const month = thaiMonthsFull[day.date.getMonth()]
                            return `วัน${dayName}, ${dayNum} ${month}`
                          })()}
                        </h5>
                      {isFlightDay && (
                        <Badge className="bg-blue-500 text-white text-xs">
                          วันบิน
                        </Badge>
                      )}
                      {!isToday && !isTomorrow && daysFromToday > 0 && (
                        <Badge variant="outline" className="text-xs">
                          อีก {daysFromToday} วัน
                        </Badge>
                      )}
                    </div>

                    {/* Weather Info */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                      <div className="flex items-center gap-2">
                        {getWeatherIcon(day.weatherMain)}
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {day.weatherDescription}
                          </div>
                          <div className="text-xs text-muted-foreground">สภาพอากาศ</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Thermometer className="w-5 h-5 text-orange-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {Math.round(day.temp.min)}-{Math.round(day.temp.max)}°C
                          </div>
                          <div className="text-xs text-muted-foreground">ต่ำ-สูง</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <CloudRain className="w-5 h-5 text-blue-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {day.rain > 0 ? `${day.rain.toFixed(1)}mm` : '0mm'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {willRain(day.rain) ? 'ฝนตก' : 'ไม่มีฝน'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Wind className="w-5 h-5 text-gray-500" />
                        <div>
                          <div className="text-sm font-medium">
                            {day.windSpeed.toFixed(1)} m/s
                          </div>
                          <div className="text-xs text-muted-foreground">ลม</div>
                        </div>
                      </div>
                    </div>

                    {/* Answer common questions */}
                    {daysFromToday >= 0 && daysFromToday <= 5 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="text-xs text-muted-foreground space-y-1">
                          {willRain(day.rain) ? (
                            <div className="flex items-center gap-1">
                              <CloudRain className="w-3 h-3 text-blue-500" />
                              <span>
                                {isToday 
                                  ? 'วันนี้มีฝนตก'
                                  : isTomorrow
                                  ? 'พรุ่งนี้มีฝนตก'
                                  : `อีก ${daysFromToday} วันข้างหน้า มีฝนตกประมาณ ${day.rain.toFixed(1)}mm`
                                }
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Sun className="w-3 h-3 text-yellow-500" />
                              <span>
                                {isToday
                                  ? 'วันนี้ไม่มีฝน'
                                  : isTomorrow
                                  ? 'พรุ่งนี้ไม่มีฝน'
                                  : `อีก ${daysFromToday} วันข้างหน้า ไม่มีฝน`
                                }
                              </span>
                            </div>
                          )}
                          {daysFromToday === 0 || isTomorrow ? (
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gray-500" />
                              <span>
                                ช่วงบ่ายอุณหภูมิประมาณ {Math.round(day.temp.day)}°C
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

