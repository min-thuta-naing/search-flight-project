import { pool } from '../config/database';
import { convertToAirportCode } from '../utils/airportCodeConverter';

export interface SearchStatisticsRecord {
  id: number;
  origin: string;
  origin_name: string | null;
  destination: string;
  destination_name: string | null;
  duration_range: string | null;
  trip_type: 'one-way' | 'round-trip' | null;
  user_ip: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface PriceStatisticsRecord {
  id: number;
  origin: string;
  origin_name: string | null;
  destination: string;
  destination_name: string | null;
  recommended_price: number;
  season: 'high' | 'normal' | 'low';
  airline: string | null;
  created_at: Date;
}

export class SearchStatisticsModel {
  /**
   * Save a search query to the database
   */
  static async saveSearch(search: {
    origin: string;
    originName?: string;
    destination: string;
    destinationName?: string;
    durationRange?: string;
    tripType?: 'one-way' | 'round-trip' | null;
    userIp?: string;
    userAgent?: string;
  }): Promise<SearchStatisticsRecord> {
    const query = `
      INSERT INTO search_statistics (
        origin, origin_name, destination, destination_name,
        duration_range, trip_type, user_ip, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      search.origin,
      search.originName || null,
      search.destination,
      search.destinationName || null,
      search.durationRange || null,
      search.tripType || null,
      search.userIp || null,
      search.userAgent || null,
    ]);
    
    return result.rows[0];
  }

  /**
   * Get the most searched destination
   */
  static async getMostSearchedDestination(limit: number = 1): Promise<Array<{ destination: string; count: number }>> {
    const query = `
      SELECT destination, COUNT(*) as count
      FROM search_statistics
      GROUP BY destination
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get popular destinations (top N)
   */
  static async getPopularDestinations(limit: number = 5): Promise<Array<{ destination: string; destination_name: string | null; count: number }>> {
    const query = `
      SELECT 
        destination,
        MAX(destination_name) as destination_name,
        COUNT(*) as count
      FROM search_statistics
      GROUP BY destination
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get monthly search statistics
   */
  static async getMonthlySearchStats(): Promise<Array<{ month: number; month_name: string; count: number }>> {
    const query = `
      SELECT 
        EXTRACT(MONTH FROM created_at)::INTEGER as month,
        TO_CHAR(created_at, 'TMMonth') as month_name,
        COUNT(*)::INTEGER as count
      FROM search_statistics
      GROUP BY EXTRACT(MONTH FROM created_at), TO_CHAR(created_at, 'TMMonth')
      ORDER BY month
    `;
    
    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * Get total number of searches
   */
  static async getTotalSearches(): Promise<number> {
    const result = await pool.query('SELECT COUNT(*) as count FROM search_statistics');
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get most searched duration (round-trip only)
   */
  static async getMostSearchedDuration(limit: number = 1): Promise<Array<{ duration_range: string; count: number }>> {
    const query = `
      SELECT duration_range, COUNT(*)::INTEGER as count
      FROM search_statistics
      WHERE trip_type = 'round-trip' AND duration_range IS NOT NULL
      GROUP BY duration_range
      ORDER BY count DESC
      LIMIT $1
    `;
    
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  /**
   * Get search trend for a destination
   * Compares search count from the last 7 days vs the previous 7 days
   * Returns percentage change in search volume
   */
  static async getSearchTrend(destination?: string): Promise<{
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  } | null> {
    if (!destination) {
      return null;
    }

    try {
      // ✅ ใช้ช่วงเวลาสั้นกว่า: 7 วัน vs 7 วันก่อนหน้า
      // - Recent period: Last 7 days (today - 7 days to today)
      // - Older period: Previous 7 days (today - 14 days to today - 7 days)
      const now = new Date();
      const recentStartDate = new Date(now);
      recentStartDate.setDate(recentStartDate.getDate() - 7);
      
      const olderStartDate = new Date(now);
      olderStartDate.setDate(olderStartDate.getDate() - 14);
      const olderEndDate = new Date(recentStartDate);
      olderEndDate.setDate(olderEndDate.getDate() - 1);

      // Format dates for SQL query
      const formatDateForQuery = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const recentStartStr = formatDateForQuery(recentStartDate);
      const recentEndStr = formatDateForQuery(now);
      const olderStartStr = formatDateForQuery(olderStartDate);
      const olderEndStr = formatDateForQuery(olderEndDate);

      // Query search count for recent period (last 7 days)
      const recentQuery = `
        SELECT COUNT(*)::INTEGER as count
        FROM search_statistics
        WHERE destination = $1
          AND DATE(created_at) >= DATE($2)
          AND DATE(created_at) <= DATE($3)
      `;

      // Query search count for older period (previous 7 days)
      const olderQuery = `
        SELECT COUNT(*)::INTEGER as count
        FROM search_statistics
        WHERE destination = $1
          AND DATE(created_at) >= DATE($2)
          AND DATE(created_at) <= DATE($3)
      `;

      const [recentResult, olderResult] = await Promise.all([
        pool.query(recentQuery, [destination, recentStartStr, recentEndStr]),
        pool.query(olderQuery, [destination, olderStartStr, olderEndStr]),
      ]);

      const recentCount = parseInt(recentResult.rows[0]?.count || '0');
      const olderCount = parseInt(olderResult.rows[0]?.count || '0');

      // ✅ 1. เพิ่ม threshold: ต้องมีข้อมูลเก่าอย่างน้อย 3 ครั้ง ถึงจะคำนวณ trend ได้
      const MINIMUM_COUNT_FOR_TREND = 3;
      
      if (olderCount < MINIMUM_COUNT_FOR_TREND) {
        // ถ้าไม่มีข้อมูลเก่าเพียงพอ ไม่ควรแสดง trend
        // เพราะจะทำให้ได้เปอร์เซ็นต์ที่สูงเกินจริง (เช่น จาก 1 ครั้ง → 15 ครั้ง = 1400%)
        return null;
      }

      // ถ้าไม่มีข้อมูลใหม่เลย แต่มีข้อมูลเก่า แสดงว่าลดลง
      if (recentCount === 0 && olderCount >= MINIMUM_COUNT_FOR_TREND) {
        // จำกัดการลดลงสูงสุดที่ 100%
        return { trend: 'down', percentage: 100 };
      }

      // Calculate percentage change
      const rawPercentage = Math.round(((recentCount - olderCount) / olderCount) * 100);

      // ✅ 2. จำกัดเปอร์เซ็นต์สูงสุดที่ 200% เพื่อไม่ให้แสดงตัวเลขที่สูงเกินจริง
      const MAX_PERCENTAGE = 200;
      const percentage = Math.min(Math.abs(rawPercentage), MAX_PERCENTAGE);

      // If change is less than 2%, consider it stable
      if (percentage < 2) {
        return { trend: 'stable', percentage: 0 };
      }

      return {
        trend: rawPercentage > 0 ? 'up' : 'down',
        percentage: percentage,
      };
    } catch (error) {
      console.error('[SearchStatisticsModel.getSearchTrend] Error calculating trend:', error);
      return null;
    }
  }
}

export class PriceStatisticsModel {
  /**
   * Save a price recommendation to the database
   */
  static async savePriceStat(priceStat: {
    origin: string;
    originName?: string;
    destination: string;
    destinationName?: string;
    recommendedPrice: number;
    season: 'high' | 'normal' | 'low';
    airline?: string;
  }): Promise<PriceStatisticsRecord> {
    const query = `
      INSERT INTO price_statistics (
        origin, origin_name, destination, destination_name,
        recommended_price, season, airline
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      priceStat.origin,
      priceStat.originName || null,
      priceStat.destination,
      priceStat.destinationName || null,
      priceStat.recommendedPrice,
      priceStat.season,
      priceStat.airline || null,
    ]);
    
    return result.rows[0];
  }

  /**
   * Get average price for a route
   */
  static async getAveragePrice(origin?: string, destination?: string): Promise<number | null> {
    let query = 'SELECT AVG(recommended_price) as avg_price FROM price_statistics WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (origin) {
      query += ` AND origin = $${paramIndex}`;
      params.push(origin);
      paramIndex++;
    }

    if (destination) {
      query += ` AND destination = $${paramIndex}`;
      params.push(destination);
      paramIndex++;
    }

    const result = await pool.query(query, params);
    const avgPrice = result.rows[0]?.avg_price;
    
    return avgPrice ? parseFloat(avgPrice) : null;
  }

  /**
   * Get price trend for a route based on actual flight prices
   * Compares average prices from the last 30 days vs the previous 30 days
   */
  static async getPriceTrend(origin?: string, destination?: string): Promise<{
    trend: 'up' | 'down' | 'stable';
    percentage: number;
  } | null> {
    if (!origin || !destination) {
      return null;
    }

    try {
      // Convert province names to airport codes
      const originAirportCode = await convertToAirportCode(origin);
      const destinationAirportCode = await convertToAirportCode(destination);

      if (!originAirportCode || !destinationAirportCode) {
        console.warn(`[PriceStatisticsModel.getPriceTrend] Failed to convert to airport codes: origin=${origin}, destination=${destination}`);
        return null;
      }

      // Calculate date ranges:
      // - Recent period: Last 30 days (today - 30 days to today)
      // - Older period: Previous 30 days (today - 60 days to today - 30 days)
      const now = new Date();
      const recentStartDate = new Date(now);
      recentStartDate.setDate(recentStartDate.getDate() - 30);
      
      const olderStartDate = new Date(now);
      olderStartDate.setDate(olderStartDate.getDate() - 60);
      const olderEndDate = new Date(recentStartDate);
      olderEndDate.setDate(olderEndDate.getDate() - 1);

      // Format dates for SQL query
      const formatDateForQuery = (date: Date): string => {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const recentStartStr = formatDateForQuery(recentStartDate);
      const recentEndStr = formatDateForQuery(now);
      const olderStartStr = formatDateForQuery(olderStartDate);
      const olderEndStr = formatDateForQuery(olderEndDate);

      // Query average prices for recent period (last 30 days)
      const recentQuery = `
        SELECT AVG(fp.price) as avg_price, COUNT(*) as count
        FROM flight_prices fp
        INNER JOIN routes r ON fp.route_id = r.id
        WHERE r.origin = $1
          AND r.destination = $2
          AND fp.trip_type = $3
          AND DATE(fp.departure_date) >= DATE($4)
          AND DATE(fp.departure_date) <= DATE($5)
      `;

      // Query average prices for older period (previous 30 days)
      const olderQuery = `
        SELECT AVG(fp.price) as avg_price, COUNT(*) as count
        FROM flight_prices fp
        INNER JOIN routes r ON fp.route_id = r.id
        WHERE r.origin = $1
          AND r.destination = $2
          AND fp.trip_type = $3
          AND DATE(fp.departure_date) >= DATE($4)
          AND DATE(fp.departure_date) <= DATE($5)
      `;

      const [recentResult, olderResult] = await Promise.all([
        pool.query(recentQuery, [originAirportCode, destinationAirportCode, 'one-way', recentStartStr, recentEndStr]),
        pool.query(olderQuery, [originAirportCode, destinationAirportCode, 'one-way', olderStartStr, olderEndStr]),
      ]);

      const recentAvg = recentResult.rows[0]?.avg_price ? parseFloat(recentResult.rows[0].avg_price) : null;
      const olderAvg = olderResult.rows[0]?.avg_price ? parseFloat(olderResult.rows[0].avg_price) : null;
      const recentCount = parseInt(recentResult.rows[0]?.count || '0');
      const olderCount = parseInt(olderResult.rows[0]?.count || '0');

      // Need at least some data in both periods
      if (!recentAvg || !olderAvg || recentCount === 0 || olderCount === 0) {
        console.log(`[PriceStatisticsModel.getPriceTrend] Insufficient data: recent=${recentAvg} (${recentCount} flights), older=${olderAvg} (${olderCount} flights)`);
        return null;
      }

      // Calculate percentage change
      const percentage = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);

      // If change is less than 2%, consider it stable
      if (Math.abs(percentage) < 2) {
        return { trend: 'stable', percentage: 0 };
      }

      return {
        trend: percentage > 0 ? 'up' : 'down',
        percentage: Math.abs(percentage),
      };
    } catch (error) {
      console.error('[PriceStatisticsModel.getPriceTrend] Error calculating trend:', error);
      return null;
    }
  }
}

