import { Request, Response, NextFunction } from 'express';
import { convertToAirportCode } from '../utils/airportCodeConverter';
import { logApiError } from '../utils/errorLogger';
import { pool } from '../config/database';

/**
 * Get most booked destinations from an origin
 * GET /api/destinations/most-booked?origin=BKK&period=2024-01
 */
export async function getMostBookedDestinations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Declare variable outside try block for error logging
  let originAirportCode: string | null = null;

  try {
    const { origin, period } = req.query;

    if (!origin || typeof origin !== 'string') {
      res.status(400).json({
        error: 'origin parameter is required',
      });
      return;
    }

    // Convert province/country to airport code if needed
    originAirportCode = await convertToAirportCode(origin);

    if (!originAirportCode) {
      res.status(400).json({
        error: 'Invalid origin provided',
      });
      return;
    }

    // Get most booked destinations from database (count bookings by destination)
    const query = `
      SELECT 
        r.destination,
        COUNT(*) as booking_count,
        AVG(fp.price) as avg_price
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = $1
      GROUP BY r.destination
      ORDER BY booking_count DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [originAirportCode]);
    const destinations = result.rows.map((row: any) => ({
      destination: row.destination,
      bookings: parseInt(row.booking_count),
      averagePrice: parseFloat(row.avg_price),
    }));

    res.json({
      origin: originAirportCode,
      period: period || 'current',
      destinations: destinations || [],
    });
  } catch (error: any) {
    logApiError('DestinationController', 'getMostBookedDestinations', error, {
      requestParams: {
        origin: req.query?.origin,
        period: req.query?.period,
      },
      convertedCode: {
        originAirportCode: originAirportCode || 'unknown',
      },
    });
    next(error);
  }
}

/**
 * Get most traveled destinations from an origin
 * GET /api/destinations/most-traveled?origin=BKK&period=2024-01
 */
export async function getMostTraveledDestinations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Declare variable outside try block for error logging
  let originAirportCode: string | null = null;

  try {
    const { origin, period } = req.query;

    if (!origin || typeof origin !== 'string') {
      res.status(400).json({
        error: 'origin parameter is required',
      });
      return;
    }

    // Convert province/country to airport code if needed
    originAirportCode = await convertToAirportCode(origin);

    if (!originAirportCode) {
      res.status(400).json({
        error: 'Invalid origin provided',
      });
      return;
    }

    // Get most traveled destinations from database (similar to most booked)
    const query = `
      SELECT 
        r.destination,
        COUNT(*) as travel_count,
        AVG(fp.price) as avg_price
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = $1
      GROUP BY r.destination
      ORDER BY travel_count DESC
      LIMIT 10
    `;
    const result = await pool.query(query, [originAirportCode]);
    const destinations = result.rows.map((row: any) => ({
      destination: row.destination,
      travelers: parseInt(row.travel_count),
      averagePrice: parseFloat(row.avg_price),
    }));

    res.json({
      origin: originAirportCode,
      period: period || 'current',
      destinations: destinations || [],
    });
  } catch (error: any) {
    logApiError('DestinationController', 'getMostTraveledDestinations', error, {
      requestParams: {
        origin: req.query?.origin,
        period: req.query?.period,
      },
      convertedCode: {
        originAirportCode: originAirportCode || 'unknown',
      },
    });
    next(error);
  }
}

/**
 * Search destinations by budget (inspiration search)
 * GET /api/destinations/inspiration?origin=BKK&maxPrice=5000&currency=THB&departureDate=2024-06-01&oneWay=false
 */
export async function searchDestinationsByBudget(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Declare variable outside try block for error logging
  let originAirportCode: string | null = null;

  try {
    const { origin, maxPrice, currency, departureDate, oneWay } = req.query;

    if (!origin || typeof origin !== 'string') {
      res.status(400).json({
        error: 'origin parameter is required',
      });
      return;
    }

    // Convert province/country to airport code if needed
    originAirportCode = await convertToAirportCode(origin);

    if (!originAirportCode) {
      res.status(400).json({
        error: 'Invalid origin provided',
      });
      return;
    }

    const maxPriceNum = maxPrice ? parseInt(maxPrice as string, 10) : undefined;

    // Get destinations from database based on budget
    let query = `
      SELECT DISTINCT
        r.destination,
        MIN(fp.price) as min_price,
        AVG(fp.price) as avg_price
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      WHERE r.origin = $1
    `;
    const params: any[] = [originAirportCode];
    
    if (maxPriceNum) {
      query += ` AND fp.price <= $2`;
      params.push(maxPriceNum);
      query += ` GROUP BY r.destination HAVING MIN(fp.price) <= $2`;
    } else {
      query += ` GROUP BY r.destination`;
    }
    
    query += ` ORDER BY avg_price ASC LIMIT 20`;
    
    const result = await pool.query(query, params);
    const destinations = result.rows.map((row: any) => ({
      destination: row.destination,
      minPrice: parseFloat(row.min_price),
      averagePrice: parseFloat(row.avg_price),
    }));

    res.json({
      origin: originAirportCode,
      maxPrice: maxPriceNum,
      currency: currency || 'THB',
      destinations: destinations || [],
    });
  } catch (error: any) {
    logApiError('DestinationController', 'searchDestinationsByBudget', error, {
      requestParams: {
        origin: req.query?.origin,
        maxPrice: req.query?.maxPrice,
        currency: req.query?.currency,
        departureDate: req.query?.departureDate,
        oneWay: req.query?.oneWay,
      },
      convertedCode: {
        originAirportCode: originAirportCode || 'unknown',
      },
    });
    next(error);
  }
}

