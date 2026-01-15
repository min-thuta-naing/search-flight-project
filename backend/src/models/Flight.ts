import { pool } from '../config/database';

export interface FlightPriceRecord {
  id: number;
  route_id: number;
  airline_id: number;
  departure_date: Date;
  return_date: Date | null;
  price: number;
  base_price: number;
  departure_time: string;
  arrival_time: string;
  duration: number;
  flight_number: string;
  trip_type: 'one-way' | 'round-trip';
  season: 'high' | 'normal' | 'low';
  travel_class?: 'economy' | 'business' | 'first';
  created_at: Date;
  updated_at: Date;
}

export interface Route {
  id: number;
  origin: string;
  destination: string;
  base_price: number;
  avg_duration: number;
  created_at: Date;
  updated_at: Date;
}

export interface Airline {
  id: number;
  code: string;
  name: string;
  name_th: string;
  created_at: Date;
  updated_at: Date;
}

export class FlightModel {
  /**
   * Get flight prices for a specific route and date range
   */
  static async getFlightPrices(
    origin: string | string[],
    destination: string,
    startDate: Date,
    endDate?: Date,
    tripType: 'one-way' | 'round-trip' = 'round-trip',
    airlineIds?: number[],
    travelClass: 'economy' | 'business' | 'first' = 'economy'
  ): Promise<FlightPriceRecord[]> {
    // Calculate endDate if not provided (default to 180 days)
    const finalEndDate = endDate || (() => {
      const date = new Date(startDate);
      date.setDate(date.getDate() + 180);
      return date;
    })();

    // ✅ Convert dates to date-only format (YYYY-MM-DD) to match database date column
    // Database stores departure_date as DATE type, not TIMESTAMP
    // Use date_trunc to ensure we're comparing dates, not timestamps
    // Format: Extract date part from Date object (YYYY-MM-DD)
    const formatDateForQuery = (date: Date): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatDateForQuery(startDate);
    const endDateStr = formatDateForQuery(finalEndDate);

    // Log date range for debugging
    console.log('[FlightModel.getFlightPrices] Date range:', {
      origin,
      destination,
      startDate: startDateStr,
      endDate: endDateStr,
      startDateISO: startDate.toISOString(),
      endDateISO: finalEndDate.toISOString(),
      tripType,
      airlineIds: airlineIds?.length || 0,
      travelClass,
    });

    // Check if travel_class column exists
    const columnExistsQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'flight_prices' 
        AND column_name = 'travel_class'
      ) as exists;
    `;
    
    let hasTravelClassColumn = false;
    try {
      const columnCheck = await pool.query(columnExistsQuery);
      hasTravelClassColumn = columnCheck.rows[0]?.exists || false;
    } catch (error) {
      // If check fails, assume column doesn't exist
      hasTravelClassColumn = false;
    }

    // Handle multiple origins (e.g., Bangkok has BKK and DMK)
    const originCodes = Array.isArray(origin) ? origin : [origin];
    
    let query = `
      SELECT 
        fp.*,
        r.origin,
        r.destination,
        a.code as airline_code,
        a.name as airline_name,
        a.name_th as airline_name_th
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      INNER JOIN airlines a ON fp.airline_id = a.id
      WHERE r.origin = ANY($1)
        AND r.destination = $2
        AND DATE(fp.departure_date) >= DATE($3)
        AND DATE(fp.departure_date) <= DATE($4)
        AND fp.trip_type = $5
    `;

    const params: any[] = [originCodes, destination, startDateStr, endDateStr, tripType];
    let paramIndex = 6;

    // Only filter by travel_class if column exists
    // Query data directly from database based on selected travel class
    if (hasTravelClassColumn) {
      query += ` AND COALESCE(fp.travel_class, 'economy') = $${paramIndex}`;
      params.push(travelClass); // Query data for the selected travel class directly from database
      paramIndex++;
    }

    if (airlineIds && airlineIds.length > 0) {
      query += ` AND fp.airline_id = ANY($${paramIndex})`;
      params.push(airlineIds);
      paramIndex++;
    }

    // Add LIMIT to prevent querying too much data
    // เพิ่ม LIMIT เป็น 50000 เพื่อให้ครอบคลุมข้อมูลมากขึ้น (180 days * ~300 flights per day = 54000)
    // แต่ถ้าเป็นเดือนเดียว (30 วัน * ~300 flights = 9000) ก็เพียงพอ
    query += ` ORDER BY fp.departure_date, fp.price ASC LIMIT 50000`;

    const result = await pool.query(query, params);
    
    // Log query results for debugging
    const originStr = Array.isArray(origin) ? origin.join(', ') : origin;
    console.log(`[FlightModel.getFlightPrices] Found ${result.rows.length} flights for ${originStr} -> ${destination}`);
    
    return result.rows;
  }

  /**
   * Get available airlines for a route
   */
  static async getAvailableAirlines(
    origin: string | string[],
    destination: string
  ): Promise<Airline[]> {
    // Handle multiple origins (e.g., Bangkok has BKK and DMK)
    const originCodes = Array.isArray(origin) ? origin : [origin];
    
    const query = `
      SELECT DISTINCT a.*
      FROM airlines a
      INNER JOIN flight_prices fp ON a.id = fp.airline_id
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = ANY($1) AND r.destination = $2
      ORDER BY a.name
    `;

    const result = await pool.query(query, [originCodes, destination]);
    return result.rows;
  }

  /**
   * Get all airlines from database
   * Returns all airlines regardless of route
   */
  static async getAllAirlines(): Promise<Airline[]> {
    try {
      const query = `
        SELECT *
        FROM airlines
        ORDER BY name
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error: any) {
      // Import logDatabaseError dynamically to avoid circular dependencies
      const { logDatabaseError } = await import('../utils/errorLogger');
      logDatabaseError('FlightModel.getAllAirlines', error, {});
      
      // Ensure we throw an Error instance
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error?.message || error?.detail || JSON.stringify(error) || 'Database error: Failed to get airlines');
    }
  }

  /**
   * Get a route by origin and destination
   */
  static async getRoute(origin: string, destination: string): Promise<Route | null> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes WHERE origin = $1 AND destination = $2`,
      [origin, destination]
    );

    return result.rows[0] || null;
  }

  /**
   * Get a route by ID
   */
  static async getRouteById(routeId: number): Promise<Route | null> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes WHERE id = $1`,
      [routeId]
    );

    return result.rows[0] || null;
  }

  /**
   * Get all routes
   */
  static async getAllRoutes(): Promise<Route[]> {
    const result = await pool.query(
      `SELECT id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at 
       FROM routes 
       ORDER BY origin, destination`
    );

    return result.rows;
  }

  /**
   * Get or create a route
   */
  static async getOrCreateRoute(
    origin: string,
    destination: string,
    basePrice: number,
    avgDuration: number
  ): Promise<Route> {
    // Try to get existing route
    const existingRoute = await this.getRoute(origin, destination);

    if (existingRoute) {
      return existingRoute;
    }

    // Create new route
    const result = await pool.query(
      `INSERT INTO routes (origin, destination, base_price, avg_duration_minutes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING id, origin, destination, base_price, avg_duration_minutes AS avg_duration, created_at, updated_at`,
      [origin, destination, basePrice, avgDuration]
    );

    return result.rows[0];
  }

  /**
   * Get or create an airline
   */
  static async getOrCreateAirline(
    code: string,
    name: string,
    nameTh: string
  ): Promise<Airline> {
    // Try to get existing airline
    const existingAirline = await pool.query(
      'SELECT * FROM airlines WHERE code = $1',
      [code]
    );

    if (existingAirline.rows.length > 0) {
      return existingAirline.rows[0];
    }

    // Create new airline
    const result = await pool.query(
      `INSERT INTO airlines (code, name, name_th, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [code, name, nameTh]
    );

    return result.rows[0];
  }

  /**
   * Insert or update flight price
   * Automatically saves previous values to history table before updating
   */
  static async upsertFlightPrice(
    routeId: number,
    airlineId: number,
    departureDate: Date,
    returnDate: Date | null,
    price: number,
    basePrice: number,
    departureTime: string,
    arrivalTime: string,
    duration: number,
    flightNumber: string,
    tripType: 'one-way' | 'round-trip',
    season: 'high' | 'normal' | 'low'
  ): Promise<FlightPriceRecord> {
    // Check if existing record exists
    const existingQuery = `
      SELECT * FROM flight_prices 
      WHERE route_id = $1 
        AND airline_id = $2 
        AND departure_date = $3 
        AND trip_type = $4
    `;
    
    const existingResult = await pool.query(existingQuery, [
      routeId,
      airlineId,
      departureDate,
      tripType,
    ]);

    // If existing record exists and price/data changed, save to history
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0];
      const hasChanged = 
        existing.price !== price ||
        existing.base_price !== basePrice ||
        existing.departure_time !== departureTime ||
        existing.arrival_time !== arrivalTime ||
        existing.duration !== duration ||
        existing.flight_number !== flightNumber ||
        existing.season !== season ||
        (existing.return_date?.toISOString() !== returnDate?.toISOString());

      if (hasChanged) {
        // Save to history table before updating
        try {
          await pool.query(`
            INSERT INTO flight_prices_history (
              route_id, airline_id, departure_date, return_date, price, base_price,
              departure_time, arrival_time, duration, flight_number, trip_type, season,
              recorded_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
          `, [
            existing.route_id,
            existing.airline_id,
            existing.departure_date,
            existing.return_date,
            existing.price,
            existing.base_price,
            existing.departure_time,
            existing.arrival_time,
            existing.duration,
            existing.flight_number,
            existing.trip_type,
            existing.season,
          ]);
        } catch (historyError) {
          // Log error but don't fail the update if history table doesn't exist yet
          console.warn('Failed to save flight price history (this is OK if migration 009 not run yet):', historyError);
        }
      }
    }

    // Perform the upsert
    // ✅ Updated constraint: Now includes flight_number to allow multiple flights per day
    const query = `
      INSERT INTO flight_prices (
        route_id, airline_id, departure_date, return_date, price, base_price,
        departure_time, arrival_time, duration, flight_number, trip_type, season,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      ON CONFLICT (route_id, airline_id, departure_date, trip_type, flight_number)
      DO UPDATE SET
        return_date = EXCLUDED.return_date,
        price = EXCLUDED.price,
        base_price = EXCLUDED.base_price,
        departure_time = EXCLUDED.departure_time,
        arrival_time = EXCLUDED.arrival_time,
        duration = EXCLUDED.duration,
        season = EXCLUDED.season,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await pool.query(query, [
      routeId,
      airlineId,
      departureDate,
      returnDate,
      price,
      basePrice,
      departureTime,
      arrivalTime,
      duration,
      flightNumber,
      tripType,
      season,
    ]);

    return result.rows[0];
  }

  /**
   * Batch insert flight prices (much faster than individual upserts)
   * Uses PostgreSQL multi-value INSERT with ON CONFLICT for better performance
   */
  static async batchInsertFlightPrices(
    flightPrices: Array<{
      route_id: number;
      airline_id: number;
      departure_date: Date;
      return_date?: Date | null;
      price?: number | null;
      base_price?: number | null;
      departure_time: Date | string;
      arrival_time: Date | string;
      duration: number;
      flight_number: string;
      trip_type: 'one-way' | 'round-trip';
      season?: 'high' | 'normal' | 'low' | null;
      travel_class?: string;
      search_date?: Date | null;
      airplane?: string | null;
      stops?: number;
      carbon_emissions?: number | null;
      legroom?: string | null;
      often_delayed?: boolean;
      lowest_price?: number | null;
      price_level?: string | null;
    }>
  ): Promise<void> {
    if (flightPrices.length === 0) {
      return;
    }

    // Use multi-value INSERT with ON CONFLICT for upsert behavior
    // Process in chunks to avoid query size limits
    const chunkSize = 500;
    for (let i = 0; i < flightPrices.length; i += chunkSize) {
      const chunk = flightPrices.slice(i, i + chunkSize);
      
      // Build values array
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramIndex = 1;

      chunk.forEach((fp) => {
        const placeholdersRow: string[] = [];
        placeholdersRow.push(`$${paramIndex++}`); // route_id
        placeholdersRow.push(`$${paramIndex++}`); // airline_id
        placeholdersRow.push(`$${paramIndex++}`); // departure_date
        placeholdersRow.push(`$${paramIndex++}`); // return_date
        placeholdersRow.push(`$${paramIndex++}`); // price
        placeholdersRow.push(`$${paramIndex++}`); // base_price
        placeholdersRow.push(`$${paramIndex++}`); // departure_time
        placeholdersRow.push(`$${paramIndex++}`); // arrival_time
        placeholdersRow.push(`$${paramIndex++}`); // duration
        placeholdersRow.push(`$${paramIndex++}`); // flight_number
        placeholdersRow.push(`$${paramIndex++}`); // trip_type
        placeholdersRow.push(`$${paramIndex++}`); // travel_class
        placeholdersRow.push(`$${paramIndex++}`); // season
        placeholdersRow.push(`$${paramIndex++}`); // search_date
        placeholdersRow.push(`$${paramIndex++}`); // airplane
        placeholdersRow.push(`$${paramIndex++}`); // stops
        placeholdersRow.push(`$${paramIndex++}`); // carbon_emissions
        placeholdersRow.push(`$${paramIndex++}`); // legroom
        placeholdersRow.push(`$${paramIndex++}`); // often_delayed
        placeholdersRow.push(`$${paramIndex++}`); // lowest_price
        placeholdersRow.push(`$${paramIndex++}`); // price_level
        placeholdersRow.push(`NOW()`); // created_at
        placeholdersRow.push(`NOW()`); // updated_at
        
        placeholders.push(`(${placeholdersRow.join(', ')})`);
        
        values.push(
          fp.route_id,
          fp.airline_id,
          fp.departure_date,
          fp.return_date || null,
          fp.price ?? null,
          fp.base_price ?? null,
          fp.departure_time,
          fp.arrival_time,
          fp.duration,
          fp.flight_number,
          fp.trip_type,
          fp.travel_class || 'economy',
          fp.season || null,
          fp.search_date || null,
          fp.airplane || null,
          fp.stops ?? 0,
          fp.carbon_emissions || null,
          fp.legroom || null,
          fp.often_delayed || false,
          fp.lowest_price || null,
          fp.price_level || null
        );
      });

      const query = `
        INSERT INTO flight_prices (
          route_id, airline_id, departure_date, return_date, price, base_price,
          departure_time, arrival_time, duration, flight_number, trip_type, travel_class,
          season, search_date, airplane, stops, carbon_emissions, legroom, often_delayed,
          lowest_price, price_level, created_at, updated_at
        )
        VALUES ${placeholders.join(', ')}
        ON CONFLICT (route_id, airline_id, departure_date, trip_type, flight_number, departure_time)
        DO UPDATE SET
          return_date = EXCLUDED.return_date,
          price = EXCLUDED.price,
          base_price = EXCLUDED.base_price,
          arrival_time = EXCLUDED.arrival_time,
          duration = EXCLUDED.duration,
          travel_class = EXCLUDED.travel_class,
          season = EXCLUDED.season,
          search_date = EXCLUDED.search_date,
          airplane = EXCLUDED.airplane,
          stops = EXCLUDED.stops,
          carbon_emissions = EXCLUDED.carbon_emissions,
          legroom = EXCLUDED.legroom,
          often_delayed = EXCLUDED.often_delayed,
          lowest_price = EXCLUDED.lowest_price,
          price_level = EXCLUDED.price_level,
          updated_at = NOW()
      `;

      await pool.query(query, values);
    }
  }

  /**
   * Get price statistics for a route
   */
  static async getPriceStatistics(
    origin: string,
    destination: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    min: number;
    max: number;
    avg: number;
    count: number;
  }> {
    let query = `
      SELECT 
        MIN(price) as min,
        MAX(price) as max,
        AVG(price) as avg,
        COUNT(*) as count
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = $1 AND r.destination = $2
    `;

    const params: any[] = [origin, destination];

    if (startDate) {
      query += ` AND fp.departure_date >= $3`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND fp.departure_date <= $${params.length + 1}`;
      params.push(endDate);
    }

    const result = await pool.query(query, params);
    return result.rows[0];
  }
}

