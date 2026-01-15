import { pool } from '../config/database';

export interface HolidayStatisticsRecord {
  id: number;
  period: string; // YYYY-MM format
  holidays_count: number;
  long_weekends_count: number;
  holiday_score: number | null;
  holidays_detail: any; // JSONB field
  created_at: Date;
  updated_at: Date;
}

export class HolidayStatisticsModel {
  /**
   * Upsert holiday statistics for a period
   */
  static async upsertHolidayStatistics(params: {
    period: string; // YYYY-MM format
    holidaysCount?: number;
    longWeekendsCount?: number;
    holidayScore?: number | null;
    holidaysDetail?: any; // JSON object
  }): Promise<HolidayStatisticsRecord> {
    const query = `
      INSERT INTO holiday_statistics (
        period, holidays_count, long_weekends_count, holiday_score, holidays_detail, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (period)
      DO UPDATE SET
        holidays_count = COALESCE(EXCLUDED.holidays_count, holiday_statistics.holidays_count),
        long_weekends_count = COALESCE(EXCLUDED.long_weekends_count, holiday_statistics.long_weekends_count),
        holiday_score = COALESCE(EXCLUDED.holiday_score, holiday_statistics.holiday_score),
        holidays_detail = COALESCE(EXCLUDED.holidays_detail, holiday_statistics.holidays_detail),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.period,
      params.holidaysCount ?? 0,
      params.longWeekendsCount ?? 0,
      params.holidayScore ?? null,
      params.holidaysDetail ? JSON.stringify(params.holidaysDetail) : null,
    ]);

    return result.rows[0];
  }

  /**
   * Get holiday statistics for a period range
   */
  static async getHolidayStatistics(
    startPeriod?: string,
    endPeriod?: string
  ): Promise<HolidayStatisticsRecord[]> {
    let query = `
      SELECT * FROM holiday_statistics
      WHERE 1=1
    `;
    const params: any[] = [];

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

  /**
   * Get holiday statistics for multiple periods
   */
  static async getHolidayStatisticsForPeriods(
    periods: string[]
  ): Promise<HolidayStatisticsRecord[]> {
    if (periods.length === 0) {
      return [];
    }

    const query = `
      SELECT * FROM holiday_statistics
      WHERE period = ANY($1)
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [periods]);
    return result.rows;
  }

  /**
   * Get holiday statistics for a specific period
   */
  static async getHolidayStatisticsForPeriod(
    period: string
  ): Promise<HolidayStatisticsRecord | null> {
    const query = `
      SELECT * FROM holiday_statistics
      WHERE period = $1
      LIMIT 1
    `;

    const result = await pool.query(query, [period]);
    return result.rows[0] || null;
  }
}

