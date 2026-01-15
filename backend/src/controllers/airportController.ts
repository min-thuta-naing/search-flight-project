import { Request, Response, NextFunction } from 'express';
import { AirportModel } from '../models/Airport';

/**
 * Search airports and cities
 * GET /api/airports/search?keyword=bangkok&subType=AIRPORT
 */
export async function searchAirports(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { keyword, subType } = req.query;

    if (!keyword || typeof keyword !== 'string') {
      res.status(400).json({
        error: 'keyword parameter is required',
      });
      return;
    }

    // Search airports from database
    const airports = await AirportModel.searchAirports(keyword);
    
    if (airports.length === 0) {
      res.status(404).json({
        error: 'No airports found',
        message: `No airports found matching "${keyword}"`,
      });
      return;
    }
    
    res.json(airports);
  } catch (error) {
    next(error);
  }
}

/**
 * Get airport details by code
 * GET /api/airports/:code
 */
export async function getAirportDetails(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    if (!code) {
      res.status(400).json({
        error: 'Airport code is required',
      });
      return;
    }

    // Get airport from database
    const airport = await AirportModel.getAirportByCode(code.toUpperCase());

    if (!airport) {
      res.status(404).json({
        error: 'Airport not found',
        message: `Airport with code "${code.toUpperCase()}" not found in database`,
      });
      return;
    }

    res.json(airport);
  } catch (error) {
    next(error);
  }
}

