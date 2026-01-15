import { Request, Response, NextFunction } from 'express';
import { FlightModel } from '../models/Flight';
import { logApiError } from '../utils/errorLogger';

/**
 * Get all airlines
 * GET /api/airlines
 */
export async function getAllAirlines(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get all airlines from database
    const airlines = await FlightModel.getAllAirlines();
    
    res.json(airlines);
  } catch (error: any) {
    logApiError('AirlineController', 'getAllAirlines', error, {
      requestParams: {},
    });
    // Ensure we throw an Error instance
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error(error?.message || error?.detail || JSON.stringify(error) || 'Failed to get airlines'));
    }
  }
}

/**
 * Get airline by code
 * GET /api/airlines/:code
 */
export async function getAirlineByCode(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;

    if (!code) {
      res.status(400).json({
        error: 'Airline code is required',
      });
      return;
    }

    // Get airline from database
    const airlines = await FlightModel.getAllAirlines();
    const airline = airlines.find(a => a.code.toUpperCase() === code.toUpperCase());

    if (!airline) {
      res.status(404).json({
        error: 'Airline not found',
        message: `Airline with code "${code.toUpperCase()}" not found in database`,
      });
      return;
    }

    res.json(airline);
  } catch (error: any) {
    logApiError('AirlineController', 'getAirlineByCode', error, {
      requestParams: {
        code: req.params?.code,
      },
    });
    // Ensure we throw an Error instance
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error(error?.message || error?.detail || JSON.stringify(error) || 'Failed to get airline'));
    }
  }
}

