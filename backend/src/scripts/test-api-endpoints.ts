/**
 * API Endpoints Testing Script
 * Tests all API endpoints to identify which ones are working and which are failing
 */

import dotenv from 'dotenv';
import { serverConfig } from '../config/server';

dotenv.config();

interface TestResult {
  endpoint: string;
  method: string;
  status: 'success' | 'error' | 'skipped';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  message?: string;
}

const BASE_URL = `http://localhost:${serverConfig.port}/api`;

// Test data
const testOrigin = 'bangkok';
const testDestination = 'chiang-mai';
const testDate = new Date();
testDate.setDate(testDate.getDate() + 30);
const testDateStr = testDate.toISOString().split('T')[0];

const testEndDate = new Date(testDate);
testEndDate.setDate(testEndDate.getDate() + 7);
const testEndDateStr = testEndDate.toISOString().split('T')[0];

async function testEndpoint(
  endpoint: string,
  method: 'GET' | 'POST',
  body?: any
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${endpoint}`;

  try {
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method === 'POST') {
      options.body = JSON.stringify(body);
    }

    // Add query params for GET requests
    let fullUrl = url;
    if (body && method === 'GET') {
      const params = new URLSearchParams();
      Object.keys(body).forEach((key) => {
        if (body[key] !== undefined && body[key] !== null) {
          params.append(key, String(body[key]));
        }
      });
      if (params.toString()) {
        fullUrl = `${url}?${params.toString()}`;
      }
    }

    const response = await fetch(fullUrl, options);
    const responseTime = Date.now() - startTime;
    const data = await response.json().catch(() => ({}));

    return {
      endpoint,
      method,
      status: response.ok ? 'success' : 'error',
      statusCode: response.status,
      responseTime,
      message: data.error || data.message || (response.ok ? 'OK' : 'Error'),
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint,
      method,
      status: 'error',
      responseTime,
      error: error.message || 'Request failed',
    };
  }
}

async function runTests(): Promise<void> {
  console.log('\n🧪 Starting API Endpoints Testing...\n');
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  const results: TestResult[] = [];

  // Health endpoints
  console.log('📊 Testing Health Endpoints...');
  results.push(await testEndpoint('/health', 'GET'));
  results.push(await testEndpoint('/health/detailed', 'GET'));
  results.push(await testEndpoint('/health/database', 'GET'));
  results.push(await testEndpoint('/health/environment', 'GET'));
  results.push(await testEndpoint('/health/endpoints', 'GET'));

  // Flight endpoints
  console.log('\n✈️  Testing Flight Endpoints...');
  results.push(
    await testEndpoint('/flights/analyze', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      durationRange: { min: 5, max: 7 },
      selectedAirlines: [],
      startDate: testDateStr,
      endDate: testEndDateStr,
      tripType: 'round-trip',
      passengerCount: 1,
    })
  );

  results.push(
    await testEndpoint('/flights/prices', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      startDate: testDateStr,
      endDate: testEndDateStr,
      tripType: 'round-trip',
      passengerCount: 1,
      selectedAirlines: [],
    })
  );

  results.push(
    await testEndpoint('/flights/airlines', 'GET', {
      origin: testOrigin,
      destination: testDestination,
    })
  );

  results.push(
    await testEndpoint('/flights/airport-code', 'GET', {
      province: testOrigin,
    })
  );

  results.push(
    await testEndpoint('/flights/predict-price', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      targetDate: testDateStr,
      tripType: 'round-trip',
    })
  );

  results.push(
    await testEndpoint('/flights/price-trend', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      tripType: 'round-trip',
    })
  );

  results.push(
    await testEndpoint('/flights/predict-price-range', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      startDate: testDateStr,
      endDate: testEndDateStr,
      tripType: 'round-trip',
    })
  );

  results.push(
    await testEndpoint('/flights/cheapest-dates', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      startDate: testDateStr,
      endDate: testEndDateStr,
      tripType: 'round-trip',
    })
  );

  results.push(
    await testEndpoint('/flights/price-analysis', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      departureDate: testDateStr,
    })
  );

  // Airport endpoints
  console.log('\n🛫 Testing Airport Endpoints...');
  results.push(
    await testEndpoint('/airports/search', 'GET', {
      keyword: 'bangkok',
      subType: 'AIRPORT',
    })
  );

  results.push(await testEndpoint('/airports/BKK', 'GET'));

  // Airline endpoints
  console.log('\n✈️  Testing Airline Endpoints...');
  results.push(await testEndpoint('/airlines', 'GET'));
  results.push(await testEndpoint('/airlines/TG', 'GET'));

  // Destination endpoints
  console.log('\n🌍 Testing Destination Endpoints...');
  results.push(
    await testEndpoint('/destinations/most-booked', 'GET', {
      origin: testOrigin,
    })
  );

  results.push(
    await testEndpoint('/destinations/most-traveled', 'GET', {
      origin: testOrigin,
    })
  );

  results.push(
    await testEndpoint('/destinations/inspiration', 'GET', {
      origin: testOrigin,
      maxPrice: 5000,
      currency: 'THB',
    })
  );

  // Statistics endpoints
  console.log('\n📈 Testing Statistics Endpoints...');
  results.push(
    await testEndpoint('/statistics/search', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      durationRange: '5-7',
      tripType: 'round-trip',
    })
  );

  results.push(
    await testEndpoint('/statistics/price', 'POST', {
      origin: testOrigin,
      destination: testDestination,
      recommendedPrice: 3000,
      season: 'normal',
    })
  );

  results.push(await testEndpoint('/statistics', 'GET'));
  results.push(
    await testEndpoint('/statistics/price', 'GET', {
      origin: testOrigin,
      destination: testDestination,
    })
  );

  // Print results
  console.log('\n' + '='.repeat(80));
  console.log('📋 TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const successful = results.filter((r) => r.status === 'success');
  const failed = results.filter((r) => r.status === 'error');

  console.log(`✅ Successful: ${successful.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`📊 Total: ${results.length}\n`);

  if (failed.length > 0) {
    console.log('❌ FAILED ENDPOINTS:\n');
    failed.forEach((result) => {
      console.log(`  ${result.method} ${result.endpoint}`);
      console.log(`    Status: ${result.statusCode || 'N/A'}`);
      console.log(`    Error: ${result.error || result.message || 'Unknown error'}`);
      if (result.responseTime) {
        console.log(`    Response Time: ${result.responseTime}ms`);
      }
      console.log('');
    });
  }

  if (successful.length > 0) {
    console.log('✅ SUCCESSFUL ENDPOINTS:\n');
    successful.forEach((result) => {
      console.log(
        `  ${result.method} ${result.endpoint} - ${result.statusCode} (${result.responseTime}ms)`
      );
    });
  }

  // Save results to JSON file
  const fs = await import('fs');
  const path = await import('path');
  const outputPath = path.join(process.cwd(), 'api-test-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          successful: successful.length,
          failed: failed.length,
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n💾 Results saved to: ${outputPath}\n`);

  // Exit with error code if any tests failed
  process.exit(failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});

