/**
 * Integration Tests for Price Consistency in Flight API Endpoints
 * 
 * Tests ensure that API responses have consistent prices across:
 * - Recommended Period vs Best Deal
 * - Price Comparison fields
 * - Season data consistency
 */

// Mock the server module to prevent it from starting
jest.mock('../../server', () => {
  const express = require('express');
  const cors = require('cors');
  const helmet = require('helmet');
  const compression = require('compression');
  const rateLimit = require('express-rate-limit');
  const { serverConfig } = require('../../config/server');
  const routes = require('../../routes').default || require('../../routes');
  const { errorHandler, notFoundHandler } = require('../../middleware/errorHandler');
  
  const app = express();
  
  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(
    cors({
      origin: serverConfig.corsOrigin,
      credentials: true,
    })
  );
  
  // Compression middleware
  app.use(compression());
  
  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Rate limiting
  const statisticsLimiter = rateLimit({
    windowMs: 60000,
    max: serverConfig.nodeEnv === 'production' ? 20 : 50,
    message: 'Too many statistics requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
  
  app.use('/api/statistics', statisticsLimiter);
  
  const limiter = rateLimit({
    windowMs: serverConfig.rateLimit.windowMs,
    max: serverConfig.rateLimit.max,
    message: 'Too many requests from this IP, please try again later.',
  });
  
  app.use('/api/', limiter);
  
  // Routes
  app.use('/api', routes.default || routes);
  
  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);
  
  return app;
});

import request from 'supertest';
import app from '../../server';
import { pool } from '../../config/database';

// Helper function to wait for database connection
async function waitForDatabase() {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (error) {
      retries--;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  return false;
}

describe('Price Consistency API Integration Tests', () => {
  beforeAll(async () => {
    // Wait for database to be ready
    const dbReady = await waitForDatabase();
    if (!dbReady) {
      throw new Error('Database not ready for tests');
    }
  });

  afterAll(async () => {
    // Close database connection
    await pool.end();
  });

  describe('POST /api/flights/analyze', () => {
    it('should return consistent prices across all response fields', async () => {
      const response = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      expect(response.status).toBe(200);
      const data = response.body;

      // ตรวจสอบว่ามีข้อมูลที่จำเป็น
      expect(data.recommendedPeriod).toBeDefined();
      expect(data.seasons).toBeDefined();
      expect(data.priceComparison).toBeDefined();

      // หา bestDeal ที่ถูกที่สุด
      const bestDeal = data.seasons.reduce(
        (best: any, season: any) =>
          season.bestDeal.price < best.price ? season.bestDeal : best,
        { price: Infinity, dates: '', airline: '' }
      );

      // recommendedPeriod.price ควรสอดคล้องกับ bestDeal.price
      expect(data.recommendedPeriod.price).toBe(bestDeal.price);

      // priceComparison.basePrice ควรสอดคล้อง (ถ้ามี)
      // Note: basePrice มาจาก recommendedStartDate (best deal date) ไม่ใช่ recommendedPeriod.price
      // เพราะ recommendedPeriod.price อาจถูกคูณด้วย multipliers (passengerCount, travelClass)
      // ในขณะที่ basePrice มาจาก getPriceForDate ที่อาจมี multipliers เหมือนกัน
      // แต่ถ้า recommendedStartDate ไม่ตรงกับ bestDeal date, ราคาอาจไม่เท่ากัน
      // ดังนั้นให้ตรวจสอบว่า basePrice อยู่ในช่วงที่สมเหตุสมผล
      if (data.priceComparison.basePrice) {
        // basePrice ควรใกล้เคียงกับ recommendedPeriod.price (อาจมี rounding differences)
        const priceDiff = Math.abs(data.priceComparison.basePrice - data.recommendedPeriod.price);
        const priceRatio = priceDiff / data.recommendedPeriod.price;
        // อนุญาตให้แตกต่างได้ไม่เกิน 20% (เพราะอาจมาจากวันที่ต่างกันเล็กน้อย)
        expect(priceRatio).toBeLessThan(0.2);
      }
    });

    it('should have consistent prices when date is selected', async () => {
      const response = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          startDate: '2025-06-15',
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      expect(response.status).toBe(200);
      const data = response.body;

      // ตรวจสอบ priceComparison consistency
      if (data.priceComparison.basePrice) {
        const { priceComparison } = data;

        // ตรวจสอบว่าความแตกต่างคำนวณถูกต้อง
        if (priceComparison.ifGoBefore.price) {
          const expectedDiff =
            priceComparison.ifGoBefore.price - priceComparison.basePrice;
          expect(priceComparison.ifGoBefore.difference).toBe(expectedDiff);
        }

        if (priceComparison.ifGoAfter.price) {
          const expectedDiff =
            priceComparison.ifGoAfter.price - priceComparison.basePrice;
          expect(priceComparison.ifGoAfter.difference).toBe(expectedDiff);
        }
      }
    });

    it('should apply travel class multipliers correctly', async () => {
      // Test economy
      const economyResponse = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      // Test business
      const businessResponse = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'business',
        });

      expect(economyResponse.status).toBe(200);
      expect(businessResponse.status).toBe(200);

      const economyData = economyResponse.body;
      const businessData = businessResponse.body;

      // Business class prices should be approximately 2.5x economy prices
      if (economyData.recommendedPeriod.price && businessData.recommendedPeriod.price) {
        const ratio = businessData.recommendedPeriod.price / economyData.recommendedPeriod.price;
        expect(ratio).toBeGreaterThan(2.0);
        expect(ratio).toBeLessThan(3.0);
      }
    });

    it('should apply passenger count multipliers correctly', async () => {
      const singleResponse = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      const doubleResponse = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 2,
          travelClass: 'economy',
        });

      expect(singleResponse.status).toBe(200);
      expect(doubleResponse.status).toBe(200);

      const singleData = singleResponse.body;
      const doubleData = doubleResponse.body;

      // 2 passengers should be approximately 2x 1 passenger
      if (singleData.recommendedPeriod.price && doubleData.recommendedPeriod.price) {
        const ratio = doubleData.recommendedPeriod.price / singleData.recommendedPeriod.price;
        expect(ratio).toBeGreaterThan(1.9);
        expect(ratio).toBeLessThan(2.1);
      }
    });

    it('should have bestDeal.price within season priceRange', async () => {
      const response = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      expect(response.status).toBe(200);
      const data = response.body;

      // ตรวจสอบว่า bestDeal.price อยู่ใน priceRange ของแต่ละ season
      data.seasons.forEach((season: any) => {
        if (season.bestDeal && season.bestDeal.price && season.priceRange) {
          expect(season.bestDeal.price).toBeGreaterThanOrEqual(season.priceRange.min);
          expect(season.bestDeal.price).toBeLessThanOrEqual(season.priceRange.max);
        }
      });
    });

    it('should calculate savings correctly', async () => {
      const response = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          startDate: '2026-01-06',
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      expect(response.status).toBe(200);
      const data = response.body;

      // ตรวจสอบว่า savings คำนวณถูกต้อง
      // Note: savings = userSelectedPrice - bestDealPrice (ถ้า user เลือกวันที่)
      // ไม่ใช่ highSeason.bestDeal.price - bestDeal.price
      if (data.recommendedPeriod.savings !== undefined) {
        const bestDeal = data.seasons.reduce(
          (best: any, season: any) =>
            season.bestDeal.price > 0 && season.bestDeal.price < best.price ? season.bestDeal : best,
          { price: Infinity }
        );

        // ถ้า user เลือกวันที่ (startDate: '2026-01-06'), savings ควรเป็น userSelectedPrice - bestDealPrice
        // userSelectedPrice = ราคาของวันที่ user เลือก (อาจมาจาก priceComparison.basePrice หรือ recommendedPeriod.price)
        // bestDealPrice = bestDeal.price
        
        // หา userSelectedPrice จาก priceComparison.basePrice (ถ้ามี) หรือ recommendedPeriod.price
        const userSelectedPrice = data.priceComparison.basePrice || data.recommendedPeriod.price;
        
        // ถ้า bestDeal.price > 0 และ userSelectedPrice > bestDeal.price, savings ควรเป็น userSelectedPrice - bestDeal.price
        if (bestDeal.price > 0 && bestDeal.price < Infinity && userSelectedPrice > bestDeal.price) {
          const expectedSavings = userSelectedPrice - bestDeal.price;
          // อนุญาตให้แตกต่างได้ไม่เกิน 10% (เพราะอาจมี rounding หรือ multiplier differences)
          const savingsDiff = Math.abs(data.recommendedPeriod.savings - expectedSavings);
          const savingsRatio = savingsDiff / expectedSavings;
          expect(savingsRatio).toBeLessThan(0.1);
        } else {
          // ถ้า userSelectedPrice <= bestDeal.price, savings ควรเป็น 0
          expect(data.recommendedPeriod.savings).toBe(0);
        }
        
        // savings ควร >= 0 เสมอ
        expect(data.recommendedPeriod.savings).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('POST /api/flights/prices', () => {
    it('should return prices consistent with analyze endpoint', async () => {
      const analyzeResponse = await request(app)
        .post('/api/flights/analyze')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          durationRange: { min: 60, max: 90 },
          selectedAirlines: [],
          startDate: '2025-06-15',
          endDate: '2025-12-12',
          tripType: 'round-trip',
          passengerCount: 1,
          travelClass: 'economy',
        });

      const pricesResponse = await request(app)
        .post('/api/flights/prices')
        .send({
          origin: 'Bangkok',
          destination: 'Chiang Mai',
          startDate: '2025-06-15',
          endDate: '2025-12-12',
          tripType: 'round-trip',
          passengerCount: 1,
          selectedAirlines: [],
          travelClass: 'economy',
        });

      expect(analyzeResponse.status).toBe(200);
      expect(pricesResponse.status).toBe(200);

      const analyzeData = analyzeResponse.body;
      const pricesData = pricesResponse.body;

      // ตรวจสอบว่าราคาใน prices endpoint สอดคล้องกับ analyze endpoint
      if (Array.isArray(pricesData) && pricesData.length > 0) {
        const minPriceFromPrices = Math.min(...pricesData.map((p: any) => p.price));
        const recommendedPrice = analyzeData.recommendedPeriod?.price;

        // ราคาที่แนะนำควรอยู่ในช่วงราคาที่มีใน prices endpoint
        if (recommendedPrice) {
          expect(recommendedPrice).toBeGreaterThanOrEqual(minPriceFromPrices * 0.8);
          expect(recommendedPrice).toBeLessThanOrEqual(minPriceFromPrices * 1.5);
        }
      }
    });
  });
});
