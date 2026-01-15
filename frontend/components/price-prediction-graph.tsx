'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Legend,
} from 'recharts'

// ประเภทข้อมูลกราฟทำนายราคา
export interface PredictionGraphDataPoint {
    date: string
    low: number
    typical: number
    high: number
    isActual: boolean
}

interface PricePredictionGraphProps {
    data: PredictionGraphDataPoint[]
    origin?: string
    destination?: string
    loading?: boolean
}

// Custom Tooltip Component - Brighter styling
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const dataPoint = payload[0]?.payload
        const isActual = dataPoint?.isActual

        return (
            <div
                style={{
                    backgroundColor: 'rgba(30, 30, 35, 0.95)',
                    border: '1px solid rgba(150, 150, 160, 0.3)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
            >
                <p style={{ color: '#E0E0E0', fontWeight: 'bold', marginBottom: '8px' }}>
                    วันที่ออกเดินทาง: {label}
                </p>
                <p style={{ color: '#4ADE80', margin: '4px 0' }}>
                    {isActual ? 'ราคาจริง' : 'ทำนาย'} (ราคาปกติ): ฿{dataPoint.typical?.toLocaleString()}
                </p>
                <p style={{ color: '#60A5FA', margin: '4px 0' }}>
                    ราคาต่ำสุด: ฿{dataPoint.low?.toLocaleString()}
                </p>
                <p style={{ color: '#F87171', margin: '4px 0' }}>
                    ราคาสูงสุด: ฿{dataPoint.high?.toLocaleString()}
                </p>
                <p style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '8px' }}>
                    {isActual ? 'ข้อมูลจริง' : 'ทำนายด้วย XGBoost (200 วัน)'}
                </p>
            </div>
        )
    }
    return null
}

export function PricePredictionGraph({
    data,
    origin = '',
    destination = '',
    loading = false,
}: PricePredictionGraphProps) {
    // Transform data for AreaChart (need array for area range)
    const chartData = useMemo(() => {
        return data.map((d) => ({
            ...d,
            // For rendering area between low and high
            range: [d.low, d.high],
        }))
    }, [data])

    // Find actual vs predicted boundary
    const actualEndIndex = useMemo(() => {
        const lastActual = chartData.findLastIndex((d) => d.isActual)
        return lastActual >= 0 ? lastActual : 0
    }, [chartData])

    const lastActualDate = chartData[actualEndIndex]?.date || ''

    if (loading) {
        return (
            <Card className="w-full bg-card border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <span className="animate-pulse">กำลังโหลดข้อมูลทำนายราคา...</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[400px] w-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
                    </div>
                </CardContent>
            </Card>
        )
    }

    if (!data || data.length === 0) {
        return (
            <Card className="w-full bg-card border">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg">กราฟทำนายราคา</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground">
                        ไม่มีข้อมูลสำหรับแสดงกราฟ
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full bg-card border">
            <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 justify-between flex-wrap">
                    <span>
                        {origin} → {destination} | Low-Typical-High (Line + Band)
                    </span>
                    <span className="flex items-center gap-4 text-sm font-normal text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: '#4ADE80',
                                    borderRadius: 2,
                                    display: 'inline-block',
                                }}
                            />
                            ราคาถูกสุด
                        </span>
                        <span className="flex items-center gap-1">
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: '#60A5FA',
                                    borderRadius: 2,
                                    display: 'inline-block',
                                }}
                            />
                            ราคามาตรฐาน
                        </span>
                        <span className="flex items-center gap-1">
                            <span
                                style={{
                                    width: 12,
                                    height: 12,
                                    backgroundColor: '#F87171',
                                    borderRadius: 2,
                                    display: 'inline-block',
                                }}
                            />
                            ราคาสูง
                        </span>
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Scrollable chart container */}
                <div className="h-[420px] w-full overflow-x-auto overflow-y-hidden">
                    <div style={{ width: Math.max(chartData.length * 10, 1200), height: 400 }}>
                        <ComposedChart
                            data={chartData}
                            width={Math.max(chartData.length * 10, 1200)}
                            height={380}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            {/* Grid - Brighter */}
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(120, 120, 140, 0.25)" />

                            {/* X Axis - Ticks every 5 days */}
                            <XAxis
                                dataKey="date"
                                stroke="#9CA3AF"
                                fontSize={11}
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={4}
                                tick={{ fill: '#9CA3AF' }}
                                tickFormatter={(value) => {
                                    // Format: 2026-01-14 -> 14 ม.ค.
                                    const date = new Date(value)
                                    const day = date.getDate()
                                    const months = [
                                        'ม.ค.',
                                        'ก.พ.',
                                        'มี.ค.',
                                        'เม.ย.',
                                        'พ.ค.',
                                        'มิ.ย.',
                                        'ก.ค.',
                                        'ส.ค.',
                                        'ก.ย.',
                                        'ต.ค.',
                                        'พ.ย.',
                                        'ธ.ค.',
                                    ]
                                    return `${day} ${months[date.getMonth()]}`
                                }}
                            />

                            {/* Y Axis - Brighter text */}
                            <YAxis
                                stroke="#9CA3AF"
                                fontSize={12}
                                tick={{ fill: '#9CA3AF' }}
                                tickFormatter={(value) => `฿${(value / 1000).toFixed(0)}k`}
                                domain={['auto', 'auto']}
                            />

                            {/* Tooltip */}
                            <Tooltip content={<CustomTooltip />} />

                            {/* Legend */}
                            <Legend
                                verticalAlign="bottom"
                                height={36}
                                wrapperStyle={{ paddingTop: '20px', color: '#9CA3AF' }}
                            />

                            {/* Area for Low-High Range - Brighter Red/Orange Band */}
                            <defs>
                                <linearGradient id="priceRangeGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.5} />
                                    <stop offset="50%" stopColor="#DC2626" stopOpacity={0.35} />
                                    <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>

                            {/* Low Price Area (bottom of band) */}
                            <Area
                                type="monotone"
                                dataKey="low"
                                stroke="none"
                                fill="transparent"
                                name="ราคาต่ำสุด"
                                legendType="none"
                            />

                            {/* High Price Area (creates the band effect) - Brighter stroke */}
                            <Area
                                type="monotone"
                                dataKey="high"
                                stroke="#F87171"
                                strokeWidth={1}
                                fill="url(#priceRangeGradient)"
                                name="ช่วงราคา (Low-High)"
                                fillOpacity={1}
                            />

                            {/* Reference Line: Boundary between Actual and Predicted */}
                            {lastActualDate && (
                                <ReferenceLine
                                    x={lastActualDate}
                                    stroke="#FBBF24"
                                    strokeDasharray="5 5"
                                    strokeWidth={2}
                                    label={{
                                        value: 'ข้อมูลจริง ← | → ทำนาย',
                                        position: 'top',
                                        fill: '#FBBF24',
                                        fontSize: 11,
                                        fontWeight: 'bold',
                                    }}
                                />
                            )}

                            {/* Typical Price Line - Blue */}
                            <Line
                                type="monotone"
                                dataKey="typical"
                                stroke="#60A5FA"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6, fill: '#60A5FA', stroke: '#fff', strokeWidth: 2 }}
                                name="ราคามาตรฐาน"
                            />

                            {/* Low Price Line - Green */}
                            <Line
                                type="monotone"
                                dataKey="low"
                                stroke="#4ADE80"
                                strokeWidth={2}
                                strokeDasharray="3 3"
                                dot={false}
                                name="ราคาถูกสุด"
                                legendType="none"
                            />
                        </ComposedChart>
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-4 flex justify-between text-xs text-muted-foreground border-t border-border pt-3">
                    <span>วันที่เริ่มทำนาย: {lastActualDate ? lastActualDate : 'N/A'}</span>
                    <span>ทำนายล่วงหน้า: 350 วัน ถึง ธันวาคม (XGBoost + วันหยุด)</span>
                </div>
            </CardContent>
        </Card>
    )
}
