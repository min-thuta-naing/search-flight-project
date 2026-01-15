import { Router } from 'express';
import {
  getMostBookedDestinations,
  getMostTraveledDestinations,
  searchDestinationsByBudget,
} from '../controllers/destinationController';

const router = Router();

/**
 * @route   GET /api/destinations/most-booked
 * @desc    Get most booked destinations from an origin
 * @access  Public
 * @query   origin (required) - Origin airport code or city name
 * @query   period (optional) - Period in YYYY-MM format
 */
router.get('/most-booked', getMostBookedDestinations);

/**
 * @route   GET /api/destinations/most-traveled
 * @desc    Get most traveled destinations from an origin
 * @access  Public
 * @query   origin (required) - Origin airport code or city name
 * @query   period (optional) - Period in YYYY-MM format
 */
router.get('/most-traveled', getMostTraveledDestinations);

/**
 * @route   GET /api/destinations/inspiration
 * @desc    Search destinations by budget (inspiration search)
 * @access  Public
 * @query   origin (required) - Origin airport code or city name
 * @query   maxPrice (optional) - Maximum price
 * @query   currency (optional) - Currency code (default: THB)
 * @query   departureDate (optional) - Departure date in YYYY-MM-DD format
 * @query   oneWay (optional) - One-way trip (default: false)
 */
router.get('/inspiration', searchDestinationsByBudget);

export default router;

