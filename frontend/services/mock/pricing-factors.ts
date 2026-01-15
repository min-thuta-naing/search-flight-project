/**
 * Pricing Factors for Flight Price Calculation
 * ปัจจัยที่ส่งผลต่อราคาตั๋วเครื่องบินในประเทศไทย
 * 
 * ⚠️ DEPRECATED - MOCK DATA ONLY
 * 
 * ⚠️ WARNING: This file contains business logic that should be in Backend.
 * This file is ONLY for development/testing when NEXT_PUBLIC_USE_MOCK_DATA=true
 * 
 * For production:
 * - All pricing calculations are handled by Backend API
 * - Backend API: POST /api/flights/analyze returns complete calculated data
 * - Backend has holiday/festival data from database and iApp API
 * - Backend has season calculation from real flight price data
 * 
 * ⚠️ DO NOT USE IN PRODUCTION - Use Backend API instead
 * 
 * อ้างอิงจาก:
 * - พฤติกรรมการท่องเที่ยวของคนไทย
 * - ข้อมูลจากเว็บไซต์ท่องเที่ยวชั้นนำ (Trip.com, Traveloka, Skyscanner)
 * - เทศกาลและวันหยุดราชการของไทย
 */

// ============================================
// 1. เทศกาลและวันหยุดสำคัญในไทย (MOCK DATA ONLY)
// ============================================

export interface Holiday {
  name: string
  nameEn: string
  dates: Array<{
    month: number // 0-11 (0 = มกราคม)
    day: number // 1-31
    year?: number // ถ้าไม่ระบุ = ทุกปี
  }>
  multiplier: number // ตัวคูณราคา (1.0 = ราคาปกติ, 1.5 = เพิ่ม 50%)
  type: 'major' | 'minor' | 'long-weekend' // major = เทศกาลใหญ่, minor = เทศกาลเล็ก, long-weekend = วันหยุดยาว
}

export const thaiHolidays: Holiday[] = [
  // เทศกาลใหญ่ (Major Holidays) - ราคาเพิ่มมาก
  {
    name: 'สงกรานต์',
    nameEn: 'Songkran Festival',
    dates: [
      { month: 3, day: 13 }, // 13 เมษายน
      { month: 3, day: 14 }, // 14 เมษายน
      { month: 3, day: 15 }, // 15 เมษายน
    ],
    multiplier: 1.6, // เพิ่ม 60% (เทศกาลใหญ่ที่สุดของไทย)
    type: 'major',
  },
  {
    name: 'ปีใหม่',
    nameEn: 'New Year',
    dates: [
      { month: 11, day: 31 }, // 31 ธันวาคม
      { month: 0, day: 1 }, // 1 มกราคม
      { month: 0, day: 2 }, // 2 มกราคม (วันหยุดชดเชย)
    ],
    multiplier: 1.5, // เพิ่ม 50%
    type: 'major',
  },
  {
    name: 'วันหยุดยาวปีใหม่',
    nameEn: 'New Year Long Weekend',
    dates: [
      { month: 11, day: 30 }, // 30 ธันวาคม (วันก่อนปีใหม่)
      { month: 0, day: 3 }, // 3 มกราคม (วันหลังปีใหม่)
    ],
    multiplier: 1.3, // เพิ่ม 30%
    type: 'long-weekend',
  },

  // เทศกาลกลาง (Medium Holidays) - ราคาเพิ่มปานกลาง
  {
    name: 'วันหยุดยาวสงกรานต์',
    nameEn: 'Songkran Long Weekend',
    dates: [
      { month: 3, day: 12 }, // 12 เมษายน (วันก่อนสงกรานต์)
      { month: 3, day: 16 }, // 16 เมษายน (วันหลังสงกรานต์)
    ],
    multiplier: 1.3, // เพิ่ม 30%
    type: 'long-weekend',
  },
  {
    name: 'วันหยุดยาววันแรงงาน',
    nameEn: 'Labor Day Long Weekend',
    dates: [
      { month: 4, day: 1 }, // 1 พฤษภาคม
      { month: 4, day: 2 }, // 2 พฤษภาคม (วันหยุดชดเชย)
    ],
    multiplier: 1.2, // เพิ่ม 20%
    type: 'minor',
  },
  {
    name: 'วันหยุดยาววันแม่',
    nameEn: 'Mother\'s Day Long Weekend',
    dates: [
      { month: 7, day: 12 }, // 12 สิงหาคม (วันแม่)
    ],
    multiplier: 1.15, // เพิ่ม 15%
    type: 'minor',
  },
  {
    name: 'วันหยุดยาววันพ่อ',
    nameEn: 'Father\'s Day Long Weekend',
    dates: [
      { month: 11, day: 5 }, // 5 ธันวาคม (วันพ่อ)
    ],
    multiplier: 1.15, // เพิ่ม 15%
    type: 'minor',
  },
  {
    name: 'วันหยุดยาววันเฉลิมพระชนมพรรษา',
    nameEn: 'King\'s Birthday Long Weekend',
    dates: [
      { month: 6, day: 28 }, // 28 กรกฎาคม
    ],
    multiplier: 1.15, // เพิ่ม 15%
    type: 'minor',
  },
  {
    name: 'วันหยุดยาววันรัฐธรรมนูญ',
    nameEn: 'Constitution Day Long Weekend',
    dates: [
      { month: 11, day: 10 }, // 10 ธันวาคม
    ],
    multiplier: 1.15, // เพิ่ม 15%
    type: 'minor',
  },

  // เทศกาลเล็ก (Minor Holidays) - ราคาเพิ่มน้อย
  {
    name: 'วันหยุดยาววันวาเลนไทน์',
    nameEn: 'Valentine\'s Day',
    dates: [
      { month: 1, day: 14 }, // 14 กุมภาพันธ์
    ],
    multiplier: 1.1, // เพิ่ม 10%
    type: 'minor',
  },
  {
    name: 'วันหยุดยาววันลอยกระทง',
    nameEn: 'Loy Krathong',
    dates: [
      { month: 10, day: 15 }, // ประมาณ 15 พฤศจิกายน (ขึ้นอยู่กับปฏิทินจันทรคติ)
    ],
    multiplier: 1.1, // เพิ่ม 10%
    type: 'minor',
  },
]

/**
 * ตรวจสอบว่าวันที่ตรงกับวันหยุดหรือไม่
 * 
 * @deprecated ใช้ Backend API แทน: GET /api/holidays-festivals/activities?date=YYYY-MM-DD
 * ฟังก์ชันนี้ใช้ได้เฉพาะใน Mock Data Source เท่านั้น
 */
export function isHoliday(date: Date): { isHoliday: boolean; holiday?: Holiday } {
  const month = date.getMonth()
  const day = date.getDate()
  const year = date.getFullYear()

  for (const holiday of thaiHolidays) {
    for (const holidayDate of holiday.dates) {
      if (
        holidayDate.month === month &&
        holidayDate.day === day &&
        (holidayDate.year === undefined || holidayDate.year === year)
      ) {
        return { isHoliday: true, holiday }
      }
    }
  }

  return { isHoliday: false }
}

/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงวันหยุดยาวหรือไม่ (3 วันติดกัน)
 * 
 * @deprecated ใช้ Backend API แทน: GET /api/holidays-festivals/activities?date=YYYY-MM-DD
 * ฟังก์ชันนี้ใช้ได้เฉพาะใน Mock Data Source เท่านั้น
 */
export function isLongWeekend(date: Date): boolean {
  const dayBefore = new Date(date)
  dayBefore.setDate(dayBefore.getDate() - 1)
  
  const dayAfter = new Date(date)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const isHolidayBefore = isHoliday(dayBefore).isHoliday
  const isHolidayAfter = isHoliday(dayAfter).isHoliday
  const isHolidayToday = isHoliday(date).isHoliday
  const isWeekendBefore = dayBefore.getDay() === 0 || dayBefore.getDay() === 6
  const isWeekendAfter = dayAfter.getDay() === 0 || dayAfter.getDay() === 6
  const isWeekendToday = date.getDay() === 0 || date.getDay() === 6

  // ถ้ามีวันหยุดติดกับวันหยุดสุดสัปดาห์ = วันหยุดยาว
  return (
    (isHolidayToday && (isWeekendBefore || isWeekendAfter)) ||
    (isHolidayBefore && isWeekendToday) ||
    (isHolidayAfter && isWeekendToday)
  )
}

/**
 * หา multiplier สำหรับวันหยุด
 * 
 * @deprecated ใช้ Backend API แทน: GET /api/holidays-festivals/activities?date=YYYY-MM-DD
 * Backend จะคืนค่า multiplier และ demand_boost ที่คำนวณจากข้อมูลจริง
 * ฟังก์ชันนี้ใช้ได้เฉพาะใน Mock Data Source เท่านั้น
 */
export function getHolidayMultiplier(date: Date): number {
  const { isHoliday: isHolidayToday, holiday } = isHoliday(date)
  
  if (isHolidayToday && holiday) {
    return holiday.multiplier
  }

  // ถ้าเป็นวันหยุดยาว (แต่ไม่ใช่วันหยุดตรงๆ) ให้เพิ่ม 10%
  if (isLongWeekend(date)) {
    return 1.1
  }

  return 1.0 // ไม่ใช่วันหยุด
}

// ============================================
// 2. วันในสัปดาห์
// ============================================

export interface DayOfWeekPricing {
  day: number // 0 = อาทิตย์, 1 = จันทร์, ..., 6 = เสาร์
  dayName: string
  multiplier: number
  reason: string
}

export const dayOfWeekPricing: DayOfWeekPricing[] = [
  {
    day: 0, // อาทิตย์
    dayName: 'อาทิตย์',
    multiplier: 1.2, // เพิ่ม 20% (วันสุดสัปดาห์, คนเดินทางกลับ)
    reason: 'วันสุดสัปดาห์ - คนเดินทางกลับบ้าน',
  },
  {
    day: 1, // จันทร์
    dayName: 'จันทร์',
    multiplier: 0.9, // ลด 10% (วันธรรมดา, ความต้องการต่ำ)
    reason: 'วันธรรมดา - ความต้องการต่ำ',
  },
  {
    day: 2, // อังคาร
    dayName: 'อังคาร',
    multiplier: 0.85, // ลด 15% (วันธรรมดา, ราคาถูกที่สุด)
    reason: 'วันธรรมดา - ราคาถูกที่สุด',
  },
  {
    day: 3, // พุธ
    dayName: 'พุธ',
    multiplier: 0.85, // ลด 15% (วันธรรมดา, ราคาถูกที่สุด)
    reason: 'วันธรรมดา - ราคาถูกที่สุด',
  },
  {
    day: 4, // พฤหัสบดี
    dayName: 'พฤหัสบดี',
    multiplier: 0.9, // ลด 10% (วันธรรมดา, ความต้องการต่ำ)
    reason: 'วันธรรมดา - ความต้องการต่ำ',
  },
  {
    day: 5, // ศุกร์
    dayName: 'ศุกร์',
    multiplier: 1.15, // เพิ่ม 15% (วันสุดสัปดาห์, คนเดินทางไปเที่ยว)
    reason: 'วันสุดสัปดาห์ - คนเดินทางไปเที่ยว',
  },
  {
    day: 6, // เสาร์
    dayName: 'เสาร์',
    multiplier: 1.2, // เพิ่ม 20% (วันสุดสัปดาห์, คนเดินทางไปเที่ยว)
    reason: 'วันสุดสัปดาห์ - คนเดินทางไปเที่ยว',
  },
]

/**
 * หา multiplier สำหรับวันในสัปดาห์
 */
export function getDayOfWeekMultiplier(date: Date): number {
  const day = date.getDay()
  const dayPricing = dayOfWeekPricing.find(d => d.day === day)
  return dayPricing?.multiplier || 1.0
}

/**
 * ตรวจสอบว่าวันที่อยู่ในช่วงวันหยุดสุดสัปดาห์หรือไม่
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6 // อาทิตย์หรือเสาร์
}

// ============================================
// 3. การจองล่วงหน้า (Advance Booking)
// ============================================

export interface AdvanceBookingTier {
  minDays: number // จำนวนวันล่วงหน้าขั้นต่ำ
  maxDays: number // จำนวนวันล่วงหน้าสูงสุด (ไม่รวม)
  multiplier: number // ตัวคูณราคา
  description: string
}

export const advanceBookingTiers: AdvanceBookingTier[] = [
  {
    minDays: 90, // 3 เดือนขึ้นไป
    maxDays: Infinity,
    multiplier: 0.85, // ลด 15% (จองล่วงหน้านานมาก)
    description: 'จองล่วงหน้า 3 เดือนขึ้นไป - ราคาถูกที่สุด',
  },
  {
    minDays: 60, // 2 เดือน
    maxDays: 90,
    multiplier: 0.9, // ลด 10% (จองล่วงหน้านาน)
    description: 'จองล่วงหน้า 2-3 เดือน - ราคาถูก',
  },
  {
    minDays: 30, // 1 เดือน
    maxDays: 60,
    multiplier: 0.95, // ลด 5% (จองล่วงหน้าปกติ)
    description: 'จองล่วงหน้า 1-2 เดือน - ราคาปกติ',
  },
  {
    minDays: 14, // 2 สัปดาห์
    maxDays: 30,
    multiplier: 1.0, // ราคาปกติ
    description: 'จองล่วงหน้า 2 สัปดาห์ - 1 เดือน - ราคาปกติ',
  },
  {
    minDays: 7, // 1 สัปดาห์
    maxDays: 14,
    multiplier: 1.2, // เพิ่ม 20% (จองใกล้)
    description: 'จองล่วงหน้า 1-2 สัปดาห์ - ราคาแพง',
  },
  {
    minDays: 3, // 3 วัน
    maxDays: 7,
    multiplier: 1.4, // เพิ่ม 40% (จองใกล้มาก)
    description: 'จองล่วงหน้า 3-7 วัน - ราคาแพงมาก',
  },
  {
    minDays: 0, // วันเดียวกัน
    maxDays: 3,
    multiplier: 1.6, // เพิ่ม 60% (จองใกล้วันเดินทางมาก)
    description: 'จองล่วงหน้า 0-3 วัน - ราคาแพงที่สุด',
  },
]

/**
 * คำนวณจำนวนวันล่วงหน้า
 */
export function getDaysInAdvance(bookingDate: Date, travelDate: Date): number {
  const diffTime = travelDate.getTime() - bookingDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays) // ไม่ให้เป็นค่าลบ
}

/**
 * หา multiplier สำหรับการจองล่วงหน้า
 */
export function getAdvanceBookingMultiplier(
  bookingDate: Date,
  travelDate: Date
): number {
  const daysInAdvance = getDaysInAdvance(bookingDate, travelDate)

  for (const tier of advanceBookingTiers) {
    if (daysInAdvance >= tier.minDays && daysInAdvance < tier.maxDays) {
      return tier.multiplier
    }
  }

  return 1.0 // Default
}

/**
 * หา tier ของการจองล่วงหน้า
 */
export function getAdvanceBookingTier(
  bookingDate: Date,
  travelDate: Date
): AdvanceBookingTier | null {
  const daysInAdvance = getDaysInAdvance(bookingDate, travelDate)

  for (const tier of advanceBookingTiers) {
    if (daysInAdvance >= tier.minDays && daysInAdvance < tier.maxDays) {
      return tier
    }
  }

  return null
}

// ============================================
// 4. รวมทุกปัจจัย (Combined Multiplier)
// ============================================

export interface PricingFactors {
  holidayMultiplier: number
  dayOfWeekMultiplier: number
  advanceBookingMultiplier: number
  totalMultiplier: number
  factors: {
    isHoliday: boolean
    holidayName?: string
    isWeekend: boolean
    dayName: string
    daysInAdvance: number
    advanceBookingTier?: string
  }
}

/**
 * คำนวณ multiplier ทั้งหมดจากทุกปัจจัย
 * 
 * @deprecated สำหรับ holiday multiplier ควรใช้ Backend API แทน
 * ฟังก์ชันนี้ยังใช้ได้สำหรับ day of week และ advance booking multipliers
 * แต่ holiday multiplier ควรมาจาก Backend API
 */
export function calculatePricingFactors(
  bookingDate: Date,
  travelDate: Date
): PricingFactors {
  const holidayMultiplier = getHolidayMultiplier(travelDate)
  const dayOfWeekMultiplier = getDayOfWeekMultiplier(travelDate)
  const advanceBookingMultiplier = getAdvanceBookingMultiplier(bookingDate, travelDate)

  // คำนวณ total multiplier (คูณกันทั้งหมด)
  const totalMultiplier = holidayMultiplier * dayOfWeekMultiplier * advanceBookingMultiplier

  // ข้อมูลเพิ่มเติม
  const { isHoliday: isHolidayToday, holiday } = isHoliday(travelDate)
  const day = travelDate.getDay()
  const dayPricing = dayOfWeekPricing.find(d => d.day === day)
  const advanceTier = getAdvanceBookingTier(bookingDate, travelDate)
  const daysInAdvance = getDaysInAdvance(bookingDate, travelDate)

  return {
    holidayMultiplier,
    dayOfWeekMultiplier,
    advanceBookingMultiplier,
    totalMultiplier,
    factors: {
      isHoliday: isHolidayToday,
      holidayName: holiday?.name,
      isWeekend: isWeekend(travelDate),
      dayName: dayPricing?.dayName || '',
      daysInAdvance,
      advanceBookingTier: advanceTier?.description,
    },
  }
}

/**
 * ตัวอย่างการใช้งาน:
 * 
 * const bookingDate = new Date() // วันนี้
 * const travelDate = new Date('2025-04-13') // วันที่ 13 เมษายน (สงกรานต์)
 * 
 * const factors = calculatePricingFactors(bookingDate, travelDate)
 * 
 * console.log(factors)
 * // {
 * //   holidayMultiplier: 1.6,      // สงกรานต์
 * //   dayOfWeekMultiplier: 1.2,   // อาทิตย์
 * //   advanceBookingMultiplier: 0.95, // จองล่วงหน้า 1 เดือน
 * //   totalMultiplier: 1.824,      // 1.6 * 1.2 * 0.95
 * //   factors: { ... }
 * // }
 * 
 * const finalPrice = basePrice * factors.totalMultiplier
 */

