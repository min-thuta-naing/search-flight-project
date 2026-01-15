import { Request, Response, NextFunction } from 'express';
import { FlightAnalysisService } from '../services/flightAnalysisService';
import { PricePredictionService } from '../services/pricePredictionService';
import { FlightModel } from '../models/Flight';
import { convertToAirportCode } from '../utils/airportCodeConverter';
import { logApiError } from '../utils/errorLogger';
import {
  AnalyzeFlightPricesRequest,
  FlightPriceParams,
  PredictPriceRequest,
  PriceTrendRequest,
  PredictPriceRangeRequest,
} from '../types';
import { parseISO, format, addDays } from 'date-fns';

const flightAnalysisService = new FlightAnalysisService();
const pricePredictionService = new PricePredictionService();

/**
 * Convert province value to airport code
 * GET /api/flights/airport-code?province=bangkok
 * Note: This is a fallback - should use /api/airports/search instead
 */
export async function getAirportCodeByProvince(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const { province } = req.query;
    
    if (!province || typeof province !== 'string') {
      res.status(400).json({
        error: 'Province parameter is required',
      });
      return;
    }

    // Use airport code converter utility
    const airportCode = await convertToAirportCode(province);
    
    res.json({
      province: province.toLowerCase(),
      airportCode: airportCode,
    });
  } catch (error: any) {
    const provinceParam = req.query.province as string || 'unknown';
    res.status(404).json({
      error: 'Airport not found',
      message: error.message || `Could not find airport for province: ${provinceParam}. Please use /api/airports/search instead.`,
    });
  }
}

/**
 * Analyze flight prices and generate recommendations
 * POST /api/flights/analyze
 */
export async function analyzeFlightPrices(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  try {
    const params: AnalyzeFlightPricesRequest = req.body;

    // Extract passenger breakdown with defaults
    const passengerCount = params.passengerCount || 1;
    const passengers = params.passengers || { adults: 1, children: 0, infants: 0 };

    if (!params.passengers && passengerCount > 1) {
      passengers.adults = passengerCount;
    }

    // Debug: Log travel class from request body
    console.log('[FlightController] Request body passenger and travelClass:', {
      passengerCount,
      passengers,
      adults: passengers.adults,
      children: passengers.children,
      infants: passengers.infants,
      travelClass: req.body?.travelClass,
      hasTravelClass: 'travelClass' in (req.body || {}),
      allKeys: Object.keys(req.body || {}),
    });

    const result = await flightAnalysisService.analyzeFlightPrices({
      ...params,
      // passengerCount,
      passengers, // Pass detailed breakdown
    });

    res.json(result);
  } catch (error: any) {
    logApiError('FlightController', 'analyzeFlightPrices', error, {
      requestParams: {
        origin: req.body?.origin,
        destination: req.body?.destination,
        durationRange: req.body?.durationRange,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        tripType: req.body?.tripType,
        passengerCount: req.body?.passengerCount,
        selectedAirlines: req.body?.selectedAirlines,
        travelClass: req.body?.travelClass,
      },
    });
    _next(error);
  }
}

/**
 * Get flight prices for specific dates
 * POST /api/flights/prices
 */
export async function getFlightPrices(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params: FlightPriceParams = req.body;
    const {
      origin,
      destination,
      startDate,
      endDate,
      tripType,
      passengerCount,
      passengers = { adults: 1, children: 0, infants: 0 }, // Default if not provided
      selectedAirlines,
      travelClass = 'economy',
    } = params;

    if (!params.passengers && passengerCount > 1) {
      passengers.adults = passengerCount;
    }

    // Convert province/country values to airport codes
    let originAirportCode: string | string[] = await convertToAirportCode(origin);
    const destinationAirportCode = await convertToAirportCode(destination);

    // Handle Bangkok: query both BKK and DMK airports
    // Bangkok has 2 airports: BKK (Suvarnabhumi) and DMK (Don Mueang)
    if (originAirportCode === 'BKK' || origin.toLowerCase() === 'bangkok') {
      originAirportCode = ['BKK', 'DMK'];
      console.log(`[FlightController] Bangkok origin detected, querying both BKK and DMK`);
    }

    // Parse dates - ใช้เฉพาะส่วนวันที่ (ไม่รวมเวลา) เพื่อหลีกเลี่ยง timezone issues
    // Frontend ส่งมาเป็น "2025-12-11" (date-only string)
    // Parse เป็น UTC date ที่เวลา 00:00:00 เพื่อให้แน่ใจว่าใช้วันที่ที่ถูกต้อง
    const startDateObj = (() => {
      const dateOnly = startDate.split('T')[0]; // เช่น "2025-12-11"
      return parseISO(dateOnly + 'T00:00:00.000Z'); // สร้างเป็น UTC date
    })();
    const endDateObj = endDate ? (() => {
      const dateOnly = endDate.split('T')[0];
      return parseISO(dateOnly + 'T00:00:00.000Z');
    })() : undefined;

    // Get airline IDs if selected
    let airlineIds: number[] | undefined;
    if (selectedAirlines.length > 0) {
      // originAirportCode might be array for Bangkok, getAvailableAirlines handles it
      const availableAirlines = await FlightModel.getAvailableAirlines(
        originAirportCode,
        destinationAirportCode
      );
      airlineIds = availableAirlines
        .filter((a) => selectedAirlines.includes(a.code))
        .map((a) => a.id);
    }

    // Get flight prices
    const flightRecords = await FlightModel.getFlightPrices(
      originAirportCode,
      destinationAirportCode,
      startDateObj,
      endDateObj,
      tripType,
      airlineIds,
      travelClass
    );


    

    // Transform to response format
    // Use prices directly from database based on travel class (no multiplier)
    const flightPrices = flightRecords.map((fp: any) => {
      // fp is from database query which includes JOIN with airlines table
      // So it has: airline_code, airline_name, airline_name_th from the JOIN
      // Database already filtered by travel_class, so use price directly

      
      const adultPrice = fp.price * passengers.adults;
      const childPrice = fp.price * passengers.children * 0.75; // 25% discount for children
      const infantPrice = fp.price * passengers.infants * 0.1; // 90% discount for infants (lap infants)
      
      const totalPrice = adultPrice + childPrice + infantPrice;

      // Convert carbon_emissions from grams to kg
      const carbonEmissionsKg = fp.carbon_emissions ? (fp.carbon_emissions / 1000).toFixed(1) : null;

      return {
        airline: fp.airline_name_th || fp.airline_name,
        airline_code: fp.airline_code || '',
        airline_name: fp.airline_name || '',
        airline_name_th: fp.airline_name_th || '',
        //price: Math.round(fp.price * passengerCount), // Only multiply by passenger count, no travel class multiplier
        price: Math.round(totalPrice), // Use calculated price with discounts instead 
        // price: Math.round(
        //   flightAnalysisService['calculatePriceWithDiscounts'](fp.price, passengers)
        // ),
        departureTime: fp.departure_time,
        arrivalTime: fp.arrival_time,
        duration: fp.duration,
        flightNumber: fp.flight_number,
        travelClass: fp.travel_class || travelClass, // Use travel_class from database
        departureDate: fp.departure_date ? new Date(fp.departure_date).toISOString().split('T')[0] : undefined,
        airplane: fp.airplane || null,
        often_delayed: fp.often_delayed || false,
        carbon_emissions: carbonEmissionsKg,
        legroom: fp.legroom || null,
      };
    });

    res.json(flightPrices);
  } catch (error: any) {
    logApiError('FlightController', 'getFlightPrices', error, {
      requestParams: {
        origin: req.body?.origin,
        destination: req.body?.destination,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        tripType: req.body?.tripType,
        passengerCount: req.body?.passengerCount,
        travelClass: req.body?.travelClass,
        selectedAirlines: req.body?.selectedAirlines,
      },
    });
    // Ensure we throw an Error instance
    if (error instanceof Error) {
      next(error);
    } else {
      next(new Error(error?.message || error?.detail || JSON.stringify(error) || 'Failed to get flight prices'));
    }
  }
}

/**
 * Get available airlines for a route
 * GET /api/flights/airlines
 */
export async function getAvailableAirlines(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { origin, destination } = req.query as {
      origin: string;
      destination: string;
    };

    // Convert province/country values to airport codes
    let originAirportCode: string | string[] = await convertToAirportCode(origin);
    const destinationAirportCode = await convertToAirportCode(destination);

    // Handle Bangkok: query both BKK and DMK airports
    if (originAirportCode === 'BKK' || origin.toLowerCase() === 'bangkok') {
      originAirportCode = ['BKK', 'DMK'];
    }

    const airlines = await FlightModel.getAvailableAirlines(originAirportCode, destinationAirportCode);

    // Return airline codes
    const airlineCodes = airlines.map((a) => a.code);

    res.json(airlineCodes);
  } catch (error) {
    next(error);
  }
}

/**
 * Predict price for a future date
 * POST /api/flights/predict-price
 */
export async function predictPrice(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params: PredictPriceRequest = req.body;
    const {
      origin,
      destination,
      targetDate,
      tripType = 'round-trip',
      daysOfHistory = 90,
    } = params;

    // Convert province/country values to airport codes
    const originAirportCode = await convertToAirportCode(origin);
    const destinationAirportCode = await convertToAirportCode(destination);

    // Parse target date - ใช้เฉพาะส่วนวันที่ (ไม่รวมเวลา) เพื่อหลีกเลี่ยง timezone issues
    // Frontend ส่งมาเป็น "2025-12-11" (date-only string)
    // Parse เป็น UTC date ที่เวลา 00:00:00 เพื่อให้แน่ใจว่าใช้วันที่ที่ถูกต้อง
    const targetDateObj = (() => {
      const dateOnly = targetDate.split('T')[0]; // เช่น "2025-12-11"
      return parseISO(dateOnly + 'T00:00:00.000Z'); // สร้างเป็น UTC date
    })();

    // Predict price
    const prediction = await pricePredictionService.predictPrice(
      originAirportCode,
      destinationAirportCode,
      targetDateObj,
      tripType,
      daysOfHistory
    );

    if (!prediction) {
      res.status(404).json({
        error: 'Insufficient data for prediction',
        message: 'Not enough historical data available for this route',
      });
      return;
    }

    res.json(prediction);
  } catch (error) {
    next(error);
  }
}

/**
 * Get price trend analysis
 * POST /api/flights/price-trend
 */
export async function getPriceTrend(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params: PriceTrendRequest = req.body;
    const {
      origin,
      destination,
      tripType = 'round-trip',
      daysAhead = 30,
    } = params;

    // Convert province/country values to airport codes
    const originAirportCode = await convertToAirportCode(origin);
    const destinationAirportCode = await convertToAirportCode(destination);

    // Get price trend
    const trend = await pricePredictionService.getPriceTrend(
      originAirportCode,
      destinationAirportCode,
      tripType,
      daysAhead
    );

    if (!trend) {
      res.status(404).json({
        error: 'Insufficient data for trend analysis',
        message: 'Not enough historical data available for this route',
      });
      return;
    }

    res.json(trend);
  } catch (error) {
    next(error);
  }
}

/**
 * Predict prices for a date range (price forecast)
 * POST /api/flights/predict-price-range
 */
export async function predictPriceRange(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const params: PredictPriceRangeRequest = req.body;
    const {
      origin,
      destination,
      startDate,
      endDate,
      tripType = 'round-trip',
    } = params;

    // Convert province/country values to airport codes
    const originAirportCode = await convertToAirportCode(origin);
    const destinationAirportCode = await convertToAirportCode(destination);

    // Parse dates - ใช้เฉพาะส่วนวันที่ (ไม่รวมเวลา) เพื่อหลีกเลี่ยง timezone issues
    // Frontend ส่งมาเป็น "2025-12-11" (date-only string)
    // Parse เป็น UTC date ที่เวลา 00:00:00 เพื่อให้แน่ใจว่าใช้วันที่ที่ถูกต้อง
    const startDateObj = (() => {
      const dateOnly = startDate.split('T')[0]; // เช่น "2025-12-11"
      return parseISO(dateOnly + 'T00:00:00.000Z'); // สร้างเป็น UTC date
    })();
    const endDateObj = (() => {
      const dateOnly = endDate.split('T')[0];
      return parseISO(dateOnly + 'T00:00:00.000Z');
    })();

    // Validate date range
    if (startDateObj >= endDateObj) {
      res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before end date',
      });
      return;
    }

    // Predict prices for range
    const forecast = await pricePredictionService.predictPriceRange(
      originAirportCode,
      destinationAirportCode,
      startDateObj,
      endDateObj,
      tripType
    );

    // Format dates as ISO strings
    const formattedForecast = forecast.map((item) => ({
      date: item.date.toISOString().split('T')[0],
      predictedPrice: item.predictedPrice,
      minPrice: item.minPrice,
      maxPrice: item.maxPrice,
    }));

    res.json({ forecast: formattedForecast });
  } catch (error) {
    next(error);
  }
}

/**
 * Get cheapest dates for a route
 * POST /api/flights/cheapest-dates
 */
export async function getCheapestDates(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Declare variables outside try block for error logging
  let originAirportCode: string | null = null;
  let destinationAirportCode: string | null = null;

  try {
    const { origin, destination, startDate, endDate, tripType = 'round-trip' } = req.body;

    if (!origin || !destination || !startDate || !endDate) {
      res.status(400).json({
        error: 'Missing required fields: origin, destination, startDate, endDate',
      });
      return;
    }

    // Convert province/country values to airport codes
    originAirportCode = await convertToAirportCode(origin);
    destinationAirportCode = await convertToAirportCode(destination);

    if (!originAirportCode || !destinationAirportCode) {
      res.status(400).json({
        error: 'Invalid origin or destination provided.',
      });
      return;
    }

    // Parse dates
    const startDateObj = (() => {
      const dateOnly = startDate.split('T')[0];
      return parseISO(dateOnly + 'T00:00:00.000Z');
    })();
    const endDateObj = (() => {
      const dateOnly = endDate.split('T')[0];
      return parseISO(dateOnly + 'T00:00:00.000Z');
    })();

    // Validate date range
    if (startDateObj >= endDateObj) {
      res.status(400).json({
        error: 'Invalid date range',
        message: 'Start date must be before end date',
      });
      return;
    }

    // Calculate return date range (default: 7 days after departure)
    const returnStartDate = addDays(startDateObj, 7);
    const returnEndDate = addDays(endDateObj, 7);

    // Find cheapest dates from database
    const flightPrices = await FlightModel.getFlightPrices(
      originAirportCode,
      destinationAirportCode,
      startDateObj,
      endDateObj,
      tripType
    );

    if (!flightPrices || flightPrices.length === 0) {
      res.status(404).json({
        error: 'No flights found',
        message: 'Could not find any flights for the specified route and date range',
      });
      return;
    }

    // Group by departure date and find cheapest for each date
    const cheapestByDate = new Map<string, typeof flightPrices[0]>();
    flightPrices.forEach((fp) => {
      const dateKey = format(new Date(fp.departure_date), 'yyyy-MM-dd');
      const existing = cheapestByDate.get(dateKey);
      if (!existing || fp.price < existing.price) {
        cheapestByDate.set(dateKey, fp);
      }
    });

    // Format response
    const formattedResults = Array.from(cheapestByDate.values())
      .sort((a, b) => a.price - b.price)
      .slice(0, 10)
      .map((fp) => ({
        departureDate: format(new Date(fp.departure_date), 'yyyy-MM-dd'),
        returnDate: fp.return_date ? format(new Date(fp.return_date), 'yyyy-MM-dd') : null,
        price: fp.price,
        currency: 'THB',
      }));

    res.json({
      origin: originAirportCode,
      destination: destinationAirportCode,
      cheapestDates: formattedResults,
    });
  } catch (error: any) {
    logApiError('FlightController', 'getCheapestDates', error, {
      requestParams: {
        origin: req.body?.origin,
        destination: req.body?.destination,
        startDate: req.body?.startDate,
        endDate: req.body?.endDate,
        tripType: req.body?.tripType,
      },
      convertedCodes: {
        originAirportCode,
        destinationAirportCode,
      },
    });
    next(error);
  }
}

/**
 * Get price analysis for a specific route and date
 * POST /api/flights/price-analysis
 * @deprecated This endpoint is no longer available after removing Amadeus integration
 */
export async function getPriceAnalysis(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  res.status(503).json({
    error: 'Price analysis service unavailable',
    message: 'This endpoint is no longer available. Please use /api/flights/analyze for price analysis.',
  });
}


