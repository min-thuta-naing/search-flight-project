/**
 * Validation Script for Price Consistency
 * 
 * This script validates that prices are calculated consistently across:
 * - Recommended Period vs Best Deal
 * - Price Comparison calculations
 * - One-way vs Round-trip conversions
 * - Travel class multipliers
 * - Passenger count multipliers
 * - Season price range consistency
 * - Savings calculations
 * 
 * Usage: npm run validate:prices
 */

import { FlightAnalysisService } from '../services/flightAnalysisService';
import { AnalyzeFlightPricesRequest } from '../types';

interface TestCase {
  name: string;
  params: AnalyzeFlightPricesRequest;
  expectedChecks?: {
    oneWayMultiplier?: boolean;
    travelClassMultiplier?: boolean;
    passengerCountMultiplier?: boolean;
  };
}

async function validatePriceConsistency() {
  const service = new FlightAnalysisService();
  const errors: string[] = [];
  const warnings: string[] = [];

  const testCases: TestCase[] = [
    {
      name: 'Round-trip Economy - No Date',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        tripType: 'round-trip',
        passengerCount: 1,
        travelClass: 'economy',
      },
    },
    {
      name: 'Round-trip Economy - With Date',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        startDate: '2025-06-15',
        tripType: 'round-trip',
        passengerCount: 1,
        travelClass: 'economy',
      },
    },
    {
      name: 'One-way Economy',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        startDate: '2025-06-15',
        tripType: 'one-way',
        passengerCount: 1,
        travelClass: 'economy',
      },
      expectedChecks: {
        oneWayMultiplier: true,
      },
    },
    {
      name: 'Round-trip Business',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        tripType: 'round-trip',
        passengerCount: 1,
        travelClass: 'business',
      },
      expectedChecks: {
        travelClassMultiplier: true,
      },
    },
    {
      name: 'Round-trip First',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        tripType: 'round-trip',
        passengerCount: 1,
        travelClass: 'first',
      },
      expectedChecks: {
        travelClassMultiplier: true,
      },
    },
    {
      name: 'Round-trip Economy - 2 Passengers',
      params: {
        origin: 'Bangkok',
        destination: 'Chiang Mai',
        durationRange: { min: 60, max: 90 },
        selectedAirlines: [],
        tripType: 'round-trip',
        passengerCount: 2,
        travelClass: 'economy',
      },
      expectedChecks: {
        passengerCountMultiplier: true,
      },
    },
  ];

  console.log('🔍 Starting price consistency validation...\n');

  for (const testCase of testCases) {
    try {
      console.log(`Testing: ${testCase.name}...`);

      const result = await service.analyzeFlightPrices(testCase.params);

      // 1. Check Recommended Period vs Best Deal Consistency
      const bestDeal = result.seasons.reduce(
        (best, season) =>
          season.bestDeal.price < best.price ? season.bestDeal : best,
        { price: Infinity, dates: '', airline: '' }
      );

      if (result.recommendedPeriod.price !== bestDeal.price) {
        errors.push(
          `${testCase.name}: recommendedPeriod.price (${result.recommendedPeriod.price}) ` +
            `does not match bestDeal.price (${bestDeal.price})`
        );
      }

      // 2. Check Price Comparison Consistency
      if (result.priceComparison.basePrice) {
        const { priceComparison } = result;

        if (priceComparison.ifGoBefore.price) {
          const expectedDiff =
            priceComparison.ifGoBefore.price - priceComparison.basePrice;
          if (priceComparison.ifGoBefore.difference !== expectedDiff) {
            errors.push(
              `${testCase.name}: priceComparison.ifGoBefore.difference ` +
                `(${priceComparison.ifGoBefore.difference}) does not match ` +
                `expected (${expectedDiff})`
            );
          }
        }

        if (priceComparison.ifGoAfter.price) {
          const expectedDiff =
            priceComparison.ifGoAfter.price - priceComparison.basePrice;
          if (priceComparison.ifGoAfter.difference !== expectedDiff) {
            errors.push(
              `${testCase.name}: priceComparison.ifGoAfter.difference ` +
                `(${priceComparison.ifGoAfter.difference}) does not match ` +
                `expected (${expectedDiff})`
            );
          }
        }
      }

      // 3. Check Season Price Range Consistency
      result.seasons.forEach((season) => {
        if (
          season.bestDeal.price < season.priceRange.min ||
          season.bestDeal.price > season.priceRange.max
        ) {
          errors.push(
            `${testCase.name}: Season ${season.type} bestDeal.price ` +
              `(${season.bestDeal.price}) is outside priceRange ` +
              `[${season.priceRange.min}, ${season.priceRange.max}]`
          );
        }
      });

      // 4. Check One-way Multiplier
      if (testCase.expectedChecks?.oneWayMultiplier) {
        // Compare with round-trip version
        const roundTripParams = {
          ...testCase.params,
          tripType: 'round-trip' as const,
        };
        const roundTripResult = await service.analyzeFlightPrices(
          roundTripParams
        );

        const expectedOneWayPrice = Math.round(
          roundTripResult.recommendedPeriod.price * 0.5
        );
        if (result.recommendedPeriod.price !== expectedOneWayPrice) {
          errors.push(
            `${testCase.name}: one-way price (${result.recommendedPeriod.price}) ` +
              `does not match 0.5x round-trip price (${expectedOneWayPrice})`
          );
        }
      }

      // 5. Check Travel Class Multiplier
      if (testCase.expectedChecks?.travelClassMultiplier) {
        const economyParams = {
          ...testCase.params,
          travelClass: 'economy' as const,
        };
        const economyResult = await service.analyzeFlightPrices(economyParams);

        let expectedMultiplier = 1.0;
        if (testCase.params.travelClass === 'business') {
          expectedMultiplier = 2.5;
        } else if (testCase.params.travelClass === 'first') {
          expectedMultiplier = 4.0;
        }

        const expectedPrice = Math.round(
          economyResult.recommendedPeriod.price * expectedMultiplier
        );
        if (result.recommendedPeriod.price !== expectedPrice) {
          errors.push(
            `${testCase.name}: ${testCase.params.travelClass} price ` +
              `(${result.recommendedPeriod.price}) does not match ` +
              `${expectedMultiplier}x economy price (${expectedPrice})`
          );
        }
      }

      // 6. Check Passenger Count Multiplier
      if (testCase.expectedChecks?.passengerCountMultiplier) {
        const singlePassengerParams = {
          ...testCase.params,
          passengerCount: 1,
        };
        const singlePassengerResult = await service.analyzeFlightPrices(
          singlePassengerParams
        );

        const expectedPrice =
          singlePassengerResult.recommendedPeriod.price *
          testCase.params.passengerCount;
        if (result.recommendedPeriod.price !== expectedPrice) {
          errors.push(
            `${testCase.name}: ${testCase.params.passengerCount} passengers price ` +
              `(${result.recommendedPeriod.price}) does not match ` +
              `${testCase.params.passengerCount}x single passenger price (${expectedPrice})`
          );
        }
      }

      // 7. Check Savings >= 0
      if (result.recommendedPeriod.savings < 0) {
        warnings.push(
          `${testCase.name}: savings is negative (${result.recommendedPeriod.savings})`
        );
      }

      console.log(`  ✅ ${testCase.name} passed`);
    } catch (error: any) {
      errors.push(`${testCase.name}: ${error.message || error}`);
      console.log(`  ❌ ${testCase.name} failed: ${error.message}`);
    }
  }

  console.log('\n📊 Validation Summary:');
  console.log(`  Total test cases: ${testCases.length}`);
  console.log(`  Errors: ${errors.length}`);
  console.log(`  Warnings: ${warnings.length}\n`);

  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach((warning) => console.log(`  - ${warning}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.error('❌ Price consistency validation failed:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('✅ All price consistency checks passed!');
    process.exit(0);
  }
}

// Run validation
validatePriceConsistency().catch((error) => {
  console.error('❌ Validation script failed:', error);
  process.exit(1);
});

