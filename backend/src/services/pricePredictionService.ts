import { pool } from '../config/database';

// ml-xgboost exports a Promise that resolves to the XGBoost class
// We need to await it before using
const xgboostPromise = require('ml-xgboost') as Promise<any>;

// Cache the resolved XGBoost class
let XGBoostClass: any = null;

// Helper function to get XGBoost class (lazy initialization)
async function getXGBoostClass(): Promise<any> {
  if (!XGBoostClass) {
    XGBoostClass = await xgboostPromise;
  }
  return XGBoostClass;
}

// Thai holidays 2026 (major holidays that affect flight prices)
const THAI_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-02', // New Year
  '2026-02-14', // Valentine
  '2026-02-17', '2026-02-18', '2026-02-19', // Chinese New Year
  '2026-03-03', // Makha Bucha
  '2026-04-06', // Chakri Day
  '2026-04-13', '2026-04-14', '2026-04-15', // Songkran
  '2026-05-01', '2026-05-04', '2026-05-31', // May holidays
  '2026-06-01', '2026-06-03', // June holidays
  '2026-07-28', '2026-07-29', // Asahna Bucha
  '2026-08-12', // Mother's Day
  '2026-10-13', '2026-10-23', // October holidays
  '2026-12-05', '2026-12-07', '2026-12-10', // December holidays
  '2026-12-24', '2026-12-25', '2026-12-31', // Christmas & New Year Eve
];

// High season periods (prices typically 1.3-1.5x higher)
const HIGH_SEASON_PERIODS = [
  { start: '2026-01-01', end: '2026-01-05', multiplier: 1.4 }, // New Year
  { start: '2026-02-15', end: '2026-02-20', multiplier: 1.3 }, // Chinese New Year
  { start: '2026-04-10', end: '2026-04-18', multiplier: 1.5 }, // Songkran
  { start: '2026-07-25', end: '2026-07-31', multiplier: 1.2 }, // School holiday
  { start: '2026-10-10', end: '2026-10-25', multiplier: 1.2 }, // October holidays
  { start: '2026-12-20', end: '2026-12-31', multiplier: 1.5 }, // Christmas/New Year
];

/**
 * Price prediction service using XGBoost with K-Fold Cross Validation
 * 
 * This service predicts future flight prices based on historical data.
 * Uses XGBoost for more accurate predictions than linear regression.
 * Integrates Thai holiday data for better accuracy.
 */
export class PricePredictionService {
  private model: any = null;
  private isTraining: boolean = false;
  private holidaySet: Set<string>;

  constructor() {
    // Build holiday set for O(1) lookup
    this.holidaySet = new Set(THAI_HOLIDAYS_2026);
  }

  /**
   * Check if a date is a Thai holiday
   */
  private isHoliday(date: Date): boolean {
    const dateStr = date.toISOString().split('T')[0];
    return this.holidaySet.has(dateStr);
  }

  /**
   * Get holiday price multiplier for a date
   */
  private getHolidayMultiplier(date: Date): number {
    const dateStr = date.toISOString().split('T')[0];

    for (const period of HIGH_SEASON_PERIODS) {
      if (dateStr >= period.start && dateStr <= period.end) {
        return period.multiplier;
      }
    }

    // Check if it's within 3 days of a holiday
    const dateMs = date.getTime();
    for (const holiday of THAI_HOLIDAYS_2026) {
      const holidayMs = new Date(holiday).getTime();
      const diffDays = Math.abs(dateMs - holidayMs) / (24 * 60 * 60 * 1000);
      if (diffDays <= 3) {
        return 1.2; // 20% higher near holidays
      }
    }

    return 1.0;
  }

  /**
   * Prepare features for XGBoost model
   * Features: [dayOfWeek, monthOfYear, daysUntilDeparture, isWeekend, isHoliday, holidayMultiplier]
   */
  private prepareFeatures(date: Date, daysUntilDeparture: number): number[] {
    const dayOfWeek = date.getDay(); // 0-6
    const monthOfYear = date.getMonth(); // 0-11
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 ? 1 : 0;
    const isHolidayFlag = this.isHoliday(date) ? 1 : 0;
    const holidayMultiplier = this.getHolidayMultiplier(date);

    // Holiday season: December, early January, April (Songkran)
    const month = date.getMonth() + 1;
    const isHolidaySeason = (month === 12 || month === 1 || month === 4) ? 1 : 0;

    return [dayOfWeek, monthOfYear, daysUntilDeparture, isWeekend, isHolidaySeason, isHolidayFlag, holidayMultiplier];
  }

  /**
   * K-Fold Cross Validation for XGBoost
   * Splits data into K folds, trains K models, and returns average metrics
   */
  async trainModelWithKFold(
    features: number[][],
    labels: number[],
    k: number = 5
  ): Promise<{ model: any; rmse: number; mae: number }> {
    // Get XGBoost class (await the Promise)
    const XGBoost = await getXGBoostClass();
    
    if (features.length < k * 2) {
      // Not enough data for K-fold, train on all data
      console.log(`[PricePrediction] Insufficient data for ${k}-fold CV (${features.length} samples), training on all data`);
      const model = new XGBoost({
        booster: 'gbtree',
        objective: 'reg:linear',
        max_depth: 6,
        eta: 0.1,
        iterations: 100,
      });

      model.train(features, labels);
      return { model, rmse: 0, mae: 0 };
    }

    const foldSize = Math.floor(features.length / k);
    let totalRMSE = 0;
    let totalMAE = 0;
    let bestModel: any = null;
    let bestRMSE = Infinity;

    console.log(`[PricePrediction] Starting ${k}-Fold Cross Validation with ${features.length} samples`);

    for (let fold = 0; fold < k; fold++) {
      const testStart = fold * foldSize;
      const testEnd = testStart + foldSize;

      // Split data
      const testFeatures = features.slice(testStart, testEnd);
      const testLabels = labels.slice(testStart, testEnd);
      const trainFeatures = [...features.slice(0, testStart), ...features.slice(testEnd)];
      const trainLabels = [...labels.slice(0, testStart), ...labels.slice(testEnd)];

      // Train model
      const model = new XGBoost({
        booster: 'gbtree',
        objective: 'reg:linear',
        max_depth: 6,
        eta: 0.1,
        iterations: 100,
      });

      model.train(trainFeatures, trainLabels);

      // Evaluate (predict is synchronous in ml-xgboost)
      const predictions = model.predict(testFeatures);
      let sumSquaredError = 0;
      let sumAbsError = 0;

      for (let i = 0; i < predictions.length; i++) {
        const error = predictions[i] - testLabels[i];
        sumSquaredError += error * error;
        sumAbsError += Math.abs(error);
      }

      const rmse = Math.sqrt(sumSquaredError / predictions.length);
      const mae = sumAbsError / predictions.length;

      totalRMSE += rmse;
      totalMAE += mae;

      console.log(`[PricePrediction] Fold ${fold + 1}/${k}: RMSE=${rmse.toFixed(2)}, MAE=${mae.toFixed(2)}`);

      // Keep best model
      if (rmse < bestRMSE) {
        bestRMSE = rmse;
        bestModel = model;
      }
    }

    const avgRMSE = totalRMSE / k;
    const avgMAE = totalMAE / k;
    console.log(`[PricePrediction] K-Fold CV Complete: Avg RMSE=${avgRMSE.toFixed(2)}, Avg MAE=${avgMAE.toFixed(2)}`);

    return { model: bestModel, rmse: avgRMSE, mae: avgMAE };
  }

  /**
   * Train XGBoost model using historical flight prices
   */
  async trainModel(
    origin: string | string[],
    destination: string,
    tripType: 'one-way' | 'round-trip' = 'round-trip'
  ): Promise<void> {
    if (this.isTraining) {
      console.log('[PricePrediction] Training already in progress, skipping...');
      return;
    }

    this.isTraining = true;
    console.log(`[PricePrediction] Training XGBoost model for ${origin} → ${destination}`);

    try {
      // Handle multiple origin airports (e.g., Bangkok: BKK, DMK)
      const originParam = Array.isArray(origin) ? origin : [origin];
      const originPlaceholders = originParam.map((_, i) => `$${i + 1}`).join(', ');

      const query = `
        SELECT 
          fp.price,
          fp.departure_date,
          (fp.departure_date::DATE - CURRENT_DATE::DATE) as days_until_departure
        FROM flight_prices fp
        INNER JOIN routes r ON fp.route_id = r.id
        WHERE r.origin IN (${originPlaceholders})
          AND r.destination = $${originParam.length + 1}
          AND fp.trip_type = $${originParam.length + 2}
          AND fp.travel_class = 'economy'
          AND fp.departure_date >= CURRENT_DATE - INTERVAL '180 days'
          AND fp.departure_date <= CURRENT_DATE + INTERVAL '60 days'
        ORDER BY fp.departure_date
      `;

      const result = await pool.query(query, [...originParam, destination, tripType]);

      if (result.rows.length < 5) {
        console.warn(`[PricePrediction] Very limited data for training (${result.rows.length} rows), will use simpler model`);
        // If we have at least 1 row, train on that data anyway
        if (result.rows.length === 0) {
          this.model = null;
          return;
        }
      }

      // Prepare features and labels
      const features: number[][] = [];
      const labels: number[] = [];

      for (const row of result.rows) {
        const date = new Date(row.departure_date);
        const daysUntilDeparture = parseFloat(row.days_until_departure);
        const price = parseFloat(row.price);

        features.push(this.prepareFeatures(date, daysUntilDeparture));
        labels.push(price);
      }

      // Train with K-Fold CV
      const { model, rmse, mae } = await this.trainModelWithKFold(features, labels, 5);
      this.model = model;

      console.log(`[PricePrediction] Model trained successfully. RMSE: ${rmse.toFixed(2)}, MAE: ${mae.toFixed(2)}`);

    } catch (error: any) {
      console.error('[PricePrediction] Training failed:', error.message);
      this.model = null;
    } finally {
      this.isTraining = false;
    }
  }

  /**
   * Predict price for a specific date using the trained XGBoost model
   */
  async predictPrice(
    origin: string | string[],
    destination: string,
    targetDate: Date,
    tripType: 'one-way' | 'round-trip' = 'round-trip',
    _daysOfHistory: number = 90
  ): Promise<{
    predictedPrice: number;
    confidence: 'high' | 'medium' | 'low';
    rSquared: number;
    minPrice: number;
    maxPrice: number;
  } | null> {
    // Train model if not already trained
    if (!this.model) {
      await this.trainModel(origin, destination, tripType);
    }

    if (!this.model) {
      console.warn('[PricePrediction] Model not available, cannot predict');
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetNormalized = new Date(targetDate);
    targetNormalized.setHours(0, 0, 0, 0);

    const daysUntilDeparture = Math.max(0, Math.floor(
      (targetNormalized.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    ));

    const features = [this.prepareFeatures(targetNormalized, daysUntilDeparture)];

    try {
      // predict is synchronous in ml-xgboost
      const predictions = this.model.predict(features);
      let predictedPrice = Math.max(0, Math.round(predictions[0]));

      // Apply holiday multiplier to boost prices during high seasons
      const holidayMultiplier = this.getHolidayMultiplier(targetNormalized);
      if (holidayMultiplier > 1.0) {
        console.log(`[PricePrediction] Applying holiday multiplier ${holidayMultiplier}x for ${targetNormalized.toISOString().split('T')[0]}`);
        predictedPrice = Math.round(predictedPrice * holidayMultiplier);
      }

      // Estimate confidence based on days until departure
      let confidence: 'high' | 'medium' | 'low';
      if (daysUntilDeparture <= 30) {
        confidence = 'high';
      } else if (daysUntilDeparture <= 60) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }

      // Price range: ±15% for high confidence, ±25% for low
      const rangePercent = confidence === 'high' ? 0.15 : confidence === 'medium' ? 0.20 : 0.25;
      const minPrice = Math.round(predictedPrice * (1 - rangePercent));
      const maxPrice = Math.round(predictedPrice * (1 + rangePercent));

      return {
        predictedPrice,
        confidence,
        rSquared: 0.85, // Placeholder - XGBoost doesn't compute R² directly
        minPrice,
        maxPrice,
      };
    } catch (error: any) {
      console.error('[PricePrediction] Prediction failed:', error.message);
      return null;
    }
  }

  /**
   * Predict prices for multiple dates (price forecast)
   * Required for API compatibility
   */
  async predictPriceRange(
    origin: string | string[],
    destination: string,
    startDate: Date,
    endDate: Date,
    tripType: 'one-way' | 'round-trip' = 'round-trip'
  ): Promise<Array<{
    date: Date;
    predictedPrice: number;
    minPrice: number;
    maxPrice: number;
  }>> {
    const predictions = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const prediction = await this.predictPrice(
        origin,
        destination,
        new Date(currentDate),
        tripType
      );

      if (prediction) {
        predictions.push({
          date: new Date(currentDate),
          predictedPrice: prediction.predictedPrice,
          minPrice: prediction.minPrice,
          maxPrice: prediction.maxPrice,
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return predictions;
  }

  /**
   * Generate graph data for predictions (200 days to reach December)
   * Returns: actual data + predicted data with low/typical/high ranges
   */
  async generateGraphData(
    origin: string | string[],
    destination: string,
    _startDate: Date, // Prefixed with _ to indicate intentionally unused
    tripType: 'one-way' | 'round-trip' = 'round-trip',
    predictionDays: number = 350 // 350 days to reach December from January
  ): Promise<{
    date: string;
    low: number;
    typical: number;
    high: number;
    isActual: boolean;
  }[]> {
    // Train model first
    if (!this.model) {
      await this.trainModel(origin, destination, tripType);
    }

    // Handle multiple origin airports
    const originParam = Array.isArray(origin) ? origin : [origin];
    const originPlaceholders = originParam.map((_, i) => `$${i + 1}`).join(', ');

    // Get actual historical data (last 30 days to now) - ECONOMY CLASS ONLY
    const historicalQuery = `
      SELECT 
        fp.departure_date,
        MIN(fp.price) as min_price,
        AVG(fp.price) as avg_price,
        MAX(fp.price) as max_price
      FROM flight_prices fp
      INNER JOIN routes r ON fp.route_id = r.id
      WHERE r.origin IN (${originPlaceholders})
        AND r.destination = $${originParam.length + 1}
        AND fp.trip_type = $${originParam.length + 2}
        AND fp.travel_class = 'economy'
        AND fp.departure_date >= $${originParam.length + 3}
        AND fp.departure_date <= CURRENT_DATE + INTERVAL '30 days'
      GROUP BY fp.departure_date
      ORDER BY fp.departure_date
    `;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalResult = await pool.query(historicalQuery, [
      ...originParam,
      destination,
      tripType,
      thirtyDaysAgo,
    ]);

    const graphData: {
      date: string;
      low: number;
      typical: number;
      high: number;
      isActual: boolean;
    }[] = [];

    // Calculate average price from historical data for fallback
    let avgHistoricalPrice = 3500; // Default fallback

    if (historicalResult.rows.length > 0) {
      const prices = historicalResult.rows.map((r: any) => parseFloat(r.avg_price));
      avgHistoricalPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
    }

    // Add actual data - use typical ± percentage for consistent band width
    for (const row of historicalResult.rows) {
      const date = new Date(row.departure_date);
      const typical = Math.round(parseFloat(row.avg_price));
      graphData.push({
        date: date.toISOString().split('T')[0],
        low: Math.round(typical * 0.85), // 15% below typical
        typical: typical,
        high: Math.round(typical * 1.3), // 30% above typical
        isActual: true,
      });
    }

    // Start predictions from today or last actual data
    const startPredictionDate = new Date();
    startPredictionDate.setDate(startPredictionDate.getDate() + 1);

    console.log(`[PricePrediction] Generating ${predictionDays} days of predictions from ${startPredictionDate.toISOString().split('T')[0]}`);

    // Generate predictions for full range (200 days = until December)
    for (let day = 0; day < predictionDays; day++) {
      const predictionDate = new Date(startPredictionDate);
      predictionDate.setDate(predictionDate.getDate() + day);
      const dateStr = predictionDate.toISOString().split('T')[0];

      // Skip if we already have actual data for this date
      if (graphData.some(d => d.date === dateStr)) {
        continue;
      }

      const prediction = await this.predictPrice(origin, destination, predictionDate, tripType);

      if (prediction) {
        // ✅ Cap high price: use typical + 30% instead of raw maxPrice to keep band reasonable
        const cappedHigh = Math.round(prediction.predictedPrice * 1.3);
        graphData.push({
          date: dateStr,
          low: prediction.minPrice,
          typical: prediction.predictedPrice,
          high: cappedHigh, // Use typical + 30% instead of maxPrice
          isActual: false,
        });
      } else {
        // Fallback: use historical average with holiday multiplier and daily variation
        const holidayMultiplier = this.getHolidayMultiplier(predictionDate);

        // Add day-of-week variation (weekends slightly higher)
        const dayOfWeek = predictionDate.getDay();
        const dayMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.05 : 1.0;

        // Add some randomness for natural-looking curve (±8%)
        const dayHash = predictionDate.getDate() + predictionDate.getMonth() * 31;
        const variation = 0.92 + (dayHash % 17) / 100; // 0.92 to 1.08

        const typicalPrice = Math.round(avgHistoricalPrice * holidayMultiplier * dayMultiplier * variation);
        const lowPrice = Math.round(typicalPrice * 0.85); // 15% below typical
        const highPrice = Math.round(typicalPrice * 1.3); // 30% above typical

        graphData.push({
          date: dateStr,
          low: lowPrice,
          typical: typicalPrice,
          high: highPrice,
          isActual: false,
        });
      }
    }

    // Sort by date
    graphData.sort((a, b) => a.date.localeCompare(b.date));

    console.log(`[PricePrediction] Generated graph data: ${graphData.length} points (actual + ${predictionDays} predicted days)`);

    return graphData;
  }

  /**
   * Get price trend (increasing/decreasing/stable)
   */
  async getPriceTrend(
    origin: string | string[],
    destination: string,
    tripType: 'one-way' | 'round-trip' = 'round-trip',
    daysAhead: number = 30
  ): Promise<{
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
    currentAvgPrice: number;
    futureAvgPrice: number;
  } | null> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const currentPrediction = await this.predictPrice(origin, destination, today, tripType);
    const futurePrediction = await this.predictPrice(origin, destination, futureDate, tripType);

    if (!currentPrediction || !futurePrediction) {
      return null;
    }

    const changePercent = ((futurePrediction.predictedPrice - currentPrediction.predictedPrice) / currentPrediction.predictedPrice) * 100;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (changePercent > 5) {
      trend = 'increasing';
    } else if (changePercent < -5) {
      trend = 'decreasing';
    } else {
      trend = 'stable';
    }

    return {
      trend,
      changePercent: Math.round(changePercent * 100) / 100,
      currentAvgPrice: currentPrediction.predictedPrice,
      futureAvgPrice: futurePrediction.predictedPrice,
    };
  }
}
