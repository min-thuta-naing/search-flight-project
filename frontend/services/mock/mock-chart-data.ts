/**
 * Mock chart data
 * Fallback data for price chart component
 */

export interface ChartDataPoint {
  startDate: string
  returnDate: string
  price: number
  season: 'high' | 'normal' | 'low'
  duration?: number
}

export const defaultChartData: ChartDataPoint[] = [
  { startDate: '01 ม.ค.', returnDate: '08 ม.ค.', price: 18500, season: 'high' },
  { startDate: '15 ม.ค.', returnDate: '22 ม.ค.', price: 19200, season: 'high' },
  { startDate: '01 ก.พ.', returnDate: '08 ก.พ.', price: 17800, season: 'high' },
  { startDate: '15 ก.พ.', returnDate: '22 ก.พ.', price: 16500, season: 'normal' },
  { startDate: '01 มี.ค.', returnDate: '08 มี.ค.', price: 15200, season: 'normal' },
  { startDate: '15 มี.ค.', returnDate: '22 มี.ค.', price: 14800, season: 'normal' },
  { startDate: '01 เม.ย.', returnDate: '08 เม.ย.', price: 13500, season: 'low' },
  { startDate: '15 เม.ย.', returnDate: '22 เม.ย.', price: 12800, season: 'low' },
  { startDate: '01 พ.ค.', returnDate: '08 พ.ค.', price: 12500, season: 'low' },
  { startDate: '15 พ.ค.', returnDate: '22 พ.ค.', price: 12500, season: 'low' },
  { startDate: '01 มิ.ย.', returnDate: '08 มิ.ย.', price: 13200, season: 'low' },
  { startDate: '15 มิ.ย.', returnDate: '22 มิ.ย.', price: 14500, season: 'normal' },
  { startDate: '01 ก.ค.', returnDate: '08 ก.ค.', price: 16800, season: 'normal' },
  { startDate: '15 ก.ค.', returnDate: '22 ก.ค.', price: 18200, season: 'high' },
  { startDate: '01 ส.ค.', returnDate: '08 ส.ค.', price: 19500, season: 'high' },
  { startDate: '15 ส.ค.', returnDate: '22 ส.ค.', price: 20700, season: 'high' },
  { startDate: '01 ก.ย.', returnDate: '08 ก.ย.', price: 18800, season: 'high' },
  { startDate: '15 ก.ย.', returnDate: '22 ก.ย.', price: 16200, season: 'normal' },
  { startDate: '01 ต.ค.', returnDate: '08 ต.ค.', price: 15500, season: 'normal' },
  { startDate: '15 ต.ค.', returnDate: '22 ต.ค.', price: 16800, season: 'normal' },
  { startDate: '01 พ.ย.', returnDate: '08 พ.ย.', price: 18200, season: 'high' },
  { startDate: '15 พ.ย.', returnDate: '22 พ.ย.', price: 19500, season: 'high' },
  { startDate: '01 ธ.ค.', returnDate: '08 ธ.ค.', price: 20800, season: 'high' },
  { startDate: '15 ธ.ค.', returnDate: '22 ธ.ค.', price: 22500, season: 'high' },
]

