import { pool } from '../config/database';

export interface WeatherStatisticsRecord {
  id: number;
  province: string;
  period: string; // YYYY-MM format
  avg_temperature: number | null;
  avg_rainfall: number | null;
  avg_humidity: number | null;
  weather_score: number | null;
  days_count: number;
  created_at: Date;
  updated_at: Date;
}

export class WeatherStatisticsModel {
  /**
   * Calculate weather score (0-100) based on temperature, rainfall, and humidity
   * This matches the calculation in flightAnalysisService.ts
   */
  static calculateWeatherScore(
    temp: number,
    rain: number,
    humidity: number | null
  ): number {
    let score = 50; // base

    // Temperature: 20-28°C is optimal
    if (temp >= 20 && temp <= 28) {
      score += 20;
    } else if (temp < 20 || temp > 32) {
      score -= 20;
    }

    // Rainfall: less is better
    if (rain < 50) {
      score += 15;
    } else if (rain > 200) {
      score -= 15;
    }

    // Humidity: 50-70% is optimal
    if (humidity !== null && humidity !== undefined) {
      if (humidity >= 50 && humidity <= 70) {
        score += 15;
      } else if (humidity > 80) {
        score -= 15;
      }
    }

    // Clamp to 0-100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Upsert weather statistics for a province and period
   */
  static async upsertWeatherStatistics(params: {
    province: string;
    period: string; // YYYY-MM format
    avgTemperature?: number | null;
    avgRainfall?: number | null;
    avgHumidity?: number | null;
    weatherScore?: number | null;
    daysCount?: number;
  }): Promise<WeatherStatisticsRecord> {
    const query = `
      INSERT INTO weather_statistics (
        province, period, avg_temperature, avg_rainfall, avg_humidity, 
        weather_score, days_count, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (province, period)
      DO UPDATE SET
        avg_temperature = COALESCE(EXCLUDED.avg_temperature, weather_statistics.avg_temperature),
        avg_rainfall = COALESCE(EXCLUDED.avg_rainfall, weather_statistics.avg_rainfall),
        avg_humidity = COALESCE(EXCLUDED.avg_humidity, weather_statistics.avg_humidity),
        weather_score = COALESCE(EXCLUDED.weather_score, weather_statistics.weather_score),
        days_count = COALESCE(EXCLUDED.days_count, weather_statistics.days_count),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.province,
      params.period,
      params.avgTemperature ?? null,
      params.avgRainfall ?? null,
      params.avgHumidity ?? null,
      params.weatherScore ?? null,
      params.daysCount ?? 0,
    ]);

    return result.rows[0];
  }

  /**
   * Get weather statistics for a province and period
   */
  static async getWeatherStatisticsForPeriod(
    province: string,
    period: string
  ): Promise<WeatherStatisticsRecord | null> {
    const query = `
      SELECT * FROM weather_statistics
      WHERE province = $1 AND period = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [province, period]);
    return result.rows[0] || null;
  }

  /**
   * Get weather statistics for multiple periods
   */
  static async getWeatherStatisticsForPeriods(
    province: string,
    periods: string[]
  ): Promise<Map<string, WeatherStatisticsRecord>> {
    if (periods.length === 0) {
      return new Map();
    }

    const query = `
      SELECT * FROM weather_statistics
      WHERE province = $1 AND period = ANY($2)
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [province, periods]);
    const map = new Map<string, WeatherStatisticsRecord>();
    
    result.rows.forEach((row: WeatherStatisticsRecord) => {
      map.set(row.period, row);
    });

    return map;
  }

  /**
   * Get weather statistics for a period range
   */
  static async getWeatherStatistics(
    province: string,
    startPeriod?: string,
    endPeriod?: string
  ): Promise<WeatherStatisticsRecord[]> {
    let query = `
      SELECT * FROM weather_statistics
      WHERE province = $1
    `;
    const params: any[] = [province];

    if (startPeriod) {
      query += ` AND period >= $${params.length + 1}`;
      params.push(startPeriod);
    }

    if (endPeriod) {
      query += ` AND period <= $${params.length + 1}`;
      params.push(endPeriod);
    }

    query += ` ORDER BY period ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }
}
