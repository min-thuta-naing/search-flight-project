# คู่มือการปรับปรุงโครงสร้างเพื่อรองรับ API Integration

## 📋 สรุปโครงสร้างปัจจุบัน

### ✅ **จุดแข็ง:**
1. **แยก Services ชัดเจน** - มี `services/` folder สำหรับ mock data และ configuration
2. **แยก Business Logic** - มี `lib/flight-analysis.ts` สำหรับ logic การคำนวณ
3. **Component Structure ดี** - Components แยกตามหน้าที่ชัดเจน

### ⚠️ **จุดที่ควรปรับปรุง:**
1. ✅ **Business Logic + Data Fetching รวมกัน** - ~~`analyzeFlightPrices` มีทั้ง logic และ mock data generation~~ → **แก้ไขแล้ว: สร้าง Service Layer แล้ว แต่ยังต้องแยก business logic**
2. ✅ **ไม่มี API Client Layer** - ~~ไม่มีการแยก API calls ออกมา~~ → **แก้ไขแล้ว: สร้าง `lib/api/` แล้ว**
3. ✅ **ไม่มี Data Source Abstraction** - ~~ไม่สามารถสลับระหว่าง mock และ real API ได้ง่าย~~ → **แก้ไขแล้ว: สร้าง `lib/services/data-source.ts` แล้ว**
4. ✅ **Components เรียกใช้ Function โดยตรง** - ~~ไม่มี data fetching layer~~ → **แก้ไขแล้ว: `price-analysis.tsx` ใช้ `flightService` แล้ว**

---

## 🎯 แนวทางปรับปรุงโครงสร้าง

### 1. สร้าง API Client Layer

```
lib/
  api/
    client.ts          # Base API client
    flight-api.ts     # Flight-specific API calls
    types.ts          # API response types
```

### 2. สร้าง Service Layer ที่รองรับทั้ง Mock และ Real API

```
services/
  flight-service.ts   # Service layer ที่สลับได้ระหว่าง mock และ real API
  mock/
    flight-mock.ts    # ย้าย mock logic มาที่นี่
  real/
    flight-api.ts     # Real API implementation
```

### 3. แยก Business Logic ออกจาก Data Fetching

```
lib/
  flight-analysis.ts  # Business logic เท่านั้น (ไม่มีการ fetch data)
  flight-service.ts   # Data fetching และ transformation
```

---

## 📁 โครงสร้างที่แนะนำ

```
project/
├── lib/
│   ├── api/
│   │   ├── client.ts              # Base API client (axios/fetch wrapper)
│   │   ├── flight-api.ts          # Flight API endpoints
│   │   └── types.ts               # API request/response types
│   ├── services/
│   │   ├── flight-service.ts      # Service layer (abstraction)
│   │   └── data-source.ts         # Data source factory (mock vs real)
│   └── flight-analysis.ts         # Business logic only
│
├── services/
│   ├── mock/
│   │   ├── flight-mock.ts         # Mock data generator
│   │   └── flight-mock-data.ts    # Mock data constants
│   ├── real/
│   │   └── flight-api-adapter.ts  # Real API adapter
│   └── [existing files...]        # Configuration files
│
└── components/
    └── [existing components...]    # No changes needed
```

---

## 🔧 Implementation Steps

### Step 1: สร้าง API Client

**`lib/api/client.ts`**
```typescript
// Base API client with error handling
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    // Implementation
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    // Implementation
  }
}

export const apiClient = new ApiClient(process.env.NEXT_PUBLIC_API_URL || '')
```

### Step 2: สร้าง Data Source Abstraction

**`lib/services/data-source.ts`**
```typescript
// Data source interface
interface FlightDataSource {
  analyzeFlightPrices(params: FlightSearchParams): Promise<FlightAnalysisResult>
  getFlightPrices(params: FlightPriceParams): Promise<FlightPrice[]>
  // ... other methods
}

// Mock implementation
class MockFlightDataSource implements FlightDataSource {
  async analyzeFlightPrices(params: FlightSearchParams) {
    // Use existing mock logic
    return analyzeFlightPrices(...)
  }
}

// Real API implementation
class RealFlightDataSource implements FlightDataSource {
  async analyzeFlightPrices(params: FlightSearchParams) {
    // Call real API
    return await apiClient.post('/flights/analyze', params)
  }
}

// Factory function
export function getFlightDataSource(): FlightDataSource {
  const useMock = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  return useMock 
    ? new MockFlightDataSource() 
    : new RealFlightDataSource()
}
```

### Step 3: สร้าง Service Layer

**`lib/services/flight-service.ts`**
```typescript
import { getFlightDataSource } from './data-source'
import { FlightSearchParams, FlightAnalysisResult } from '@/lib/flight-analysis'

export class FlightService {
  private dataSource = getFlightDataSource()

  async analyzePrices(params: FlightSearchParams): Promise<FlightAnalysisResult> {
    // Add any business logic here (validation, transformation, etc.)
    return await this.dataSource.analyzeFlightPrices(params)
  }

  // Add caching, error handling, etc.
}
```

### Step 4: แยก Business Logic

**`lib/flight-analysis.ts`** (ปรับปรุง)
```typescript
// Keep only business logic, remove data fetching
export function calculatePriceComparison(
  recommendedPrice: number,
  beforePrice: number,
  afterPrice: number
): PriceComparison {
  // Business logic only
}

export function calculateSavings(
  highSeasonPrice: number,
  recommendedPrice: number
): number {
  // Business logic only
}
```

### Step 5: อัปเดต Components

**`components/price-analysis.tsx`** (ปรับปรุง)
```typescript
import { FlightService } from '@/lib/services/flight-service'

export function PriceAnalysis({ searchParams }: PriceAnalysisProps) {
  const [analysis, setAnalysis] = useState<FlightAnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const flightService = new FlightService()

  useEffect(() => {
    if (searchParams) {
      setLoading(true)
      flightService.analyzePrices(searchParams)
        .then(setAnalysis)
        .catch(console.error)
        .finally(() => setLoading(false))
    }
  }, [searchParams])
  
  // ... rest of component
}
```

---

## 🔄 Migration Strategy

### Phase 1: Setup Infrastructure (ไม่กระทบโค้ดเดิม) ✅ **เสร็จแล้ว**
1. ✅ สร้าง API client layer - **เสร็จแล้ว**
2. ✅ สร้าง data source abstraction - **เสร็จแล้ว**
3. ✅ สร้าง service layer - **เสร็จแล้ว**
4. ✅ **ยังใช้ mock data อยู่** - **ทำงานได้**

### Phase 2: Refactor (ค่อยๆ ย้าย) ✅ **เสร็จแล้ว**
1. ✅ ย้าย mock logic ไปที่ `services/mock/` - **เสร็จแล้ว (services/mock/flight-mock.ts)**
2. ✅ แยก business logic ออกจาก data fetching - **เสร็จแล้ว (lib/flight-utils.ts)**
3. ✅ อัปเดต components ให้ใช้ service layer - **เสร็จแล้ว (price-analysis.tsx)**
4. ✅ **ยังใช้ mock data อยู่** - **ทำงานได้**

### Phase 3: API Integration ✅ **พร้อมแล้ว**
1. ✅ สร้าง real API implementation - **เสร็จแล้ว (RealFlightDataSource)**
2. ⏳ เพิ่ม environment variable สำหรับสลับ - **ต้องเพิ่มใน .env.local**
3. ⏳ ทดสอบทั้ง mock และ real API - **ต้องทดสอบเมื่อมี backend**
4. ⏳ **พร้อมใช้งานจริง** - **รอ backend**

---

## 🎛️ Environment Variables

**`.env.local`**
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_USE_MOCK_DATA=true  # Set to false for real API

# Feature Flags
NEXT_PUBLIC_ENABLE_CACHING=true
NEXT_PUBLIC_CACHE_TTL=300000  # 5 minutes
```

---

## ✅ ข้อดีของโครงสร้างใหม่

### 1. **Separation of Concerns**
- Business logic แยกจาก data fetching
- API calls แยกจาก components
- Mock และ real API ใช้ interface เดียวกัน

### 2. **Easy Testing**
- Mock data สำหรับ development
- Real API สำหรับ production
- สลับได้ด้วย environment variable

### 3. **Maintainability**
- แก้ไข API endpoint ได้ที่เดียว
- เพิ่ม error handling, caching ได้ง่าย
- Components ไม่ต้องรู้ว่าใช้ mock หรือ real API

### 4. **Scalability**
- เพิ่ม API endpoints ใหม่ได้ง่าย
- รองรับ multiple data sources
- เพิ่ม features (caching, retry, etc.) ได้ง่าย

---

## 📝 Checklist สำหรับการ Migration

### Infrastructure
- [x] ✅ สร้าง `lib/api/client.ts` - **เสร็จแล้ว**
- [x] ✅ สร้าง `lib/api/flight-api.ts` - **เสร็จแล้ว**
- [x] ✅ สร้าง `lib/api/types.ts` - **เสร็จแล้ว**
- [x] ✅ สร้าง `lib/services/data-source.ts` - **เสร็จแล้ว**
- [x] ✅ สร้าง `lib/services/flight-service.ts` - **เสร็จแล้ว**

### Refactoring
- [x] ✅ ย้าย mock logic ไป `services/mock/` - **เสร็จแล้ว (services/mock/flight-mock.ts)**
- [x] ✅ แยก business logic ออกจาก data fetching - **เสร็จแล้ว (lib/flight-utils.ts)**
- [x] ✅ อัปเดต components ให้ใช้ service layer - **เสร็จแล้ว (price-analysis.tsx)**
- [x] ✅ ทดสอบว่า mock data ยังทำงานได้ - **เสร็จแล้ว (ไม่มี linter errors)**

### API Integration
- [x] ✅ สร้าง real API implementation - **เสร็จแล้ว (RealFlightDataSource)**
- [ ] เพิ่ม environment variables - **ต้องเพิ่มใน .env.local**
- [ ] ทดสอบ real API - **ต้องทดสอบเมื่อมี backend**
- [x] ✅ เพิ่ม error handling - **เสร็จแล้ว (ใน client.ts และ service.ts)**
- [ ] เพิ่ม loading states - **ยังไม่ทำ (components ยังไม่มี loading state)**

### Documentation
- [ ] อัปเดต README - **ยังไม่ทำ**
- [x] ✅ สร้าง API documentation - **เสร็จแล้ว (ไฟล์นี้)**
- [x] ✅ สร้าง migration guide - **เสร็จแล้ว (ไฟล์นี้)**

---

## 🚀 Quick Start Example

### 1. สร้าง API Client
```typescript
// lib/api/client.ts
export const apiClient = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${endpoint}`)
    if (!response.ok) throw new Error('API Error')
    return response.json()
  }
}
```

### 2. สร้าง Data Source
```typescript
// lib/services/data-source.ts
export function getFlightDataSource() {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
    ? new MockFlightDataSource()
    : new RealFlightDataSource()
}
```

### 3. ใช้ใน Component
```typescript
// components/price-analysis.tsx
const flightService = new FlightService()
const result = await flightService.analyzePrices(searchParams)
```

---

## 💡 Best Practices

1. **Keep Mock Data** - เก็บ mock data ไว้สำหรับ development และ testing
2. **Use Environment Variables** - ใช้ env vars สำหรับ configuration
3. **Error Handling** - เพิ่ม error handling ในทุก API calls
4. **Type Safety** - ใช้ TypeScript types สำหรับ API responses
5. **Loading States** - เพิ่ม loading states ใน components
6. **Caching** - พิจารณาเพิ่ม caching สำหรับ API responses

---

## 📚 Resources

- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [React Query](https://tanstack.com/query/latest) - สำหรับ data fetching และ caching
- [SWR](https://swr.vercel.app/) - Alternative สำหรับ data fetching

