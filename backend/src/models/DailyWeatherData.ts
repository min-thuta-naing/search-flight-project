import { pool } from '../config/database';

export interface DailyWeatherDataRecord {
  id: number;
  province: string;
  date: Date;
  temp_max: number;
  temp_min: number;
  temp_avg: number;
  precipitation: number;
  humidity: number | null;
  source: 'open-meteo' | 'openweathermap';
  year: number;
  month: number;
  day: number;
  created_at: Date;
  updated_at: Date;
}

export class DailyWeatherDataModel {
  /**
   * Upsert daily weather data
   */
  static async upsertDailyWeatherData(params: {
    province: string;
    date: string; // YYYY-MM-DD format
    tempMax: number;
    tempMin: number;
    tempAvg: number;
    precipitation: number;
    humidity?: number | null;
    source: 'open-meteo' | 'openweathermap';
    year: number;
    month: number;
    day: number;
  }): Promise<DailyWeatherDataRecord> {
    const query = `
      INSERT INTO daily_weather_data (
        province, date, temp_max, temp_min, temp_avg, 
        precipitation, humidity, source, year, month, day, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (province, date)
      DO UPDATE SET
        temp_max = EXCLUDED.temp_max,
        temp_min = EXCLUDED.temp_min,
        temp_avg = EXCLUDED.temp_avg,
        precipitation = EXCLUDED.precipitation,
        humidity = EXCLUDED.humidity,
        source = EXCLUDED.source,
        year = EXCLUDED.year,
        month = EXCLUDED.month,
        day = EXCLUDED.day,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.province,
      params.date,
      params.tempMax,
      params.tempMin,
      params.tempAvg,
      params.precipitation,
      params.humidity ?? null,
      params.source,
      params.year,
      params.month,
      params.day,
    ]);

    return result.rows[0];
  }

  /**
   * Get daily weather data for a province and date range
   */
  static async getDailyWeatherData(
    province: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyWeatherDataRecord[]> {
    let query = `
      SELECT * FROM daily_weather_data
      WHERE province = $1
    `;
    const params: any[] = [province];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY date ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get daily weather data for multiple provinces and date range
   */
  static async getDailyWeatherDataForProvinces(
    provinces: string[],
    startDate?: string,
    endDate?: string
  ): Promise<DailyWeatherDataRecord[]> {
    if (provinces.length === 0) {
      return [];
    }

    let query = `
      SELECT * FROM daily_weather_data
      WHERE province = ANY($1)
    `;
    const params: any[] = [provinces];

    if (startDate) {
      query += ` AND date >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND date <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` ORDER BY province, date ASC`;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get daily weather data for a specific date
   */
  static async getDailyWeatherDataForDate(
    province: string,
    date: string
  ): Promise<DailyWeatherDataRecord | null> {
    const query = `
      SELECT * FROM daily_weather_data
      WHERE province = $1 AND date = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [province, date]);
    return result.rows[0] || null;
  }

  /**
   * Aggregate daily weather data to monthly statistics
   * This can be used to populate weather_statistics table
   */
  static async aggregateToMonthlyStatistics(
    province: string,
    period: string // YYYY-MM format
  ): Promise<{
    province: string;
    period: string;
    avgTemperature: number;
    avgRainfall: number;
    avgHumidity: number;
  } | null> {
    const query = `
      SELECT 
        province,
        TO_CHAR(date, 'YYYY-MM') as period,
        ROUND(AVG(temp_avg)::NUMERIC, 2) as avg_temperature,
        ROUND(SUM(precipitation)::NUMERIC, 2) as avg_rainfall,
        ROUND(AVG(humidity)::NUMERIC, 2) as avg_humidity
      FROM daily_weather_data
      WHERE province = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
      GROUP BY province, TO_CHAR(date, 'YYYY-MM')
      LIMIT 1
    `;

    const result = await pool.query(query, [province, period]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      province: row.province,
      period: row.period,
      avgTemperature: parseFloat(row.avg_temperature) || 0,
      avgRainfall: parseFloat(row.avg_rainfall) || 0,
      avgHumidity: parseFloat(row.avg_humidity) || 0,
    };
  }

  /**
   * Check if data exists for a province-date combination
   */
  static async exists(province: string, date: string): Promise<boolean> {
    const query = `
      SELECT 1 FROM daily_weather_data
      WHERE province = $1 AND date = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [province, date]);
    return result.rows.length > 0;
  }

  /**
   * Get count of records for a province
   */
  static async getRecordCount(province?: string): Promise<number> {
    let query = 'SELECT COUNT(*) as count FROM daily_weather_data';
    const params: any[] = [];

    if (province) {
      query += ' WHERE province = $1';
      params.push(province);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }
}

