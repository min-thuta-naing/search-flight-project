import { Router } from 'express';
import flightRoutes from './flightRoutes';
import airportRoutes from './airportRoutes';
import airlineRoutes from './airlineRoutes';
import destinationRoutes from './destinationRoutes';
import statisticsRoutes from './statisticsRoutes';
import healthRoutes from './healthRoutes';

const router = Router();

// API routes
router.use('/flights', flightRoutes);
router.use('/airports', airportRoutes);
router.use('/airlines', airlineRoutes);
router.use('/destinations', destinationRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/health', healthRoutes);

export default router;

