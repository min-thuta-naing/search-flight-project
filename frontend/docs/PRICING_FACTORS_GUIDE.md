# คู่มือการใช้งาน Pricing Factors

## ภาพรวม

ไฟล์ `services/pricing-factors.ts` ประกอบด้วยปัจจัย 3 อย่างที่ส่งผลต่อราคาตั๋วเครื่องบิน:

1. **เทศกาลและวันหยุด** (Holidays)
2. **วันในสัปดาห์** (Day of Week)
3. **การจองล่วงหน้า** (Advance Booking)

---

## 1. เทศกาลและวันหยุดในไทย

### เทศกาลใหญ่ (Major Holidays) - ราคาเพิ่มมาก

| เทศกาล | วันที่ | Multiplier | เพิ่มราคา |
|--------|-------|------------|----------|
| **สงกรานต์** | 13-15 เมษายน | 1.6 | +60% |
| **ปีใหม่** | 31 ธ.ค. - 2 ม.ค. | 1.5 | +50% |
| **วันหยุดยาวปีใหม่** | 30 ธ.ค., 3 ม.ค. | 1.3 | +30% |

### เทศกาลกลาง (Medium Holidays) - ราคาเพิ่มปานกลาง

| เทศกาล | วันที่ | Multiplier | เพิ่มราคา |
|--------|-------|------------|----------|
| **วันหยุดยาวสงกรานต์** | 12, 16 เมษายน | 1.3 | +30% |
| **วันแรงงาน** | 1-2 พฤษภาคม | 1.2 | +20% |
| **วันแม่** | 12 สิงหาคม | 1.15 | +15% |
| **วันพ่อ** | 5 ธันวาคม | 1.15 | +15% |
| **วันเฉลิมพระชนมพรรษา** | 28 กรกฎาคม | 1.15 | +15% |
| **วันรัฐธรรมนูญ** | 10 ธันวาคม | 1.15 | +15% |

### เทศกาลเล็ก (Minor Holidays) - ราคาเพิ่มน้อย

| เทศกาล | วันที่ | Multiplier | เพิ่มราคา |
|--------|-------|------------|----------|
| **วันวาเลนไทน์** | 14 กุมภาพันธ์ | 1.1 | +10% |
| **วันลอยกระทง** | ~15 พฤศจิกายน | 1.1 | +10% |

### ตัวอย่างการใช้งาน

```typescript
import { isHoliday, getHolidayMultiplier } from '@/services/mock/pricing-factors'

const date = new Date('2025-04-13') // วันที่ 13 เมษายน (สงกรานต์)

// ตรวจสอบว่าวันที่ตรงกับวันหยุดหรือไม่
const { isHoliday, holiday } = isHoliday(date)
console.log(isHoliday) // true
console.log(holiday?.name) // "สงกรานต์"

// หา multiplier
const multiplier = getHolidayMultiplier(date)
console.log(multiplier) // 1.6 (เพิ่ม 60%)
```

---

## 2. วันในสัปดาห์

### ตารางราคาตามวันในสัปดาห์

| วัน | Multiplier | ราคา | เหตุผล |
|-----|------------|------|--------|
| **อังคาร** | 0.85 | ถูกที่สุด | วันธรรมดา - ราคาถูกที่สุด |
| **พุธ** | 0.85 | ถูกที่สุด | วันธรรมดา - ราคาถูกที่สุด |
| **จันทร์** | 0.9 | ถูก | วันธรรมดา - ความต้องการต่ำ |
| **พฤหัสบดี** | 0.9 | ถูก | วันธรรมดา - ความต้องการต่ำ |
| **ศุกร์** | 1.15 | แพง | วันสุดสัปดาห์ - คนเดินทางไปเที่ยว |
| **เสาร์** | 1.2 | แพง | วันสุดสัปดาห์ - คนเดินทางไปเที่ยว |
| **อาทิตย์** | 1.2 | แพง | วันสุดสัปดาห์ - คนเดินทางกลับบ้าน |

### ตัวอย่างการใช้งาน

```typescript
import { getDayOfWeekMultiplier, isWeekend } from '@/services/mock/pricing-factors'

const date = new Date('2025-04-12') // วันเสาร์

// ตรวจสอบว่าวันที่อยู่ในช่วงวันหยุดสุดสัปดาห์หรือไม่
const weekend = isWeekend(date)
console.log(weekend) // true

// หา multiplier
const multiplier = getDayOfWeekMultiplier(date)
console.log(multiplier) // 1.2 (เพิ่ม 20%)
```

---

## 3. การจองล่วงหน้า

### ตารางราคาตามการจองล่วงหน้า

| ระยะเวลา | Multiplier | ราคา | คำอธิบาย |
|----------|------------|------|----------|
| **3 เดือนขึ้นไป** | 0.85 | ถูกที่สุด | จองล่วงหน้านานมาก - ราคาถูกที่สุด |
| **2-3 เดือน** | 0.9 | ถูก | จองล่วงหน้านาน - ราคาถูก |
| **1-2 เดือน** | 0.95 | ถูกเล็กน้อย | จองล่วงหน้าปกติ - ราคาถูกลง 5% |
| **2 สัปดาห์ - 1 เดือน** | 1.0 | ปกติ | จองล่วงหน้าปกติ - ราคาปกติ |
| **1-2 สัปดาห์** | 1.2 | แพง | จองใกล้ - ราคาแพง |
| **3-7 วัน** | 1.4 | แพงมาก | จองใกล้มาก - ราคาแพงมาก |
| **0-3 วัน** | 1.6 | แพงที่สุด | จองใกล้วันเดินทางมาก - ราคาแพงที่สุด |

### ตัวอย่างการใช้งาน

```typescript
import { 
  getAdvanceBookingMultiplier, 
  getDaysInAdvance,
  getAdvanceBookingTier 
} from '@/services/mock/pricing-factors'

const bookingDate = new Date() // วันนี้
const travelDate = new Date('2025-06-15') // วันที่ 15 มิถุนายน

// คำนวณจำนวนวันล่วงหน้า
const daysInAdvance = getDaysInAdvance(bookingDate, travelDate)
console.log(daysInAdvance) // ประมาณ 60-90 วัน (ขึ้นอยู่กับวันปัจจุบัน)

// หา multiplier
const multiplier = getAdvanceBookingMultiplier(bookingDate, travelDate)
console.log(multiplier) // 0.9 (ลด 10% - จองล่วงหน้า 2-3 เดือน)

// หา tier
const tier = getAdvanceBookingTier(bookingDate, travelDate)
console.log(tier?.description) // "จองล่วงหน้า 2-3 เดือน - ราคาถูก"
```

---

## 4. รวมทุกปัจจัย

### ตัวอย่างการใช้งาน

```typescript
import { calculatePricingFactors } from '@/services/mock/pricing-factors'

const bookingDate = new Date() // วันนี้
const travelDate = new Date('2025-04-13') // วันที่ 13 เมษายน (สงกรานต์, อาทิตย์)

const factors = calculatePricingFactors(bookingDate, travelDate)

console.log(factors)
// {
//   holidayMultiplier: 1.6,        // สงกรานต์ (+60%)
//   dayOfWeekMultiplier: 1.2,     // อาทิตย์ (+20%)
//   advanceBookingMultiplier: 0.95, // จองล่วงหน้า 1 เดือน (-5%)
//   totalMultiplier: 1.824,       // 1.6 * 1.2 * 0.95 = +82.4%
//   factors: {
//     isHoliday: true,
//     holidayName: "สงกรานต์",
//     isWeekend: true,
//     dayName: "อาทิตย์",
//     daysInAdvance: 30,
//     advanceBookingTier: "จองล่วงหน้า 1-2 เดือน - ราคาปกติ"
//   }
// }

// คำนวณราคาสุดท้าย
const basePrice = 2000
const finalPrice = basePrice * factors.totalMultiplier
console.log(finalPrice) // 3648 บาท
```

---

## 5. การนำไปใช้ในโปรเจค

### ตัวอย่างการปรับปรุง `lib/flight-analysis.ts`

```typescript
import { calculatePricingFactors } from '@/services/mock/pricing-factors'

function calculateFinalPrice(
  basePrice: number,
  bookingDate: Date,
  travelDate: Date,
  seasonMultiplier: number
): number {
  // คำนวณปัจจัยทั้งหมด
  const factors = calculatePricingFactors(bookingDate, travelDate)
  
  // คำนวณราคาสุดท้าย
  // ราคา = basePrice × seasonMultiplier × factors.totalMultiplier
  const finalPrice = basePrice * seasonMultiplier * factors.totalMultiplier
  
  return Math.round(finalPrice)
}
```

---

## 6. สรุป

### ข้อดี
- ✅ พิจารณาปัจจัยที่สำคัญทั้งหมด
- ✅ ราคาสะท้อนความเป็นจริงมากขึ้น
- ✅ เหมือนกับเว็บไซต์ท่องเที่ยวชั้นนำ

### ข้อควรระวัง
- ⚠️ Multiplier อาจต้องปรับตามข้อมูลจริง
- ⚠️ เทศกาลบางเทศกาลอาจต้องอัปเดตทุกปี
- ⚠️ ควรทดสอบกับข้อมูลจริงก่อนใช้งาน

---

## 7. แหล่งอ้างอิง

- พฤติกรรมการท่องเที่ยวของคนไทย
- ข้อมูลจากเว็บไซต์ท่องเที่ยวชั้นนำ (Trip.com, Traveloka, Skyscanner)
- เทศกาลและวันหยุดราชการของไทย
- ข้อมูลการจองตั๋วเครื่องบินในประเทศไทย

