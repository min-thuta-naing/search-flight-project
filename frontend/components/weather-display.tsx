'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Cloud, Thermometer, CloudRain, Sun, CloudSun, AlertCircle, Loader2, Calendar, Wind } from 'lucide-react'
import { weatherService, WeatherData } from '@/services/api/weather-service'
import { provinceNames } from '@/services/data/constants'
import { WeatherForecast } from '@/components/weather-forecast'

interface WeatherDisplayProps {
  destination: string
  destinationName?: string
  flightDate?: Date // วันที่จะบิน (optional)
}

// Configuration สำหรับขนาด weather card - สามารถปรับได้ที่นี่
const weatherCardConfig = {
  // ความกว้างสูงสุดของ card - ใช้ Tailwind classes เช่น 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl'
  // หรือใช้ custom width เช่น 'max-w-[500px]', 'w-full', 'w-96'
  maxWidth: 'max-w-md', // ปรับได้: max-w-sm (384px), max-w-md (448px), max-w-lg (512px), max-w-xl (576px), max-w-2xl (672px)
  
  // ความสูงของ card - ใช้ค่าเป็น pixel (px) หรือ 'auto' สำหรับความสูงอัตโนมัติ
  // ถ้าใส่ค่าเป็น number จะใช้เป็น min-height ในหน่วย px
  // ถ้าใส่เป็น 'auto' หรือ '' จะใช้ความสูงตามเนื้อหา
  minHeight: 250, // ปรับได้: 200, 250, 300 (เป็น px) หรือ 'auto' สำหรับความสูงอัตโนมัติ
  
  // Padding ภายใน card - ใช้ Tailwind classes เช่น 'p-4', 'p-6', 'p-8'
  padding: 'p-6', // ปรับได้: p-4 (16px), p-5 (20px), p-6 (24px), p-8 (32px)
  
  // Border width - ใช้ Tailwind classes เช่น 'border', 'border-2', 'border-4'
  borderWidth: 'border-2',
}

export function WeatherDisplay({ destination, destinationName, flightDate }: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchWeatherData() {
      if (!destination) return

      setLoading(true)
      setError(null)

      try {
        // Check if weather service is available
        if (!weatherService.isAvailable()) {
          setLoading(false)
          return
        }

        // Get weather data
        const weatherData = await weatherService.getCurrentWeather(destination)
        
        if (weatherData) {
          setWeather(weatherData)
        } else {
          setError('ไม่สามารถโหลดข้อมูลสภาพอากาศได้')
        }
      } catch (err) {
        console.error('Error fetching weather:', err)
        setError('เกิดข้อผิดพลาดในการโหลดข้อมูลสภาพอากาศ')
      } finally {
        setLoading(false)
      }
    }

    fetchWeatherData()
  }, [destination])

  // Don't render if weather service is not available
  if (!weatherService.isAvailable()) {
    return null
  }

  // Get min height style
  const minHeightStyle = typeof weatherCardConfig.minHeight === 'number' 
    ? { minHeight: `${weatherCardConfig.minHeight}px` }
    : {}

  if (loading) {
    return (
      <Card 
        className={`${weatherCardConfig.maxWidth} h-full ${weatherCardConfig.padding} ${weatherCardConfig.borderWidth} border-blue-200 bg-blue-50/50`}
        style={minHeightStyle}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
          <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูลสภาพอากาศ...</span>
        </div>
      </Card>
    )
  }

  if (error || !weather) {
    return (
      <Card 
        className={`${weatherCardConfig.maxWidth} h-full ${weatherCardConfig.padding} ${weatherCardConfig.borderWidth} border-orange-200 bg-orange-50/50`}
        style={minHeightStyle}
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <span className="text-sm text-muted-foreground">
            {error || 'ไม่สามารถโหลดข้อมูลสภาพอากาศได้'}
          </span>
        </div>
      </Card>
    )
  }

  const displayName = destinationName || provinceNames[destination] || destination

  // Get weather icon
  const getWeatherIcon = () => {
    const main = weather.weatherMain.toLowerCase()
    if (main.includes('rain') || main.includes('drizzle')) {
      return <CloudRain className="w-8 h-8 text-blue-500" />
    } else if (main.includes('cloud')) {
      return <CloudSun className="w-8 h-8 text-gray-500" />
    } else {
      return <Sun className="w-8 h-8 text-yellow-500" />
    }
  }

  // Get PM2.5 color and label based on value
  const getPM25Info = (pm25: number | null) => {
    if (pm25 === null) return null
    
    if (pm25 <= 12) {
      return { color: 'text-green-600', bgColor: 'bg-green-50', label: 'ดีมาก', icon: '✓' }
    } else if (pm25 <= 35) {
      return { color: 'text-blue-600', bgColor: 'bg-blue-50', label: 'ดี', icon: '✓' }
    } else if (pm25 <= 55) {
      return { color: 'text-yellow-600', bgColor: 'bg-yellow-50', label: 'ปานกลาง', icon: '!' }
    } else if (pm25 <= 150) {
      return { color: 'text-orange-600', bgColor: 'bg-orange-50', label: 'เริ่มมีผลกระทบ', icon: '⚠' }
    } else {
      return { color: 'text-red-600', bgColor: 'bg-red-50', label: 'อันตราย', icon: '🚨' }
    }
  }

  const pm25Info = getPM25Info(weather.pm25)


  return (
    <Card 
      className={`${weatherCardConfig.maxWidth} h-full ${weatherCardConfig.padding} ${weatherCardConfig.borderWidth} border-blue-200 bg-gradient-to-br from-blue-50/50 to-cyan-50/50 flex flex-col`}
      style={minHeightStyle}
    >
      <div className="mb-0">
        <h3 className="text-lg font-bold mb-1 flex items-center gap-2">
          <Cloud className="w-5 h-5 text-blue-600" />
          <span>สภาพอากาศปัจจุบัน</span>
        </h3>
        <p className="text-sm text-muted-foreground">
          {displayName}
        </p>
      </div>

      {/* Temperature and Weather Condition */}
      <div className="grid grid-cols-2 gap-4 mb-0 -mt-6">
        {/* Temperature */}
        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
          <Thermometer className="w-5 h-5 text-orange-500" />
          <div>
            <div className="text-2xl font-bold text-gray-800">
              {Math.round(weather.temp)}°C
            </div>
            <div className="text-xs text-muted-foreground">อุณหภูมิ</div>
          </div>
        </div>

        {/* Weather Condition */}
        <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
          {getWeatherIcon()}
          <div>
            <div className="text-sm font-semibold text-gray-800 capitalize">
              {weather.weatherDescription}
            </div>
            <div className="text-xs text-muted-foreground">สภาพอากาศ</div>
          </div>
        </div>
      </div>

      {/* PM2.5 Display - Inline */}
      {weather.pm25 !== null && pm25Info && (
        <div className="flex items-center gap-2 mb-3 text-sm -mt-6">
          <Wind className={`w-11 h-4 ${pm25Info.color}`} />
          <span className="text-muted-foreground">PM2.5:</span>
          <span className={`font-semibold ${pm25Info.color}`}>
            {Math.round(weather.pm25)} µg/m³
          </span>
          <Badge className={`${pm25Info.bgColor} ${pm25Info.color} border-0 text-xs px-2 py-0`}>
            {pm25Info.icon} {pm25Info.label}
          </Badge>
        </div>
      )}

      {/* Forecast Button */}
      <div className="-mt-2 mt-auto">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full">
              <Calendar className="w-4 h-4 mr-2" />
              <span>ดูพยากรณ์อากาศ 5 วันข้างหน้า</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>พยากรณ์อากาศ 5 วันข้างหน้า - {displayName}</span>
              </DialogTitle>
            </DialogHeader>
            <WeatherForecast 
              destination={destination}
              destinationName={destinationName}
              flightDate={flightDate}
            />
          </DialogContent>
        </Dialog>
      </div>
    </Card>
  )
}

