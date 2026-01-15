'use client'

import { Card } from '@/components/ui/card'
import { BarChart3, TrendingUp, Calendar, Globe, Trophy } from 'lucide-react'
import { 
  getMostSearchedCountry, 
  getMostSearchedDuration, 
  getTotalSearches,
  getMonthlySearchStats,
  getPopularProvinces
} from '@/lib/stats'
import { useEffect, useState, useRef } from 'react'
import { provinceNames } from '@/services/data/constants'
import { statisticsApi } from '@/lib/api/statistics-api'

// Chart configuration - สามารถปรับสีและขนาดได้ที่นี่
const chartConfig = {
  // Bar height (ขนาดความสูงของเส้น) - ใช้ Tailwind classes เช่น 'h-6', 'h-8', 'h-10', 'h-12'
  // ปรับได้: h-6 (เล็ก), h-8 (กลาง), h-10 (ใหญ่), h-12 (ใหญ่มาก)
  barHeight: 'h-4',
  
  // Bar gradient colors (สีของเส้น) - ใช้ CSS color values หรือ RGB/RGBA
  // ตัวอย่าง:
  // - Blue to Purple: { from: '#60a5fa', to: '#a855f7' } (blue-400 to purple-500)
  // - Green to Blue: { from: '#4ade80', to: '#3b82f6' } (green-400 to blue-500)
  // - Red to Pink: { from: '#f87171', to: '#ec4899' } (red-400 to pink-500)
  // - Orange to Red: { from: '#fb923c', to: '#ef4444' } (orange-400 to red-500)
  gradient: {
    from: '#60a5fa', // blue-400
    to: '#60a5fa',   // purple-500
  },
  
  // Background color สำหรับ bar container - ใช้ Tailwind class
  bgColor: 'bg-gray-100',
}

// Thai month names mapping
const thaiMonths: Record<string, string> = {
  'January': 'มกราคม',
  'February': 'กุมภาพันธ์',
  'March': 'มีนาคม',
  'April': 'เมษายน',
  'May': 'พฤษภาคม',
  'June': 'มิถุนายน',
  'July': 'กรกฎาคม',
  'August': 'สิงหาคม',
  'September': 'กันยายน',
  'October': 'ตุลาคม',
  'November': 'พฤศจิกายน',
  'December': 'ธันวาคม',
}

// Mapping สำหรับรูปภาพของแต่ละจังหวัด
// ใช้ชื่อไฟล์ตรงกับชื่อจังหวัด (province value) + '.jpg'
// ถ้าไม่มีรูปจริง จะ fallback ไปใช้ placeholder.svg ตาม logic ในโค้ด
const provinceImages: Record<string, string> = {
  // ภาคกลาง & ตะวันออก
  'bangkok': '/bangkok.jpg',
  'rayong': '/rayong.jpg',
  'trat': '/trat.jpg',
  'prachuap-khiri-khan': '/prachuap-khiri-khan.jpg',
  'chonburi': '/chonburi.jpg',
  'kanchanaburi': '/kanchanaburi.jpg',
  
  // ภาคเหนือ
  'chiang-mai': '/chiang-mai.jpg',
  'chiang-rai': '/chiang-rai.jpg',
  'lampang': '/lampang.jpg',
  'mae-hong-son': '/mae-hong-son.jpg',
  'nan': '/nan.jpg',
  'phrae': '/phrae.jpg',
  'phitsanulok': '/phitsanulok.jpg',
  'sukhothai': '/sukhothai.jpg',
  'tak': '/tak.jpg',
  
  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  'udon-thani': '/udon-thani.jpg',
  'khon-kaen': '/khon-kaen.jpg',
  'nakhon-ratchasima': '/nakhon-ratchasima.jpg',
  'ubon-ratchathani': '/ubon-ratchathani.jpg',
  'nakhon-phanom': '/nakhon-phanom.jpg',
  'sakon-nakhon': '/sakon-nakhon.jpg',
  'roi-et': '/roi-et.jpg',
  'loei': '/loei.jpg',
  'buri-ram': '/buri-ram.jpg',
  
  // ภาคใต้
  'phuket': '/phuket.jpg',
  'krabi': '/krabi.jpg',
  'songkhla': '/songkhla.jpg',
  'hat-yai': '/hat-yai.jpg',
  'surat-thani': '/surat-thani.jpg',
  'nakhon-si-thammarat': '/nakhon-si-thammarat.jpg',
  'trang': '/trang.jpg',
  'ranong': '/ranong.jpg',
  'chumphon': '/chumphon.jpg',
  'narathiwat': '/narathiwat.jpg',
}

export function FlightStats() {
  const [stats, setStats] = useState({
    mostSearchedCountry: null as { country: string; count: number } | null,
    mostSearchedDuration: null as { duration: string; count: number } | null,
    totalSearches: 0,
    monthlyStats: [] as Array<{ month: string; count: number }>,
    popularProvinces: [] as Array<{ province: string; count: number }>,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isFetchingRef = useRef(false)
  const retryDelayRef = useRef(30000) // Start with 30 seconds
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let mounted = true;
    let currentTimeout: NodeJS.Timeout | null = null;
    
    const fetchStats = async (isInitialLoad = false) => {
      // Prevent concurrent fetches
      if (isFetchingRef.current || !mounted) return;
      
      isFetchingRef.current = true
      
      // Only show loading on initial load
      if (isInitialLoad && mounted) {
        setLoading(true)
      }
      
      try {
        // Try to fetch from backend API first
        const data = await statisticsApi.getStatistics();
        
        if (!mounted) return;
        
        // Transform backend data to match frontend format
        setStats({
          totalSearches: data.totalSearches,
          mostSearchedCountry: data.mostSearchedDestination
            ? {
                country: data.mostSearchedDestination.destination,
                count: data.mostSearchedDestination.count,
              }
            : null,
          mostSearchedDuration: data.mostSearchedDuration
            ? {
                duration: data.mostSearchedDuration.duration_range,
                count: data.mostSearchedDuration.count,
              }
            : null,
          popularProvinces: data.popularDestinations.map((d) => ({
            province: d.destination,
            count: d.count,
          })),
          monthlyStats: data.monthlyStats.map((m) => ({
            month: thaiMonths[m.month_name] || m.month_name,
            count: m.count,
          })),
        });
        
        // Reset retry delay on success
        retryDelayRef.current = 60000 // 60 seconds (1 minute) - more conservative
        setError(null)
        if (mounted) {
          setLoading(false)
        }
      } catch (error: any) {
        if (!mounted) return;
        
        // Check if it's a rate limit error
        if (error.message?.includes('429')) {
          // Exponential backoff for rate limit errors - start with longer delay
          retryDelayRef.current = Math.min(retryDelayRef.current * 2, 600000) // Max 10 minutes
          setError(null) // Don't show error to user, just wait longer
          // Don't log to console to reduce spam
        } else {
          // Only log non-rate-limit errors
          console.error('Failed to fetch statistics from backend, falling back to localStorage:', error);
          setError(error.message || 'Failed to fetch statistics')
        }
        
        // Fallback to localStorage if API fails (only on initial load)
        if (isInitialLoad) {
          try {
            const monthlyStats = getMonthlySearchStats() || [];
            const popularProvinces = getPopularProvinces(5) || [];
            
            setStats({
              mostSearchedCountry: getMostSearchedCountry(),
              mostSearchedDuration: getMostSearchedDuration(),
              totalSearches: getTotalSearches(),
              monthlyStats: Array.isArray(monthlyStats) ? monthlyStats : [],
              popularProvinces: Array.isArray(popularProvinces) ? popularProvinces : [],
            });
          } catch (localStorageError) {
            console.error('Error updating stats from localStorage:', localStorageError);
            // Set default values on error
            setStats({
              mostSearchedCountry: null,
              mostSearchedDuration: null,
              totalSearches: 0,
              monthlyStats: [],
              popularProvinces: [],
            });
          }
        }
        
        if (mounted) {
          setLoading(false)
        }
      } finally {
        isFetchingRef.current = false
        
        // Schedule next fetch only if component is still mounted
        if (mounted) {
          if (currentTimeout) {
            clearTimeout(currentTimeout)
          }
          currentTimeout = setTimeout(() => {
            if (mounted) {
              fetchStats(false)
            }
          }, retryDelayRef.current)
          timeoutRef.current = currentTimeout
        }
      }
    };

    // Initial load with longer delay to avoid immediate rate limit
    const initialTimeout = setTimeout(() => {
      if (mounted) {
        fetchStats(true);
      }
    }, 1000); // Wait 1 second before first fetch
    
    // Listen for custom events to refresh stats immediately when search happens
    const handleSearchCompleted = () => {
      if (mounted && !isFetchingRef.current) {
        // Clear existing timeout
        if (currentTimeout) {
          clearTimeout(currentTimeout)
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }
        // Refresh stats immediately (with small delay to ensure DB is updated)
        setTimeout(() => {
          if (mounted) {
            fetchStats(false)
          }
        }, 500) // Wait 500ms for DB to update
      }
    }
    
    window.addEventListener('flightSearchCompleted', handleSearchCompleted)
    window.addEventListener('flightPriceStatSaved', handleSearchCompleted)
    
    // Cleanup function
    return () => {
      mounted = false;
      window.removeEventListener('flightSearchCompleted', handleSearchCompleted)
      window.removeEventListener('flightPriceStatSaved', handleSearchCompleted)
      if (currentTimeout) {
        clearTimeout(currentTimeout)
      }
      if (initialTimeout) {
        clearTimeout(initialTimeout)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      isFetchingRef.current = false
    };
  }, [])

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-lg">{'กำลังโหลดสถิติ...'}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Statistics */}
      {stats.totalSearches > 0 ? (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-bold">{'สถิติการค้นหา'}</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Total Searches */}
            <div className="p-4 bg-background rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{'จำนวนการค้นหาทั้งหมด'}</span>
              </div>
              <div className="text-3xl font-bold text-primary">
                {stats.totalSearches}
              </div>
            </div>

            {/* Most Searched Province */}
            {stats.mostSearchedCountry && (
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{'จังหวัดที่ค้นหามากที่สุด'}</span>
                </div>
                <div className="text-2xl font-bold">
                  {provinceNames[stats.mostSearchedCountry.country] || stats.mostSearchedCountry.country}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {'ค้นหา '}{stats.mostSearchedCountry.count}{' ครั้ง'}
                </div>
              </div>
            )}

            {/* Most Searched Duration (Round Trip Only) */}
            {stats.mostSearchedDuration && (
              <div className="p-4 bg-background rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{'ระยะเวลาที่นิยมมากที่สุด (ไป-กลับ)'}</span>
                </div>
                <div className="text-2xl font-bold">
                  {stats.mostSearchedDuration.duration}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {'ค้นหา '}{stats.mostSearchedDuration.count}{' ครั้ง'}
                </div>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-bold">{'สถิติการค้นหา'}</h3>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">{'ยังไม่มีข้อมูลการค้นหา'}</p>
            <p className="text-sm mt-2">{'ลองค้นหาเที่ยวบินเพื่อดูสถิติ'}</p>
          </div>
        </Card>
      )}

      {/* Travel Statistics - Popular Provinces and Months with Most Bookings */}
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-2">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-6 h-6 text-primary" />
          <h3 className="text-2xl font-bold">{'สถิติการเดินทางของผู้ใช้ทั้งหมด'}</h3>
        </div>

        {((stats.popularProvinces && stats.popularProvinces.length > 0) || (stats.monthlyStats && stats.monthlyStats.length > 0)) ? (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Section: Popular Provinces */}
            {stats.popularProvinces && stats.popularProvinces.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold">{'จังหวัดยอดนิยม'}</h4>
                </div>

                <div className="space-y-4">
                  {stats.popularProvinces.map((item, index) => {
                    const maxCount = stats.popularProvinces[0]?.count || 1
                    const percentage = (item.count / maxCount) * 100
                    
                    const provinceImage = provinceImages[item.province] || '/placeholder.svg'
                    
                    return (
                      <div key={item.province} className="flex items-center gap-3">
                        {/* Province Image */}
                        <div className="flex-shrink-0 w-16 h-16 rounded-full overflow-hidden border-2 border-blue-200 shadow-md">
                          <img 
                            src={provinceImage}
                            alt={provinceNames[item.province] || item.province}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement
                              target.src = '/placeholder.svg'
                            }}
                          />
                        </div>

                        {/* Province Name */}
                        <div className="flex-shrink-0 min-w-[120px] max-w-[140px]">
                          <span className="font-medium">
                            {provinceNames[item.province] || item.province}
                          </span>
                        </div>

                        {/* Bar Chart */}
                        <div className="flex-1 relative">
                          <div className={`${chartConfig.barHeight} ${chartConfig.bgColor} rounded-full overflow-hidden`}>
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${percentage}%`,
                                background: `linear-gradient(to right, ${chartConfig.gradient.from}, ${chartConfig.gradient.to})`
                              }}
                            />
                          </div>
                        </div>

                        {/* Count */}
                        <div className="flex-shrink-0 text-right">
                          <span className="font-semibold">
                            {item.count.toLocaleString()} {'คน'}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}

            {/* Right Section: Months with Most Bookings */}
            {stats.monthlyStats && stats.monthlyStats.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-bold">{'เดือนที่มีการจองมากที่สุด'}</h4>
                </div>

                <div className="space-y-4">
                  {stats.monthlyStats
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map((item, index) => {
                      const maxCount = stats.monthlyStats.reduce((max, curr) => Math.max(max, curr.count), 1)
                      const percentage = (item.count / maxCount) * 100
                      
                      return (
                        <div key={item.month} className="flex items-center gap-3">
                          {/* Rank Circle */}
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-bold">{index + 1}</span>
                          </div>

                          {/* Month Name */}
                          <div className="flex-shrink-0 min-w-[120px] max-w-[140px]">
                            <span className="font-medium">
                              {item.month}
                            </span>
                          </div>

                          {/* Bar Chart */}
                          <div className="flex-1 relative">
                            <div className={`${chartConfig.barHeight} ${chartConfig.bgColor} rounded-full overflow-hidden`}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${percentage}%`,
                                  background: `linear-gradient(to right, ${chartConfig.gradient.from}, ${chartConfig.gradient.to})`
                                }}
                              />
                            </div>
                          </div>

                          {/* Count */}
                          <div className="flex-shrink-0 text-right">
                            <span className="font-semibold">
                              {item.count.toLocaleString()} {'ครั้ง'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-lg">{'ยังไม่มีข้อมูลสถิติการเดินทาง'}</p>
            <p className="text-sm mt-2">{'ลองค้นหาเที่ยวบินเพื่อดูสถิติ'}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
