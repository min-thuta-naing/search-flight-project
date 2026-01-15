import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export function validateBody(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Validation schemas
export const analyzeFlightPricesSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  durationRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }),
  selectedAirlines: z.array(z.string()).default([]),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tripType: z.enum(['one-way', 'round-trip']).nullable().optional(),
  passengerCount: z.number().min(1).default(1),
  passengers: z.object({
    adults: z.number().min(0).default(1),
    children: z.number().min(0).default(0),
    infants: z.number().min(0).default(0),
  }).optional().default({ adults: 1, children: 0, infants: 0 }),
  travelClass: z.enum(['economy', 'business', 'first']).optional().default('economy'),
});

export const flightPriceParamsSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string().optional(),
  tripType: z.enum(['one-way', 'round-trip']),
  passengerCount: z.number().min(1),
  passengers: z.object({
    adults: z.number().min(0).default(1),
    children: z.number().min(0).default(0),
    infants: z.number().min(0).default(0),
  }).optional().default({ adults: 1, children: 0, infants: 0 }),
  selectedAirlines: z.array(z.string()).default([]),
  travelClass: z.enum(['economy', 'business', 'first']).optional().default('economy'),
});

export const getAirlinesQuerySchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
});

// Price Prediction Validation Schemas
export const predictPriceSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  targetDate: z.string(),
  tripType: z.enum(['one-way', 'round-trip']).optional().default('round-trip'),
  daysOfHistory: z.number().min(1).max(365).optional().default(90),
});

export const priceTrendSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  tripType: z.enum(['one-way', 'round-trip']).optional().default('round-trip'),
  daysAhead: z.number().min(1).max(90).optional().default(30),
});

export const predictPriceRangeSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  tripType: z.enum(['one-way', 'round-trip']).optional().default('round-trip'),
});

export const cheapestDatesSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
  tripType: z.enum(['one-way', 'round-trip']).optional().default('round-trip'),
});

export const priceAnalysisSchema = z.object({
  origin: z.string().min(1),
  destination: z.string().min(1),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Departure date must be in YYYY-MM-DD format'),
});


