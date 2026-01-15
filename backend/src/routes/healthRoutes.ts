import { Router } from 'express';
import {
  checkDatabase,
  checkEnvironment,
  getDetailedHealth,
  getEndpointsStatus,
} from '../controllers/healthController';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'flight-search-api',
  });
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check (database, environment)
 * @access  Public
 */
router.get('/detailed', getDetailedHealth);

/**
 * @route   GET /api/health/database
 * @desc    Check database connectivity
 * @access  Public
 */
router.get('/database', checkDatabase);


/**
 * @route   GET /api/health/environment
 * @desc    Check environment variables
 * @access  Public
 */
router.get('/environment', checkEnvironment);

/**
 * @route   GET /api/health/endpoints
 * @desc    List all available endpoints
 * @access  Public
 */
router.get('/endpoints', getEndpointsStatus);

export default router;

