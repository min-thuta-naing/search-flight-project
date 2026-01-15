import { pool } from '../config/database';

export interface RoutePriceStatisticsRecord {
  id: number;
  route_id: number;
  origin: string;
  destination: string;
  period: string; // YYYY-MM format
  avg_price: number | null;
  price_percentile: number | null;
  flights_count: number;
  created_at: Date;
  updated_at: Date;
}

export class RoutePriceStatisticsModel {
  /**
   * Calculate price percentile (0-100) from average prices
   * Percentile represents the position of a price relative to all prices
   */
  static calculatePricePercentile(
    avgPrice: number,
    allAvgPrices: number[]
  ): number {
    if (allAvgPrices.length === 0) {
      return 50; // Default to middle if no data
    }

    const sortedPrices = [...allAvgPrices].sort((a, b) => a - b);
    const percentile = (sortedPrices.filter(p => p <= avgPrice).length / sortedPrices.length) * 100;
    
    return Math.round(percentile);
  }

  /**
   * Upsert route price statistics for a route and period
   */
  static async upsertRoutePriceStatistics(params: {
    routeId: number;
    origin: string;
    destination: string;
    period: string; // YYYY-MM format
    avgPrice?: number | null;
    pricePercentile?: number | null;
    flightsCount?: number;
  }): Promise<RoutePriceStatisticsRecord> {
    const query = `
      INSERT INTO route_price_statistics (
        route_id, origin, destination, period, avg_price, price_percentile, flights_count, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (route_id, period)
      DO UPDATE SET
        avg_price = COALESCE(EXCLUDED.avg_price, route_price_statistics.avg_price),
        price_percentile = COALESCE(EXCLUDED.price_percentile, route_price_statistics.price_percentile),
        flights_count = COALESCE(EXCLUDED.flights_count, route_price_statistics.flights_count),
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      params.routeId,
      params.origin,
      params.destination,
      params.period,
      params.avgPrice ?? null,
      params.pricePercentile ?? null,
      params.flightsCount ?? 0,
    ]);

    return result.rows[0];
  }

  /**
   * Get route price statistics for a route and period
   */
  static async getRoutePriceStatisticsForPeriod(
    routeId: number,
    period: string
  ): Promise<RoutePriceStatisticsRecord | null> {
    const query = `
      SELECT * FROM route_price_statistics
      WHERE route_id = $1 AND period = $2
      LIMIT 1
    `;

    const result = await pool.query(query, [routeId, period]);
    return result.rows[0] || null;
  }

  /**
   * Get route price statistics for multiple periods
   */
  static async getRoutePriceStatisticsForPeriods(
    routeId: number,
    periods: string[]
  ): Promise<Map<string, RoutePriceStatisticsRecord>> {
    if (periods.length === 0) {
      return new Map();
    }

    const query = `
      SELECT * FROM route_price_statistics
      WHERE route_id = $1 AND period = ANY($2)
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [routeId, periods]);
    const map = new Map<string, RoutePriceStatisticsRecord>();
    
    result.rows.forEach((row: RoutePriceStatisticsRecord) => {
      map.set(row.period, row);
    });

    return map;
  }

  /**
   * Get route price statistics by origin and destination
   */
  static async getRoutePriceStatisticsByRoute(
    origin: string,
    destination: string,
    periods: string[]
  ): Promise<Map<string, RoutePriceStatisticsRecord>> {
    if (periods.length === 0) {
      return new Map();
    }

    const query = `
      SELECT * FROM route_price_statistics
      WHERE origin = $1 AND destination = $2 AND period = ANY($3)
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [origin, destination, periods]);
    const map = new Map<string, RoutePriceStatisticsRecord>();
    
    result.rows.forEach((row: RoutePriceStatisticsRecord) => {
      map.set(row.period, row);
    });

    return map;
  }

  /**
   * Get all average prices for a route (used for percentile calculation)
   */
  static async getAllAvgPricesForRoute(routeId: number): Promise<number[]> {
    const query = `
      SELECT avg_price
      FROM route_price_statistics
      WHERE route_id = $1 AND avg_price IS NOT NULL
      ORDER BY period ASC
    `;

    const result = await pool.query(query, [routeId]);
    return result.rows.map(row => parseFloat(row.avg_price));
  }

  /**
   * Get route price statistics for a period range
   */
  static async getRoutePriceStatistics(
    routeId: number,
    startPeriod?: string,
    endPeriod?: string
  ): Promise<RoutePriceStatisticsRecord[]> {
    let query = `
      SELECT * FROM route_price_statistics
      WHERE route_id = $1
    `;
    const params: any[] = [routeId];

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
