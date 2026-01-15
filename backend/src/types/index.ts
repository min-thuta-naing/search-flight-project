// API request and response types (matching frontend types)

export interface FlightPriceParams {
  origin: string;
  destination: string;
  startDate: string;
  endDate?: string;
  tripType: 'one-way' | 'round-trip';
  passengerCount: number;
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  selectedAirlines: string[];
  travelClass?: 'economy' | 'business' | 'first';
}

export interface FlightPrice {
  airline: string;
  price: number;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  flightNumber: string;
}

export interface AnalyzeFlightPricesRequest {
  origin: string;
  destination: string;
  durationRange: { min: number; max: number };
  selectedAirlines: string[];
  startDate?: string;
  endDate?: string;
  tripType?: 'one-way' | 'round-trip' | null;
  passengerCount: number;
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  travelClass?: 'economy' | 'business' | 'first';
}

export interface SeasonData {
  type: 'high' | 'normal' | 'low';
  months: string[];
  priceRange: { min: number; max: number };
  bestDeal: {
    dates: string;
    price: number;
    airline: string;
  };
  description: string;
}

export interface PriceComparison {
  basePrice?: number;  // ✅ ราคาของวันที่เลือกจริงๆ (ใช้เปรียบเทียบกับ before/after)
  baseAirline?: string;  // ✅ ชื่อสายการบินของราคาปัจจุบัน
  ifGoBefore: {
    date: string;
    price: number;
    difference: number;
    percentage: number;
  };
  ifGoAfter: {
    date: string;
    price: number;
    difference: number;
    percentage: number;
  };
}

export interface FlightAnalysisResult {
  recommendedPeriod: {
    startDate: string;
    endDate: string;
    returnDate: string;
    price: number;
    airline: string;
    season: 'high' | 'normal' | 'low';
    savings: number;
  };
  seasons: SeasonData[];
  priceComparison: PriceComparison;
  priceChartData: Array<{
    startDate: string;
    returnDate: string;
    price: number;
    season: 'high' | 'normal' | 'low';
    duration?: number;
  }>;
  pricePrediction?: PredictPriceResponse;
  priceTrend?: PriceTrendResponse;
  flightPrices?: Array<{  // ✅ เพิ่ม flightPrices เพื่อให้ AirlineFlights ใช้ข้อมูลเดียวกัน
    id: number;
    airline_id: number;
    airline_code: string;
    airline_name: string;
    airline_name_th: string;
    departure_date: Date | string;
    return_date: Date | string | null;
    price: number;
    base_price: number;
    departure_time: string;
    arrival_time: string;
    duration: number;
    flight_number: string;
    trip_type: 'one-way' | 'round-trip';
    season: 'high' | 'normal' | 'low';
  }>;
  // ✅ XGBoost 100-day price prediction graph data
  priceGraphData?: Array<{
    date: string;
    low: number;
    typical: number;
    high: number;
    isActual: boolean;
  }>;
}

export interface AnalyzeFlightPricesResponse extends FlightAnalysisResult { }

// Price Prediction Types
export interface PredictPriceRequest {
  origin: string;
  destination: string;
  targetDate: string;
  tripType?: 'one-way' | 'round-trip';
  daysOfHistory?: number;
}

export interface PredictPriceResponse {
  predictedPrice: number;
  confidence: 'high' | 'medium' | 'low';
  rSquared: number;
  minPrice: number;
  maxPrice: number;
}

export interface PriceTrendRequest {
  origin: string;
  destination: string;
  tripType?: 'one-way' | 'round-trip';
  daysAhead?: number;
}

export interface PriceTrendResponse {
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
  currentAvgPrice: number;
  futureAvgPrice: number;
}

export interface PredictPriceRangeRequest {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType?: 'one-way' | 'round-trip';
}

export interface PriceForecastItem {
  date: string;
  predictedPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface PredictPriceRangeResponse {
  forecast: PriceForecastItem[];
}

export interface CheapestDatesRequest {
  origin: string;
  destination: string;
  startDate: string;
  endDate: string;
  tripType?: 'one-way' | 'round-trip';
}

export interface PriceAnalysisRequest {
  origin: string;
  destination: string;
  departureDate: string;
}


