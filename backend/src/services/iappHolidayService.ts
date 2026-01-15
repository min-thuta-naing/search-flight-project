/**
 * iApp Holiday Service (Backend)
 * Fetches Thai holiday data from iApp API for season calculation
 */

import { format, parseISO, isWeekend, addDays } from 'date-fns';

export interface Holiday {
  date: string; // YYYY-MM-DD format
  name: string; // Thai holiday name
  nameEn: string; // English holiday name
  type: 'national' | 'regional' | 'observance';
  isPublicHoliday: boolean;
}

export interface HolidayStatistics {
  period: string; // YYYY-MM format
  holidaysCount: number;
  longWeekendsCount: number;
  holidayScore: number; // 0-100
  holidaysDetail: Holiday[];
}

export interface IAppHolidayResponse {
  date: string;
  date_thai?: string | null;
  weekday?: string;
  weekday_thai?: string | null;
  name: string;
  name_thai?: string | null;
  type: 'public' | 'financial';
}

export interface IAppHolidayAPIResponse {
  holidays: IAppHolidayResponse[];
  total_count: number;
  date_range?: {
    start_date: string;
    end_date: string;
    query_type: string;
    reference_date?: string;
  };
  holiday_types: string[];
  cached_at?: string;
}

export class IAppHolidayService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.IAPP_API_KEY || '';
    this.baseUrl = process.env.IAPP_API_URL || 'https://api.iapp.co.th/v3/store/data';
    
    if (!this.apiKey || this.apiKey === 'your_api_key_here') {
      console.warn('[IAppHolidayService] API key is not configured. Holiday features will not work.');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey && this.apiKey !== 'your_api_key_here';
  }

  /**
   * Get holidays for a specific year
   */
  async getHolidaysForYear(year: number): Promise<Holiday[]> {
    if (!this.isAvailable()) {
      console.warn('[IAppHolidayService] API key is not configured');
      return [];
    }

    try {
      // iApp API endpoint for Thai holidays
      // Format: GET /thai-holiday?holiday_type=both&year=YYYY
      // Authentication: apikey header (not Bearer token)
      const url = `${this.baseUrl}/thai-holiday?holiday_type=both&year=${year}`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[IAppHolidayService] API error:', response.status, errorData);
        return [];
      }

      const responseData = await response.json() as IAppHolidayAPIResponse;
      
      // API returns { holidays: [...], total_count: N, ... }
      if (!responseData.holidays || !Array.isArray(responseData.holidays)) {
        console.warn('[IAppHolidayService] Unexpected response format:', Object.keys(responseData));
        return [];
      }
      
      return responseData.holidays.map(item => ({
        date: item.date,
        name: item.name,
        nameEn: item.name || item.name_thai || item.name, // Fallback to Thai name if English not available
        type: item.type === 'public' ? 'national' : (item.type === 'financial' ? 'regional' : 'national'),
        isPublicHoliday: item.type === 'public' || item.type === 'financial', // Both are considered holidays
      }));
    } catch (error: any) {
      console.error(`[IAppHolidayService] Error fetching holidays for year ${year}:`, error.message);
      return [];
    }
  }

  /**
   * Get holidays for a date range (multiple years)
   * More efficient than calling getHolidaysForYear multiple times
   * @param startDate - Start date (YYYY-MM-DD or Date)
   * @param endDate - End date (YYYY-MM-DD or Date)
   */
  async getHolidaysForDateRange(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<Holiday[]> {
    if (!this.isAvailable()) {
      console.warn('[IAppHolidayService] API key is not configured');
      return [];
    }

    try {
      // Convert to YYYY-MM-DD format if Date object
      const start = typeof startDate === 'string' 
        ? startDate 
        : format(startDate, 'yyyy-MM-dd');
      const end = typeof endDate === 'string' 
        ? endDate 
        : format(endDate, 'yyyy-MM-dd');

      // iApp API endpoint with date range
      // Format: GET /thai-holiday?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&holiday_type=both
      // Authentication: apikey header (not Bearer token)
      const url = `${this.baseUrl}/thai-holiday?start_date=${start}&end_date=${end}&holiday_type=both`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': this.apiKey,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[IAppHolidayService] API error:', response.status, errorData);
        // Fallback: try year-by-year if date range fails
        console.log('[IAppHolidayService] Falling back to year-by-year fetching...');
        return this.getHolidaysForYearsFallback(startDate, endDate);
      }

      const responseData = await response.json() as IAppHolidayAPIResponse;
      
      // API returns { holidays: [...], total_count: N, ... }
      if (!responseData.holidays || !Array.isArray(responseData.holidays)) {
        console.warn('[IAppHolidayService] Unexpected response format:', Object.keys(responseData));
        // Fallback to year-by-year
        return this.getHolidaysForYearsFallback(startDate, endDate);
      }
      
      return responseData.holidays.map(item => ({
        date: item.date,
        name: item.name,
        nameEn: item.name || item.name_thai || item.name,
        type: item.type === 'public' ? 'national' : (item.type === 'financial' ? 'regional' : 'national'),
        isPublicHoliday: item.type === 'public' || item.type === 'financial',
      }));
    } catch (error: any) {
      console.error(`[IAppHolidayService] Error fetching holidays for date range ${startDate} to ${endDate}:`, error.message);
      // Fallback: try year-by-year if date range fails
      return this.getHolidaysForYearsFallback(startDate, endDate);
    }
  }

  /**
   * Fallback method: Get holidays year by year if date range API fails
   */
  private async getHolidaysForYearsFallback(
    startDate: string | Date,
    endDate: string | Date
  ): Promise<Holiday[]> {
    const start = typeof startDate === 'string' ? parseISO(startDate) : startDate;
    const end = typeof endDate === 'string' ? parseISO(endDate) : endDate;
    
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    
    const allHolidays: Holiday[] = [];
    
    for (let year = startYear; year <= endYear; year++) {
      try {
        const yearHolidays = await this.getHolidaysForYear(year);
        allHolidays.push(...yearHolidays);
        // Rate limiting
        await this.rateLimit(200);
      } catch (error: any) {
        console.error(`[IAppHolidayService] Error fetching holidays for year ${year}:`, error.message);
      }
    }
    
    return allHolidays;
  }

  /**
   * Get holidays for multiple years at once
   * @param startYear - Start year (e.g., 2024)
   * @param endYear - End year (e.g., 2026)
   */
  async getHolidaysForYears(startYear: number, endYear: number): Promise<Holiday[]> {
    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;
    return this.getHolidaysForDateRange(startDate, endDate);
  }

  /**
   * Get holidays for a specific month
   */
  async getHolidaysForMonth(period: string): Promise<Holiday[]> {
    if (!this.isAvailable()) {
      return [];
    }

    try {
      const [year, month] = period.split('-').map(Number);
      const yearHolidays = await this.getHolidaysForYear(year);
      
      // Filter holidays for the specific month
      return yearHolidays.filter(holiday => {
        const holidayDate = parseISO(holiday.date);
        return holidayDate.getUTCMonth() + 1 === month; // getUTCMonth() returns 0-11
      });
    } catch (error: any) {
      console.error(`[IAppHolidayService] Error fetching holidays for period ${period}:`, error.message);
      return [];
    }
  }

  /**
   * Check if a date creates a long weekend
   * A long weekend occurs when a holiday falls on Friday or Monday
   */
  isLongWeekend(date: Date): boolean {
    const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 5 = Friday, 1 = Monday
    
    // Friday holiday creates long weekend (Sat-Sun already weekend)
    if (dayOfWeek === 5) {
      return true;
    }
    
    // Monday holiday creates long weekend (Sat-Sun already weekend)
    if (dayOfWeek === 1) {
      return true;
    }
    
    // Check if holiday is adjacent to weekend
    const prevDay = addDays(date, -1);
    const nextDay = addDays(date, 1);
    
    if (isWeekend(prevDay) || isWeekend(nextDay)) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if a holiday is a major festival (สงกรานต์, ตรุษจีน, ปีใหม่, คริสต์มาส)
   */
  private isMajorFestival(holiday: Holiday): boolean {
    const name = holiday.name.toLowerCase();
    return (
      name.includes('สงกรานต์') ||
      name.includes('ตรุษจีน') ||
      name.includes('ปีใหม่') ||
      name.includes('ขื้นปีใหม่') ||
      name.includes('ขึ้นปีใหม่') ||
      name.includes('คริสต์มาส') ||
      name.includes('สิ้นปี')
    );
  }

  /**
   * Check if a holiday is an important public holiday
   */
  private isImportantHoliday(holiday: Holiday): boolean {
    if (!holiday.isPublicHoliday) {
      return false;
    }
    
    const name = holiday.name.toLowerCase();
    return (
      name.includes('มาฆบูชา') ||
      name.includes('วิสาขบูชา') ||
      name.includes('อาสาฬหบูชา') ||
      name.includes('เฉลิมพระชนมพรรษา') ||
      name.includes('แม่') ||
      name.includes('พ่อ')
    );
  }

  /**
   * Check if a holiday is a special day/festival
   */
  private isSpecialDay(holiday: Holiday): boolean {
    const name = holiday.name.toLowerCase();
    return (
      name.includes('วาเลนไทน์') ||
      (!holiday.isPublicHoliday && !this.isMajorFestival(holiday))
    );
  }

  /**
   * Calculate holiday boost score (0-100) based on holidays in a month
   * 
   * Scoring system:
   * - Major Festivals (สงกรานต์, ตรุษจีน, ปีใหม่, คริสต์มาส): +20 points/day
   * - Important Public Holidays (มาฆบูชา, วิสาขบูชา, เฉลิมพระชนมพรรษา, วันแม่, วันพ่อ): +10 points/day
   * - Regular Public Holidays: +8 points/day
   * - Special Days (วาเลนไทน์, etc.): +5 points/day
   * - Long Weekend: +5 points/day
   * - Peak Months (Dec, Jan, Apr): +20 points
   */
  calculateHolidayBoost(holidays: Holiday[]): number {
    let score = 50; // Base score (normal month)

    if (holidays.length === 0) {
      return score; // No holidays = normal score
    }

    // Separate holidays by category
    const majorFestivals: Holiday[] = [];
    const importantHolidays: Holiday[] = [];
    const regularHolidays: Holiday[] = [];
    const specialDays: Holiday[] = [];

    holidays.forEach(holiday => {
      if (this.isMajorFestival(holiday)) {
        majorFestivals.push(holiday);
      } else if (this.isImportantHoliday(holiday)) {
        importantHolidays.push(holiday);
      } else if (this.isSpecialDay(holiday)) {
        specialDays.push(holiday);
      } else if (holiday.isPublicHoliday) {
        regularHolidays.push(holiday);
      } else {
        // Default: treat as special day
        specialDays.push(holiday);
      }
    });

    // Calculate scores by category
    // 1. Major Festivals: +20 points/day
    score += majorFestivals.length * 20;

    // 2. Important Public Holidays: +10 points/day
    score += importantHolidays.length * 10;

    // 3. Regular Public Holidays: +8 points/day
    score += regularHolidays.length * 8;

    // 4. Special Days: +5 points/day
    score += specialDays.length * 5;

    // 5. Long Weekend: +5 points/day
    const longWeekends = holidays.filter(holiday => {
      const holidayDate = parseISO(holiday.date);
      return this.isLongWeekend(holidayDate);
    });
    score += longWeekends.length * 5;

    // 6. Peak holiday months (Dec, Jan, Apr) get bonus
    if (holidays.length > 0) {
      const firstHoliday = parseISO(holidays[0].date);
      const month = firstHoliday.getUTCMonth() + 1; // 1-12
      
      if (month === 12 || month === 1 || month === 4) {
        score += 20; // Peak months bonus
      }
    }

    // Ensure score is between 0 and 100
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get holiday statistics for a specific period (month)
   */
  async getHolidayStatisticsForPeriod(period: string): Promise<HolidayStatistics | null> {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      const holidays = await this.getHolidaysForMonth(period);
      
      // Count long weekends
      const longWeekends = holidays.filter(holiday => {
        const holidayDate = parseISO(holiday.date);
        return this.isLongWeekend(holidayDate);
      }).length;

      // Calculate holiday score
      const holidayScore = this.calculateHolidayBoost(holidays);

      return {
        period,
        holidaysCount: holidays.length,
        longWeekendsCount: longWeekends,
        holidayScore,
        holidaysDetail: holidays,
      };
    } catch (error: any) {
      console.error(`[IAppHolidayService] Error getting holiday statistics for ${period}:`, error.message);
      return null;
    }
  }

  /**
   * Get holiday statistics for multiple periods
   */
  async getHolidayStatisticsForPeriods(periods: string[]): Promise<Map<string, HolidayStatistics>> {
    const statisticsMap = new Map<string, HolidayStatistics>();

    for (const period of periods) {
      try {
        const stats = await this.getHolidayStatisticsForPeriod(period);
        if (stats) {
          statisticsMap.set(period, stats);
        }
        
        // Rate limiting
        await this.rateLimit(200);
      } catch (error: any) {
        console.error(`[IAppHolidayService] Error fetching statistics for ${period}:`, error.message);
      }
    }

    return statisticsMap;
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

