import { Router } from 'express';
import {
  getAllAirlines,
  getAirlineByCode,
} from '../controllers/airlineController';

const router = Router();

/**
 * @route   GET /api/airlines
 * @desc    Get all airlines
 * @access  Public
 */
router.get('/', getAllAirlines);

/**
 * @route   GET /api/airlines/:code
 * @desc    Get airline by code
 * @access  Public
 */
router.get('/:code', getAirlineByCode);

export default router;

