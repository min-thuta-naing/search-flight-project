# การใช้ OpenWeatherMap API สำหรับตรวจสอบฤดูกาลจากสภาพอากาศ

เอกสารนี้จะอธิบายวิธีใช้งาน OpenWeatherMap API เพื่อตรวจสอบฤดูกาลจากการดูสภาพอากาศจริงๆ แทนการใช้ข้อมูลตามเดือนแบบ static

## 📋 สารบัญ

- [การติดตั้ง](#การติดตั้ง)
- [การใช้งานพื้นฐาน](#การใช้งานพื้นฐาน)
- [ตัวอย่างโค้ด](#ตัวอย่างโค้ด)
- [API Reference](#api-reference)

## 🔧 การติดตั้ง

### 1. รับ API Key จาก OpenWeatherMap

1. ไปที่ [OpenWeatherMap](https://openweathermap.org/api)
2. สมัครสมาชิก (ฟรี)
3. รับ API Key จากหน้า Dashboard
4. Free tier ให้ 60 calls/minute และ 1,000,000 calls/month

### 2. ตั้งค่า Environment Variables

คัดลอก `.env.example` เป็น `.env.local`:

```bash
# Windows PowerShell
Copy-Item env.example .env.local

# macOS/Linux
cp env.example .env.local
```

แก้ไขไฟล์ `.env.local`:

```env
# เพิ่ม OpenWeatherMap API Key
NEXT_PUBLIC_OPENWEATHERMAP_API_KEY=your_api_key_here

# เปิดใช้งาน weather-based season detection
NEXT_PUBLIC_USE_WEATHER_SEASON=true
```

### 3. Restart Development Server

```bash
npm run dev
```

## 🚀 การใช้งานพื้นฐาน

### ตรวจสอบว่ามี API Key หรือไม่

```typescript
import { weatherService } from '@/services/api/weather-service'

if (weatherService.isAvailable()) {
  console.log('Weather service is ready!')
} else {
  console.warn('Please configure OpenWeatherMap API key')
}
```

### ดึงข้อมูลสภาพอากาศปัจจุบัน

```typescript
import { weatherService } from '@/services/api/weather-service'

const weather = await weatherService.getCurrentWeather('chiang-mai')

if (weather) {
  console.log('อุณหภูมิ:', weather.temp, '°C')
  console.log('ความชื้น:', weather.humidity, '%')
  console.log('ฝน:', weather.rain, 'mm')
  console.log('สภาพอากาศ:', weather.weatherDescription)
}
```

### ดึงข้อมูลพยากรณ์อากาศ

```typescript
import { weatherService } from '@/services/api/weather-service'

// ดึงพยากรณ์อากาศ 5 วัน
const forecast = await weatherService.getForecast('phuket', 5)

if (forecast) {
  forecast.forEach(day => {
    console.log('วันที่:', day.date)
    console.log('อุณหภูมิ:', day.temp.min, '-', day.temp.max, '°C')
    console.log('ฝน:', day.rain, 'mm')
  })
}
```

### ตรวจสอบฤดูกาลจากสภาพอากาศ

```typescript
import { getCurrentSeasonFromWeather } from '@/services/api/weather-season-detector'

// ตรวจสอบฤดูกาลปัจจุบัน
const season = await getCurrentSeasonFromWeather('chiang-mai')
console.log('ฤดูกาล:', season) // 'high', 'normal', หรือ 'low'
```

### ตรวจสอบฤดูกาลสำหรับวันที่เฉพาะ

```typescript
import { getSeasonForDate } from '@/services/api/weather-season-detector'

const targetDate = new Date('2025-06-15')
const result = await getSeasonForDate('phuket', targetDate)

console.log('ฤดูกาล:', result.season)
console.log('เหตุผล:', result.reason)
if (result.weatherData) {
  console.log('อุณหภูมิ:', result.weatherData.temp.max, '°C')
}
```

### รับ Season Config แบบ Dynamic

```typescript
import { getWeatherBasedSeasonConfig } from '@/services/api/weather-season-detector'

const config = await getWeatherBasedSeasonConfig('chiang-mai')

if (config.isWeatherBased && config.weatherData) {
  console.log('ใช้ข้อมูลจากสภาพอากาศจริง')
  console.log('อุณหภูมิ:', config.weatherData.currentTemp, '°C')
  console.log('ความชื้น:', config.weatherData.humidity, '%')
  console.log('ฝน:', config.weatherData.rainfall, 'mm')
  console.log('เหตุผล:', config.weatherData.seasonReason)
} else {
  console.log('ใช้ข้อมูล static (ตามเดือน)')
}
```

## 📝 ตัวอย่างโค้ด

### ตัวอย่าง: แสดงข้อมูลสภาพอากาศใน Component

```typescript
'use client'

import { useState, useEffect } from 'react'
import { weatherService, WeatherData } from '@/services/api/weather-service'
import { getCurrentSeasonFromWeather } from '@/services/api/weather-season-detector'

interface WeatherDisplayProps {
  province: string
}

export function WeatherDisplay({ province }: WeatherDisplayProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [season, setSeason] = useState<'high' | 'normal' | 'low' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      // ดึงข้อมูลสภาพอากาศ
      const weatherData = await weatherService.getCurrentWeather(province)
      setWeather(weatherData)
      
      // ตรวจสอบฤดูกาล
      const seasonType = await getCurrentSeasonFromWeather(province)
      setSeason(seasonType)
      
      setLoading(false)
    }
    
    if (weatherService.isAvailable()) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [province])

  if (loading) {
    return <div>กำลังโหลดข้อมูลสภาพอากาศ...</div>
  }

  if (!weather) {
    return <div>ไม่สามารถโหลดข้อมูลสภาพอากาศได้</div>
  }

  return (
    <div>
      <h2>สภาพอากาศปัจจุบัน</h2>
      <p>อุณหภูมิ: {weather.temp}°C</p>
      <p>ความชื้น: {weather.humidity}%</p>
      <p>ฝน: {weather.rain} mm</p>
      <p>สภาพอากาศ: {weather.weatherDescription}</p>
      
      {season && (
        <div>
          <h3>ฤดูกาล: {season === 'high' ? 'สูง' : season === 'low' ? 'ต่ำ' : 'ปกติ'}</h3>
        </div>
      )}
    </div>
  )
}
```

### ตัวอย่าง: เปรียบเทียบฤดูกาลระหว่าง Static และ Weather-based

```typescript
import { getSeasonConfig } from '@/services/data/season-config'
import { getWeatherBasedSeasonConfig } from '@/services/api/weather-season-detector'
import { thaiMonthsFull } from '@/services/data/constants'

async function compareSeasons(province: string) {
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentMonthName = thaiMonthsFull[currentMonth]
  
  // Static season (ตามเดือน)
  const staticConfig = getSeasonConfig(province)
  let staticSeason: 'high' | 'normal' | 'low' = 'normal'
  
  if (staticConfig.high.months.includes(currentMonthName)) {
    staticSeason = 'high'
  } else if (staticConfig.low.months.includes(currentMonthName)) {
    staticSeason = 'low'
  }
  
  // Weather-based season
  const weatherConfig = await getWeatherBasedSeasonConfig(province)
  const weatherSeason = await getCurrentSeasonFromWeather(province)
  
  console.log('=== เปรียบเทียบฤดูกาล ===')
  console.log('Static Season:', staticSeason)
  console.log('Weather-based Season:', weatherSeason)
  
  if (weatherConfig.isWeatherBased && weatherConfig.weatherData) {
    console.log('ข้อมูลสภาพอากาศ:')
    console.log('- อุณหภูมิ:', weatherConfig.weatherData.currentTemp, '°C')
    console.log('- ฝน:', weatherConfig.weatherData.rainfall, 'mm')
    console.log('- เหตุผล:', weatherConfig.weatherData.seasonReason)
  }
  
  if (staticSeason !== weatherSeason) {
    console.log('⚠️ ฤดูกาลไม่ตรงกัน! อาจเกิดจากการเปลี่ยนแปลงสภาพอากาศ')
  }
}
```

## 🔍 API Reference

### WeatherService

#### Methods

##### `isAvailable(): boolean`
ตรวจสอบว่า weather service พร้อมใช้งานหรือไม่ (มี API key)

##### `getCurrentWeather(province: string): Promise<WeatherData | null>`
ดึงข้อมูลสภาพอากาศปัจจุบัน

**Parameters:**
- `province`: ชื่อจังหวัด (เช่น 'chiang-mai', 'phuket')

**Returns:** `WeatherData` หรือ `null` ถ้าเกิด error

##### `getForecast(province: string, days?: number): Promise<WeatherForecastData[] | null>`
ดึงข้อมูลพยากรณ์อากาศ

**Parameters:**
- `province`: ชื่อจังหวัด
- `days`: จำนวนวัน (default: 5)

**Returns:** Array of `WeatherForecastData` หรือ `null`

### Weather Season Detector

#### Functions

##### `getCurrentSeasonFromWeather(destination: string, date?: Date): Promise<SeasonType>`
ตรวจสอบฤดูกาลปัจจุบันจากสภาพอากาศ

**Returns:** `'high' | 'normal' | 'low'`

##### `getSeasonForDate(destination: string, date: Date): Promise<{season: SeasonType, reason: string, weatherData?: WeatherForecastData}>`
ตรวจสอบฤดูกาลสำหรับวันที่เฉพาะ

##### `getWeatherBasedSeasonConfig(destination: string, date?: Date): Promise<WeatherBasedSeasonConfig>`
รับ season config แบบ dynamic ที่รวมข้อมูลสภาพอากาศ

## ⚙️ Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_OPENWEATHERMAP_API_KEY` | OpenWeatherMap API Key | Yes (ถ้าเปิดใช้งาน) | - |
| `NEXT_PUBLIC_USE_WEATHER_SEASON` | เปิดใช้งาน weather-based season detection | No | `false` |

## ⚠️ ข้อควรระวัง

1. **API Rate Limits**: Free tier ให้ 60 calls/minute - ระวังการเรียก API บ่อยเกินไป
2. **Cost**: Free tier มีจำกัด 1,000,000 calls/month
3. **Fallback**: ถ้าไม่มี API key หรือเกิด error จะ fallback ไปใช้ static config อัตโนมัติ
4. **Performance**: การเรียก API อาจช้า - ควรใช้ caching

## 🔄 การ Caching (แนะนำ)

เพื่อลดการเรียก API และเพิ่ม performance:

```typescript
// ตัวอย่าง: Cache weather data ใน localStorage (cache 1 ชั่วโมง)
const CACHE_KEY = 'weather_cache'
const CACHE_DURATION = 60 * 60 * 1000 // 1 hour

async function getCachedWeather(province: string) {
  const cached = localStorage.getItem(`${CACHE_KEY}_${province}`)
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    if (now - timestamp < CACHE_DURATION) {
      return data
    }
  }
  
  // Fetch new data
  const weather = await weatherService.getCurrentWeather(province)
  
  if (weather) {
    localStorage.setItem(
      `${CACHE_KEY}_${province}`,
      JSON.stringify({ data: weather, timestamp: Date.now() })
    )
  }
  
  return weather
}
```

## 📚 ข้อมูลเพิ่มเติม

- [OpenWeatherMap API Documentation](https://openweathermap.org/api)
- [OpenWeatherMap Current Weather API](https://openweathermap.org/current)
- [OpenWeatherMap Forecast API](https://openweathermap.org/forecast5)

