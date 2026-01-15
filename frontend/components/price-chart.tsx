'use client'

import { Card } from '@/components/ui/card'
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { defaultChartData } from '@/services/mock/mock-chart-data'
import { monthOrder, thaiMonths } from '@/services/data/constants'

const getChartConfig = (tripType?: 'one-way' | 'round-trip' | null) => ({
  price: {
    label: tripType === 'one-way' ? 'ราคาเที่ยวเดียว' : 'ราคาไป-กลับ',
    color: 'hsl(221, 83%, 53%)', // สีน้ำเงินสวย
  },
})

interface PriceChartProps {
  data?: Array<{
    startDate: string
    returnDate: string
    price: number
    season: 'high' | 'normal' | 'low'
    duration?: number
  }>
  tripType?: 'one-way' | 'round-trip' | null
  selectedDate?: Date | null // วันที่ที่ผู้ใช้เลือก
  passengerCount?: number // ✅ เพิ่ม passengerCount เพื่อแสดงราคาต่อคน
}

export function PriceChart({ data, tripType, selectedDate, passengerCount }: PriceChartProps) {
  // Fallback to mock data if no data provided
  const chartData = data || defaultChartData
  const chartConfig = getChartConfig(tripType)

  const lowestPrice = Math.min(...chartData.map(d => d.price))

  // หาวันที่ที่มีราคาต่ำสุด (อาจมีหลายวันถ้าราคาเท่ากัน)
  const lowestPriceDates = chartData
    .filter(d => d.price === lowestPrice)
    .map(d => d.startDate)

  // ฟังก์ชันแปลง Date เป็นรูปแบบวันที่ในกราฟ (เช่น "11 ธ.ค.")
  // ✅ ใช้ local methods เพื่อคงวันที่ที่ผู้ใช้เลือก (calendar สร้าง Date object ที่ midnight local time)
  const formatDateForChart = (date: Date): string => {
    const day = date.getDate()
    const month = thaiMonths[date.getMonth()]
    return `${day} ${month}`
  }

  // แปลงวันที่ที่เลือกเป็นรูปแบบเดียวกับในกราฟ
  // ✅ ใช้ local methods เพื่อให้ตรงกับวันที่ที่ผู้ใช้เลือกจริงๆ
  const selectedDateStr = selectedDate ? formatDateForChart(selectedDate) : null

  // Transform data for chart - use startDate for X-axis
  // เรียงข้อมูลตามลำดับวันที่เพื่อให้เส้นเชื่อมต่อกันถูกต้อง

  let transformedData = chartData
    .map(d => ({
      date: d.startDate,
      price: d.price,
      season: d.season,
      returnDate: d.returnDate,
      duration: d.duration || 0,
      // เพิ่ม flag เพื่อ highlight วันที่ที่เลือก
      isSelected: selectedDateStr ? d.startDate === selectedDateStr : false,
      // เพิ่ม flag เพื่อ highlight ราคาต่ำสุด
      isLowestPrice: lowestPriceDates.includes(d.startDate),
      // เพิ่ม sortKey สำหรับเรียงลำดับ
      sortKey: (() => {
        const match = d.startDate.match(/(\d+)\s+(.+)/)
        if (match) {
          const day = parseInt(match[1])
          const month = monthOrder[match[2]] || 0
          return month * 100 + day
        }
        return 0
      })(),
    }))
    .sort((a, b) => a.sortKey - b.sortKey)

  // ✅ เพิ่มวันที่ที่เลือกเข้าไปใน transformedData ถ้ายังไม่มี (แม้ไม่มีข้อมูลจริง)
  // เพื่อให้เห็น mark และ ReferenceLine
  if (selectedDateStr && !transformedData.some(d => d.date === selectedDateStr)) {
    const selectedDateSortKey = (() => {
      const match = selectedDateStr.match(/(\d+)\s+(.+)/)
      if (match) {
        const day = parseInt(match[1])
        const month = monthOrder[match[2]] || 0
        return month * 100 + day
      }
      return 0
    })()

    // หาตำแหน่งที่เหมาะสมในการแทรก (เรียงตาม sortKey)
    const insertIndex = transformedData.findIndex(d => d.sortKey > selectedDateSortKey)
    const selectedDataPoint = {
      date: selectedDateStr,
      price: 0, // ไม่มีข้อมูลจริง ให้ราคาเป็น 0
      season: 'normal' as const,
      returnDate: '',
      duration: 0,
      isSelected: true,
      isLowestPrice: false,
      sortKey: selectedDateSortKey,
    }

    if (insertIndex === -1) {
      transformedData.push(selectedDataPoint)
    } else {
      transformedData.splice(insertIndex, 0, selectedDataPoint)
    }
  }


  return (
    <div className="min-h-[350px] w-full max-w-full">
      <ChartContainer config={chartConfig}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={transformedData} margin={{ top: 30, right: 40, left: 10, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={70}
              interval={0}
              tick={(props: any) => {
                const dateStr = props.payload.value
                const isSelected = selectedDateStr ? dateStr === selectedDateStr : false
                const isLowestPrice = lowestPriceDates.includes(dateStr)

                // ถ้าเป็นทั้งวันที่เลือกและราคาต่ำสุด ให้ใช้สีแดง (priority สูงกว่า)
                // ถ้าเป็นแค่ราคาต่ำสุด ให้ใช้สีเขียว
                // ถ้าเป็นแค่วันที่เลือก ให้ใช้สีแดง
                // ถ้าไม่ใช่ทั้งสอง ให้ใช้สีปกติ

                let tickColor = 'hsl(var(--foreground))'
                let fontWeight = 'normal'

                if (isSelected) {
                  tickColor = 'hsl(0, 84%, 60%)' // สีแดง
                  fontWeight = 'bold'
                } else if (isLowestPrice) {
                  tickColor = 'hsl(142, 76%, 36%)' // สีเขียว
                  fontWeight = 'bold'
                }

                return (
                  <text
                    x={props.x}
                    y={props.y}
                    fill={tickColor}
                    fontSize={11}
                    fontWeight={fontWeight}
                    textAnchor="end"
                    transform={`rotate(-45, ${props.x}, ${props.y})`}
                  >
                    {dateStr}
                  </text>
                )
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
              tickCount={8}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />

            <defs>
              {/* Gradient สำหรับพื้นที่กราฟ */}
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.4} />
                <stop offset="50%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.05} />
              </linearGradient>
              {/* Gradient สำหรับเส้นกราฟ */}
              <linearGradient id="priceStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(221, 83%, 53%)" />
                <stop offset="50%" stopColor="hsl(221, 83%, 60%)" />
                <stop offset="100%" stopColor="hsl(221, 83%, 53%)" />
              </linearGradient>
            </defs>
            <ReferenceLine
              y={lowestPrice}
              stroke="hsl(142, 76%, 36%)"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: 'ราคาถูกที่สุด',
                position: 'insideTopRight',
                fill: 'hsl(142, 76%, 36%)',
                fontSize: 12,
                fontWeight: 'bold'
              }}
            />
            {/* ReferenceLine แนวตั้งสำหรับ highlight วันที่ที่เลือก */}
            {selectedDateStr && transformedData.some(d => d.isSelected) && (
              <ReferenceLine
                x={selectedDateStr}
                stroke="hsl(0, 84%, 60%)"
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{
                  value: 'วันที่เลือก',
                  position: 'top',
                  fill: 'hsl(0, 84%, 60%)',
                  fontSize: 11,
                  fontWeight: 'bold',
                  offset: 10
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey="price"
              stroke="url(#priceStrokeGradient)"
              fill="url(#priceGradient)"
              strokeWidth={3}
              dot={(props: any) => {
                const isSelected = props.payload?.isSelected || false
                const isLowestPrice = props.payload?.isLowestPrice || false
                const price = props.payload?.price || 0

                // ถ้าเป็นทั้งวันที่เลือกและราคาต่ำสุด ให้ใช้สีแดง (priority สูงกว่า)
                // ถ้าเป็นแค่ราคาต่ำสุด ให้ใช้สีเขียว
                // ถ้าเป็นแค่วันที่เลือก ให้ใช้สีแดง
                // ถ้าไม่ใช่ทั้งสอง ให้ใช้สีน้ำเงินปกติ

                let dotColor = 'hsl(221, 83%, 53%)' // สีน้ำเงินปกติ
                let dotSize = 5
                let strokeWidth = 3
                let shadowStyle = {}

                if (isSelected) {
                  dotColor = 'hsl(0, 84%, 60%)' // สีแดง
                  dotSize = 8
                  strokeWidth = 4
                  shadowStyle = { filter: 'drop-shadow(0 2px 4px rgba(239, 68, 68, 0.6))' }
                } else if (isLowestPrice) {
                  dotColor = 'hsl(142, 76%, 36%)' // สีเขียว
                  dotSize = 7
                  strokeWidth = 3
                  shadowStyle = { filter: 'drop-shadow(0 2px 4px rgba(34, 197, 94, 0.6))' }
                }

                // ✅ ถ้าเป็นวันที่เลือกแต่ไม่มีข้อมูล (price = 0) ให้แสดง dot แต่ไม่แสดงบนเส้นกราฟ
                // โดยวางไว้ที่ตำแหน่งต่ำสุดของกราฟ
                if (isSelected && price === 0) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={dotSize}
                      fill={dotColor}
                      strokeWidth={strokeWidth}
                      stroke="hsl(0, 0%, 100%)"
                      opacity={1}
                      style={shadowStyle}
                    />
                  )
                }

                // ถ้าไม่มีข้อมูล (price = 0) และไม่ใช่วันที่เลือก ไม่แสดง dot
                if (price === 0 && !isSelected) {
                  return null
                }

                return (
                  <circle
                    cx={props.cx}
                    cy={props.cy}
                    r={dotSize}
                    fill={dotColor}
                    strokeWidth={strokeWidth}
                    stroke="hsl(0, 0%, 100%)"
                    opacity={isSelected || isLowestPrice ? 1 : 0.9}
                    style={shadowStyle}
                  />
                )
              }}
              activeDot={{
                r: 7,
                strokeWidth: 3,
                stroke: 'hsl(0, 0%, 100%)',
                fill: 'hsl(221, 83%, 53%)',
                style: { filter: 'drop-shadow(0 2px 4px rgba(59, 130, 246, 0.5))' }
              }}
              connectNulls={false}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  )
}
