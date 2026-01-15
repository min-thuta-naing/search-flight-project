# Price Consistency Test Checklist

คู่มือการทดสอบความสอดคล้องของราคาในระบบ Flight Search

## 1. Recommended Period vs Best Deal

### ✅ ตรวจสอบความสอดคล้อง
- [ ] `recommendedPeriod.price` = `bestDeal.price` (เมื่อใช้ bestDeal)
- [ ] `recommendedPeriod.season` = `bestDeal.season`
- [ ] `recommendedPeriod.airline` = `bestDeal.airline`
- [ ] `recommendedPeriod.startDate` สอดคล้องกับ `bestDeal.dates`

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` โดยไม่ระบุ `startDate`
2. ตรวจสอบว่า `recommendedPeriod.price` เท่ากับราคาต่ำสุดใน `seasons[].bestDeal.price`
3. ตรวจสอบว่า `recommendedPeriod.season` ตรงกับ season ของ bestDeal

---

## 2. Price Comparison

### ✅ ตรวจสอบความสอดคล้อง
- [ ] `basePrice` สอดคล้องกับ `recommendedPeriod.price` (เมื่อไม่มี date ที่เลือก)
- [ ] `ifGoBefore.difference` = `ifGoBefore.price - basePrice`
- [ ] `ifGoAfter.difference` = `ifGoAfter.price - basePrice`
- [ ] `ifGoBefore.percentage` = `(ifGoBefore.difference / basePrice) * 100`
- [ ] `ifGoAfter.percentage` = `(ifGoAfter.difference / basePrice) * 100`

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` โดยระบุ `startDate`
2. ตรวจสอบว่า `priceComparison.basePrice` มีค่าและสอดคล้องกับราคาของวันที่เลือก
3. ตรวจสอบว่าความแตกต่างและเปอร์เซ็นต์คำนวณถูกต้อง

---

## 3. One-way vs Round-trip

### ✅ ตรวจสอบความสอดคล้อง
- [ ] one-way price = round-trip price * 0.5 (สำหรับวันเดียวกัน)
- [ ] `priceComparison` สำหรับ one-way ถูกต้อง
- [ ] `savings` สำหรับ one-way ถูกต้อง

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` ด้วย `tripType: 'round-trip'` และ `startDate: '2025-06-15'`
2. เรียก API `/api/flights/analyze` ด้วย `tripType: 'one-way'` และ `startDate: '2025-06-15'`
3. ตรวจสอบว่า one-way price = round-trip price * 0.5

---

## 4. Travel Class

### ✅ ตรวจสอบความสอดคล้อง
- [ ] business price = economy price * 2.5
- [ ] first price = economy price * 4.0
- [ ] multiplier ถูกใช้ในทุกที่ที่เกี่ยวข้อง:
  - `recommendedPeriod.price`
  - `seasons[].bestDeal.price`
  - `seasons[].priceRange.min/max`
  - `priceComparison`
  - `flightPrices[]`

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` ด้วย `travelClass: 'economy'`
2. เรียก API `/api/flights/analyze` ด้วย `travelClass: 'business'`
3. เรียก API `/api/flights/analyze` ด้วย `travelClass: 'first'`
4. ตรวจสอบว่า business price = economy price * 2.5
5. ตรวจสอบว่า first price = economy price * 4.0

---

## 5. Passenger Count

### ✅ ตรวจสอบความสอดคล้อง
- [ ] 2 passengers = 1 passenger * 2
- [ ] 3 passengers = 1 passenger * 3
- [ ] multiplier ถูกใช้ในทุกที่ที่เกี่ยวข้อง

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` ด้วย `passengerCount: 1`
2. เรียก API `/api/flights/analyze` ด้วย `passengerCount: 2`
3. ตรวจสอบว่า 2 passengers price = 1 passenger price * 2

---

## 6. Airline Filter

### ✅ ตรวจสอบความสอดคล้อง
- [ ] เมื่อ filter airline แล้ว `recommendedPeriod.price` เปลี่ยนตาม
- [ ] `priceComparison` ใช้ airline set เดียวกันกับ `recommendedPeriod`
- [ ] `seasons[].bestDeal` ใช้ airline set เดียวกัน

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` โดยไม่ระบุ `selectedAirlines` (all airlines)
2. เรียก API `/api/flights/analyze` โดยระบุ `selectedAirlines: ['TG']` (filtered)
3. ตรวจสอบว่าราคาเปลี่ยนตาม airline filter

---

## 7. Season Consistency

### ✅ ตรวจสอบความสอดคล้อง
- [ ] `bestDeal.price` อยู่ในช่วง `priceRange.min - priceRange.max`
- [ ] `recommendedPeriod.season` ตรงกับ season ของ bestDeal
- [ ] `priceChartData[].season` ตรงกับ season ของราคานั้นๆ

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze`
2. ตรวจสอบว่า `seasons[].bestDeal.price` อยู่ในช่วง `seasons[].priceRange`
3. ตรวจสอบว่า `recommendedPeriod.season` ตรงกับ season ของ bestDeal

---

## 8. Savings Calculation

### ✅ ตรวจสอบความสอดคล้อง
- [ ] `savings` = `highSeasonPrice - bestDealPrice` (เมื่อเลือก high season)
- [ ] `savings >= 0` เสมอ
- [ ] `savings` คำนวณถูกต้องสำหรับทุก travel class และ passenger count

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/analyze` โดยเลือกวันที่ใน high season (`startDate: '2025-12-25'`)
2. ตรวจสอบว่า `savings >= 0`
3. ตรวจสอบว่า `savings` สอดคล้องกับความแตกต่างระหว่าง high season price และ bestDeal price

---

## 9. Cross-Endpoint Consistency

### ✅ ตรวจสอบความสอดคล้อง
- [ ] `/api/flights/prices` สอดคล้องกับ `/api/flights/analyze`
- [ ] `/api/flights/cheapest-dates` สอดคล้องกับ bestDeal

### 📝 วิธีทดสอบ
1. เรียก API `/api/flights/prices` ด้วย parameters เดียวกัน
2. เรียก API `/api/flights/analyze` ด้วย parameters เดียวกัน
3. ตรวจสอบว่าราคาใน `flightPrices` สอดคล้องกับ `recommendedPeriod.price`

---

## 10. Edge Cases

### ✅ ตรวจสอบ Edge Cases
- [ ] ไม่มีข้อมูล flight → ควร return error หรือ empty result
- [ ] วันที่ไม่มี flight → `priceComparison` ควรจัดการได้ถูกต้อง
- [ ] `passengerCount: 0` → ควร return error
- [ ] `durationRange` ไม่ถูกต้อง → ควร return error

### 📝 วิธีทดสอบ
1. ทดสอบด้วย parameters ที่ไม่มีข้อมูล
2. ทดสอบด้วย parameters ที่ไม่ถูกต้อง
3. ตรวจสอบว่า error handling ทำงานถูกต้อง

---

## การรัน Tests

### Unit Tests
```bash
npm run test:price-consistency
```

### Integration Tests
```bash
npm run test:integration:price-consistency
```

### Validation Script
```bash
npm run validate:prices
```

---

## Notes

- ทุกการทดสอบควรใช้ข้อมูลจริงจาก database
- ควรทดสอบกับหลาย routes (Bangkok → Chiang Mai, Bangkok → Phuket, etc.)
- ควรทดสอบกับหลายช่วงเวลา (low season, normal season, high season)
- ควรทดสอบกับหลาย airlines

