import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * แปลง Date object เป็น date string (YYYY-MM-DD) โดยใช้ local date methods
 * เพื่อคงวันที่ที่ผู้ใช้เลือก (calendar สร้าง Date object ที่ midnight local time)
 * Backend จะ parse เป็น UTC date (T00:00:00.000Z) ซึ่งจะแทนวันที่เดียวกัน
 * 
 * @param date - Date object ที่ต้องการแปลง
 * @returns date string ในรูปแบบ "YYYY-MM-DD"
 * 
 * @example
 * // User in Thailand (UTC+7) selects Dec 11, 2025
 * // Date object: 2025-12-11T00:00:00+07:00
 * formatDateToUTCString(new Date('2025-12-11T00:00:00+07:00')) // "2025-12-11"
 * // Backend receives "2025-12-11" and parses as 2025-12-11T00:00:00.000Z (Dec 11 UTC)
 */
export function formatDateToUTCString(date: Date | string | undefined | null): string | undefined {
  if (!date) return undefined
  
  // ถ้าเป็น string ให้เอาเฉพาะส่วนวันที่ (ก่อน T)
  if (typeof date === 'string') {
    return date.split('T')[0]
  }
  
  // ใช้ local date methods เพื่อคงวันที่ที่ผู้ใช้เลือก
  // Calendar component สร้าง Date object ที่ midnight local time
  // เช่น ถ้าผู้ใช้เลือก Dec 11, 2025 ใน Thailand (UTC+7)
  // Date object จะเป็น 2025-12-11T00:00:00+07:00
  // ใช้ local methods จะได้ 2025-12-11 (ถูกต้อง)
  // ใช้ UTC methods จะได้ 2025-12-10 (ผิด!)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}