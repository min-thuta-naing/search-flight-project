import { Router } from 'express';
import {
  analyzeFlightPrices,
  getFlightPrices,
  getAvailableAirlines,
  predictPrice,
  getPriceTrend,
  predictPriceRange,
  getAirportCodeByProvince,
  getCheapestDates,
  getPriceAnalysis,
} from '../controllers/flightController';
import {
  validateBody,
  validateQuery,
  analyzeFlightPricesSchema,
  flightPriceParamsSchema,
  getAirlinesQuerySchema,
  predictPriceSchema,
  priceTrendSchema,
  predictPriceRangeSchema,
  cheapestDatesSchema,
  priceAnalysisSchema,
} from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/flights/analyze
 * @desc    Analyze flight prices and generate recommendations
 * @access  Public
 */
router.post(
  '/analyze',
  validateBody(analyzeFlightPricesSchema),
  analyzeFlightPrices
);

/**
 * @route   POST /api/flights/prices
 * @desc    Get flight prices for specific dates
 * @access  Public
 */
router.post('/prices', validateBody(flightPriceParamsSchema), getFlightPrices);

/**
 * @route   GET /api/flights/airlines
 * @desc    Get available airlines for a route
 * @access  Public
 */
router.get(
  '/airlines',
  validateQuery(getAirlinesQuerySchema),
  getAvailableAirlines
);

/**
 * @route   GET /api/flights/airport-code
 * @desc    Convert province value to airport code
 * @access  Public
 * @query   province - Province value (e.g., 'bangkok', 'chiang-mai')
 */
router.get('/airport-code', getAirportCodeByProvince);

/**
 * @route   POST /api/flights/predict-price
 * @desc    Predict price for a future date using ML
 * @access  Public
 */
router.post(
  '/predict-price',
  validateBody(predictPriceSchema),
  predictPrice
);

/**
 * @route   POST /api/flights/price-trend
 * @desc    Get price trend analysis (increasing/decreasing/stable)
 * @access  Public
 */
router.post(
  '/price-trend',
  validateBody(priceTrendSchema),
  getPriceTrend
);

/**
 * @route   POST /api/flights/predict-price-range
 * @desc    Predict prices for a date range (price forecast)
 * @access  Public
 */
router.post(
  '/predict-price-range',
  validateBody(predictPriceRangeSchema),
  predictPriceRange
);

/**
 * @route   POST /api/flights/cheapest-dates
 * @desc    Find cheapest dates for a route
 * @access  Public
 */
router.post('/cheapest-dates', validateBody(cheapestDatesSchema), getCheapestDates);

/**
 * @route   POST /api/flights/price-analysis
 * @desc    Get price analysis for a specific route and date
 * @access  Public
 */
router.post('/price-analysis', validateBody(priceAnalysisSchema), getPriceAnalysis);

export default router;

