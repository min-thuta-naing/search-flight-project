import { pool } from '../config/database';

export interface Airport {
  id: number;
  code: string;
  name: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface AirportInput {
  code: string;
  name: string;
  city: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
}

export class AirportModel {
  /**
   * Get or create an airport
   */
  static async getOrCreateAirport(input: AirportInput): Promise<Airport> {
    // Try to get existing airport
    const existing = await pool.query(
      'SELECT * FROM airports WHERE code = $1',
      [input.code]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    // Create new airport
    const result = await pool.query(
      `INSERT INTO airports (code, name, city, country, latitude, longitude, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
       RETURNING *`,
      [
        input.code,
        input.name,
        input.city,
        input.country,
        input.latitude || null,
        input.longitude || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Search airports by keyword
   */
  static async searchAirports(keyword: string, limit: number = 10): Promise<Airport[]> {
    const query = `
      SELECT * FROM airports
      WHERE 
        code ILIKE $1 OR
        name ILIKE $1 OR
        city ILIKE $1
      ORDER BY 
        CASE WHEN code ILIKE $1 THEN 1 ELSE 2 END,
        name
      LIMIT $2
    `;
    
    const result = await pool.query(query, [`%${keyword}%`, limit]);
    return result.rows;
  }

  /**
   * Get airport by code
   */
  static async getAirportByCode(code: string): Promise<Airport | null> {
    const result = await pool.query(
      'SELECT * FROM airports WHERE code = $1',
      [code]
    );
    
    return result.rows[0] || null;
  }
}

