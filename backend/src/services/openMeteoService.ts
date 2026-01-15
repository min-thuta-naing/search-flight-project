/**
 * Open-Meteo Historical Weather Service (Backend)
 * Fetches historical weather data from Open-Meteo Archive API (FREE, no API key required)
 * https://open-meteo.com/en/docs/historical-weather-api
 */

import { format, startOfMonth, endOfMonth } from 'date-fns';

export interface WeatherData {
  date: string; // YYYY-MM-DD
  tempMax: number; // Maximum temperature in Celsius
  tempMin: number; // Minimum temperature in Celsius
  tempAvg: number; // Average temperature (calculated)
  precipitation: number; // Precipitation in mm
  humidity?: number; // Relative humidity (if available)
}

export interface WeatherStatistics {
  province: string;
  period: string; // YYYY-MM format
  avgTemperature: number;
  avgRainfall: number;
  avgHumidity: number;
  weatherScore: number; // 0-100
}

/**
 * Province coordinates mapping for Thai provinces
 * Used for Open-Meteo API calls
 */
const PROVINCE_COORDINATES: Record<string, { lat: number; lon: number; cityName: string }> = {
  // Central & East
  'bangkok': { lat: 13.7563, lon: 100.5018, cityName: 'Bangkok' },
  'rayong': { lat: 12.6814, lon: 101.2817, cityName: 'Rayong' },
  'trat': { lat: 12.2417, lon: 102.5153, cityName: 'Trat' },
  'prachuap-khiri-khan': { lat: 11.8200, lon: 99.7847, cityName: 'Prachuap Khiri Khan' },
  
  // North
  'chiang-mai': { lat: 18.7883, lon: 98.9853, cityName: 'Chiang Mai' },
  'chiang-rai': { lat: 19.9083, lon: 99.8325, cityName: 'Chiang Rai' },
  'lampang': { lat: 18.2923, lon: 99.4928, cityName: 'Lampang' },
  'mae-hong-son': { lat: 19.3017, lon: 97.9689, cityName: 'Mae Hong Son' },
  'nan': { lat: 18.7833, lon: 100.7833, cityName: 'Nan' },
  'phrae': { lat: 18.1450, lon: 100.1411, cityName: 'Phrae' },
  'phitsanulok': { lat: 16.8150, lon: 100.2633, cityName: 'Phitsanulok' },
  'sukhothai': { lat: 17.0125, lon: 99.8233, cityName: 'Sukhothai' },
  'tak': { lat: 16.8833, lon: 99.1289, cityName: 'Tak' },
  
  // Northeast (Isan)
  'udon-thani': { lat: 17.4075, lon: 102.7931, cityName: 'Udon Thani' },
  'khon-kaen': { lat: 16.4328, lon: 102.8356, cityName: 'Khon Kaen' },
  'ubon-ratchathani': { lat: 15.2281, lon: 104.8564, cityName: 'Ubon Ratchathani' },
  'nakhon-phanom': { lat: 17.4108, lon: 104.7786, cityName: 'Nakhon Phanom' },
  'sakon-nakhon': { lat: 17.1561, lon: 104.1547, cityName: 'Sakon Nakhon' },
  'roi-et': { lat: 16.0531, lon: 103.6531, cityName: 'Roi Et' },
  'loei': { lat: 17.4861, lon: 101.7228, cityName: 'Loei' },
  'buri-ram': { lat: 14.9944, lon: 103.1033, cityName: 'Buri Ram' },
  'nakhon-ratchasima': { lat: 14.9700, lon: 102.1019, cityName: 'Nakhon Ratchasima' },
  
  // South
  'phuket': { lat: 7.8804, lon: 98.3923, cityName: 'Phuket' },
  'songkhla': { lat: 7.2050, lon: 100.5953, cityName: 'Songkhla' },
  'krabi': { lat: 8.0863, lon: 98.9063, cityName: 'Krabi' },
  'surat-thani': { lat: 9.1386, lon: 99.3336, cityName: 'Surat Thani' },
  'hat-yai': { lat: 7.0084, lon: 100.4767, cityName: 'Hat Yai' },
  'pattani': { lat: 6.8684, lon: 101.2507, cityName: 'Pattani' },
  'yala': { lat: 6.5414, lon: 101.2814, cityName: 'Yala' },
  'narathiwat': { lat: 6.4255, lon: 101.8236, cityName: 'Narathiwat' },
};

interface OpenMeteoHistoricalResponse {
  daily: {
    time: string[]; // YYYY-MM-DD format
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    relative_humidity_2m?: (number | null)[]; // Optional, may not be available in archive API
  };
}

export class OpenMeteoService {
  private baseUrl = 'https://archive-api.open-meteo.com/v1/archive';

  /**
   * Check if service is available
   * Open-Meteo is always available (no API key required)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Get province coordinates
   */
  private getProvinceCoordinates(province: string): { lat: number; lon: number; cityName: string } | null {
    // Normalize province name (lowercase, replace spaces with hyphens)
    const normalizedProvince = province.toLowerCase().replace(/\s+/g, '-');
    return PROVINCE_COORDINATES[normalizedProvince] || null;
  }

  /**
   * Fetch historical weather data for a date range
   * @param province - Province name
   * @param startDate - Start date (YYYY-MM-DD or Date)
   * @param endDate - End date (YYYY-MM-DD or Date)
   */
  async getHistoricalWeather(
    province: string,
    startDate: string | Date,
    endDate: string | Date
  ): Promise<WeatherData[]> {
    try {
      const coords = this.getProvinceCoordinates(province);
      if (!coords) {
        console.warn(`[OpenMeteoService] No coordinates found for province: ${province}`);
        return [];
      }

      // Convert dates to YYYY-MM-DD format
      const start = typeof startDate === 'string' 
        ? startDate 
        : format(startDate, 'yyyy-MM-dd');
      const end = typeof endDate === 'string' 
        ? endDate 
        : format(endDate, 'yyyy-MM-dd');

      // Open-Meteo Historical API endpoint
      // Documentation: https://open-meteo.com/en/docs/historical-weather-api
      // Note: relative_humidity_2m may not be available in archive API for all locations
      // Using only temperature and precipitation which are always available
      const url = `${this.baseUrl}?latitude=${coords.lat}&longitude=${coords.lon}&start_date=${start}&end_date=${end}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Asia/Bangkok`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => 'Unknown error');
        console.error('[OpenMeteoService] API error:', response.status, errorData);
        return [];
      }

      const data = await response.json() as OpenMeteoHistoricalResponse;
      
      if (!data.daily || !data.daily.time || data.daily.time.length === 0) {
        console.warn(`[OpenMeteoService] No data returned for ${province} (${start} to ${end})`);
        return [];
      }

      // Map API response to WeatherData format
      const weatherData: WeatherData[] = [];
      const times = data.daily.time;
      const tempMax = data.daily.temperature_2m_max || [];
      const tempMin = data.daily.temperature_2m_min || [];
      const precipitation = data.daily.precipitation_sum || [];
      // Note: relative_humidity_2m is not available in archive API
      // We'll estimate humidity based on temperature and precipitation

      for (let i = 0; i < times.length; i++) {
        const tempAvg = (tempMax[i] + tempMin[i]) / 2;
        const rain = precipitation[i] || 0;
        
        // Estimate humidity for Thailand (typical range: 60-80%)
        // Higher temperature = slightly lower humidity
        // Rain = higher humidity
        let estimatedHumidity: number | undefined = undefined;
        if (tempAvg > 0) {
          // Base humidity for Thailand: 70%
          // Adjust based on temperature (hotter = drier)
          // Adjust based on precipitation (rain = more humid)
          estimatedHumidity = Math.max(50, Math.min(90, 
            70 - (tempAvg - 28) * 1.5 + Math.min(rain * 3, 15)
          ));
        }
        
        weatherData.push({
          date: times[i],
          tempMax: tempMax[i] || 0,
          tempMin: tempMin[i] || 0,
          tempAvg,
          precipitation: rain,
          humidity: estimatedHumidity,
        });
      }

      return weatherData;
    } catch (error: any) {
      console.error(`[OpenMeteoService] Error fetching historical weather for ${province}:`, error.message);
      return [];
    }
  }

  /**
   * Calculate weather score (0-100) based on weather conditions
   * Optimal conditions: 20-30°C, low rainfall, moderate humidity, clear weather
   */
  calculateWeatherScore(weather: WeatherData): number {
    let score = 50; // Base score

    // Temperature factor (optimal: 20-30°C)
    const temp = weather.tempAvg;
    if (temp >= 20 && temp <= 30) {
      score += 30; // Perfect temperature
    } else if (temp >= 15 && temp < 20) {
      score += 20; // Slightly cool
    } else if (temp > 30 && temp <= 35) {
      score += 15; // Slightly warm
    } else if (temp >= 10 && temp < 15) {
      score += 10; // Cool
    } else if (temp > 35 && temp <= 40) {
      score += 5; // Warm
    } else {
      score -= 10; // Too cold or too hot
    }

    // Rainfall factor (less rain = better)
    const rain = weather.precipitation || 0;
    if (rain === 0) {
      score += 20; // No rain
    } else if (rain < 5) {
      score += 10; // Light rain
    } else if (rain < 20) {
      score += 5; // Moderate rain
    } else {
      score -= 10; // Heavy rain
    }

    // Humidity factor (optimal: 40-70%)
    if (weather.humidity !== undefined) {
      const humidity = weather.humidity;
      if (humidity >= 40 && humidity <= 70) {
        score += 10; // Optimal humidity
      } else if (humidity >= 30 && humidity < 40) {
        score += 5; // Slightly dry
      } else if (humidity > 70 && humidity <= 80) {
        score += 5; // Slightly humid
      } else {
        score -= 5; // Too dry or too humid
      }
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get average weather statistics for a province and period (month)
   * Uses historical data from Open-Meteo Archive API
   */
  async getWeatherStatisticsForPeriod(
    province: string,
    period: string // YYYY-MM format
  ): Promise<WeatherStatistics | null> {
    try {
      // Parse period to get start and end dates
      const [year, month] = period.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1, 1));
      const endDate = endOfMonth(new Date(year, month - 1, 1));

      // Fetch historical weather data for the entire month
      const weatherData = await this.getHistoricalWeather(province, startDate, endDate);
      
      if (weatherData.length === 0) {
        return null;
      }

      // Calculate averages
      const avgTemp = weatherData.reduce((sum, w) => sum + w.tempAvg, 0) / weatherData.length;
      const avgRainfall = weatherData.reduce((sum, w) => sum + w.precipitation, 0) / weatherData.length;
      
      // Calculate average humidity (if available)
      const humidityData = weatherData.filter(w => w.humidity !== undefined);
      const avgHumidity = humidityData.length > 0
        ? humidityData.reduce((sum, w) => sum + (w.humidity || 0), 0) / humidityData.length
        : 0;

      // Calculate average weather score
      const avgScore = weatherData.reduce((sum, w) => sum + this.calculateWeatherScore(w), 0) / weatherData.length;

      return {
        province,
        period,
        avgTemperature: Math.round(avgTemp * 100) / 100,
        avgRainfall: Math.round(avgRainfall * 100) / 100,
        avgHumidity: Math.round(avgHumidity * 100) / 100,
        weatherScore: Math.round(avgScore),
      };
    } catch (error: any) {
      console.error(`[OpenMeteoService] Error getting weather statistics for ${province} (${period}):`, error.message);
      return null;
    }
  }

  /**
   * Rate limiting helper
   */
  // @ts-ignore - rateLimit method kept for future use
  private async _rateLimit(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

