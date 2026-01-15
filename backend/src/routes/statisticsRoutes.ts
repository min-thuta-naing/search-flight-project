import { Router } from 'express';
import {
  saveSearch,
  savePriceStat,
  getStatistics,
  getPriceStatistics,
} from '../controllers/statisticsController';

const router = Router();

// Save search query
router.post('/search', saveSearch);

// Save price recommendation
router.post('/price', savePriceStat);

// Get all statistics
router.get('/', getStatistics);

// Get price statistics
router.get('/price', getPriceStatistics);

export default router;

