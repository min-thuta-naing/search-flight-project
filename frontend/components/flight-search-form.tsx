'use client'

import { useState } from 'react'
import { Search, Calendar as CalendarIcon, ArrowLeftRight, User, Users, Baby, ChevronUp, Plus, Minus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { format } from 'date-fns'
import { DateRange } from 'react-day-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PROVINCES, THAI_AIRLINES } from '@/services/data/constants'
import { statisticsApi } from '@/lib/api/statistics-api'

export interface FlightSearchParams {
  origin: string
  originName: string
  destination: string
  destinationName: string
  durationRange: { min: number; max: number }
  selectedAirlines: string[]
  startDate?: Date
  endDate?: Date
  tripType?: 'one-way' | 'round-trip' | null
  passengerCount?: number
  passengers?: {
    adults: number
    children: number
    infants: number
  }
  travelClass?: 'economy' | 'business' | 'first'
}

interface FlightSearchFormProps {
  onSearch?: (params: FlightSearchParams) => void
}



export function FlightSearchForm({ onSearch }: FlightSearchFormProps) {
  const { toast } = useToast()
  const [origin, setOrigin] = useState('bangkok')
  const [destination, setDestination] = useState('')
  const [tripType, setTripType] = useState<'one-way' | 'round-trip'>('one-way') // Default to one-way
  const [departureDate, setDepartureDate] = useState<Date | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  })
  const [passengers, setPassengers] = useState({
    adults: 1,
    children: 0,
    infants: 0,
  })
  const [travelClass, setTravelClass] = useState<'economy' | 'business' | 'first'>('economy')
  const [isPassengerDialogOpen, setIsPassengerDialogOpen] = useState(false)
  const [errors, setErrors] = useState<{
    destination?: string
    passengerCount?: string
    departureDate?: string
    dateRangeFrom?: string
    dateRangeTo?: string
  }>({})

  // Handle trip type change
  const handleTripTypeChange = (type: 'one-way' | 'round-trip') => {
    setTripType(type)
    // Clear the other type's data when switching
    if (type === 'one-way') {
      setDateRange({ from: undefined, to: undefined })
    } else {
      setDepartureDate(undefined)
    }
  }

  // Handle swap origin and destination
  const handleSwapOriginDestination = () => {
    const tempOrigin = origin
    setOrigin(destination)
    setDestination(tempOrigin)
  }

  // Handle one-way date selection
  const handleDepartureDateSelect = (date: Date | undefined) => {
    setDepartureDate(date)
    if (errors.departureDate) {
      setErrors(prev => ({ ...prev, departureDate: undefined }))
    }
  }

  // Handle destination change
  const handleDestinationChange = (value: string) => {
    setDestination(value)
    if (errors.destination) {
      setErrors(prev => ({ ...prev, destination: undefined }))
    }
  }

  // Calculate total passengers
  const totalPassengers = passengers.adults + passengers.children + passengers.infants

  // Format passenger summary text
  const getPassengerSummary = () => {
    const parts: string[] = []
    if (passengers.adults > 0) {
      parts.push(`${passengers.adults} ${passengers.adults === 1 ? 'ผู้ใหญ่' : 'ผู้ใหญ่'}`)
    }
    if (passengers.children > 0) {
      parts.push(`${passengers.children} ${passengers.children === 1 ? 'เด็ก' : 'เด็ก'}`)
    }
    if (passengers.infants > 0) {
      parts.push(`${passengers.infants} ${passengers.infants === 1 ? 'ทารก' : 'ทารก'}`)
    }
    const passengerText = parts.length > 0 ? parts.join(', ') : '1 ผู้ใหญ่'
    
    // Add travel class
    const classNames: Record<string, string> = {
      economy: 'ชั้นประหยัด',
      business: 'ชั้นธุรกิจ',
      first: 'ชั้นหนึ่ง',
    }
    const className = classNames[travelClass] || 'ชั้นประหยัด'
    
    return `${passengerText} - ${className}`
  }

  // Check if can add more passengers (max 7 total)
  const canAddPassenger = (type: 'adults' | 'children' | 'infants') => {
    const currentTotal = totalPassengers
    if (currentTotal >= 7) return false
    
    // Must have at least 1 adult before adding children or infants
    if ((type === 'children' || type === 'infants') && passengers.adults === 0) {
      return false
    }
    
    // Special check for infants - cannot exceed adults
    if (type === 'infants' && passengers.infants >= passengers.adults) {
      return false
    }
    
    return true
  }

  // Handle passenger increment/decrement
  const handlePassengerChange = (type: 'adults' | 'children' | 'infants', delta: number) => {
    setPassengers(prev => {
      const newValue = Math.max(0, prev[type] + delta)
      
      // Must have at least 1 adult at all times
      if (type === 'adults' && newValue === 0) {
        // Cannot reduce adults to 0 if there are children or infants
        if (prev.children > 0 || prev.infants > 0) {
          return prev
        }
        // Cannot reduce to 0 even if no children/infants (must have at least 1)
        return prev
      }
      
      // Cannot add children or infants without at least 1 adult
      if ((type === 'children' || type === 'infants') && prev.adults === 0 && delta > 0) {
        return prev
      }
      
      // Infants cannot exceed adults
      if (type === 'infants' && newValue > prev.adults) {
        return prev
      }
      
      // Check total passengers limit (max 7)
      const currentTotal = prev.adults + prev.children + prev.infants
      const newTotal = currentTotal - prev[type] + newValue
      if (newTotal > 7) {
        return prev
      }
      
      return { ...prev, [type]: newValue }
    })
    if (errors.passengerCount) {
      setErrors(prev => ({ ...prev, passengerCount: undefined }))
    }
  }

  // Helper function to check if date is in the past (only date comparison, not time)
  const isPastDate = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Handle round-trip date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    // ถ้าเลือกวันเดียวกัน ให้ clear to date
    if (range?.from && range?.to) {
      const fromDate = new Date(range.from)
      const toDate = new Date(range.to)
      fromDate.setHours(0, 0, 0, 0)
      toDate.setHours(0, 0, 0, 0)
      
      // ถ้าวันเดียวกัน ให้ clear to date
      if (fromDate.getTime() === toDate.getTime()) {
        setDateRange({ from: range.from, to: undefined })
        setErrors(prev => ({ ...prev, dateRangeFrom: undefined, dateRangeTo: undefined }))
        return
      }
    }
    
    setDateRange(range)
    if (range?.from && errors.dateRangeFrom) {
      setErrors(prev => ({ ...prev, dateRangeFrom: undefined }))
    }
    if (range?.to && errors.dateRangeTo) {
      setErrors(prev => ({ ...prev, dateRangeTo: undefined }))
    }
  }

  const handleSearch = () => {
    const newErrors: typeof errors = {}
    let hasError = false
    
    if (!destination) {
      newErrors.destination = 'เพิ่มจังหวัดปลายทาง'
      hasError = true
    }
    
    if (totalPassengers === 0) {
      newErrors.passengerCount = 'เพิ่มจำนวนผู้โดยสาร'
      hasError = true
    }
    
    if (tripType === 'one-way' && !departureDate) {
      newErrors.departureDate = 'เพิ่มวันที่ออกเดินทาง'
      hasError = true
    }
    
    if (tripType === 'round-trip') {
      if (!dateRange?.from) {
        newErrors.dateRangeFrom = 'เพิ่มวันที่ออกเดินทาง'
        hasError = true
      }
      
      if (!dateRange?.to) {
        newErrors.dateRangeTo = 'เพิ่มวันที่กลับ'
        hasError = true
      }
      
      if (dateRange?.from && dateRange?.to) {
        const fromDate = new Date(dateRange.from)
        const toDate = new Date(dateRange.to)
        fromDate.setHours(0, 0, 0, 0)
        toDate.setHours(0, 0, 0, 0)
        if (fromDate.getTime() === toDate.getTime()) {
          newErrors.dateRangeTo = 'เลือกวันที่กลับที่ต่างจากวันที่ไป'
          hasError = true
        }
      }
    }
    
    if (hasError) {
      setErrors(newErrors)
      return
    }
    
    setErrors({})
    
    const originData = PROVINCES.find(c => c.value === origin) || { value: 'bangkok', label: 'กรุงเทพมหานคร', airportCode: 'BKK' }
    const destinationData = PROVINCES.find(c => c.value === destination)
    
    // Calculate duration in days
    let min = 3
    let max = 5
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (tripType === 'round-trip' && dateRange?.from && dateRange?.to) {
      // ใช้ข้อมูลไป-กลับ (ต้องมีทั้ง from และ to)
      startDate = dateRange.from
    const diffTime = Math.abs(dateRange.to.getTime() - dateRange.from.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      min = Math.max(3, diffDays - 2)
      max = diffDays + 2
      endDate = dateRange.to
    } else if (tripType === 'one-way' && departureDate) {
      // ใช้ข้อมูลไปอย่างเดียว (default 3-5 วัน)
      startDate = departureDate
      endDate = undefined
    }
    
    const searchParams: FlightSearchParams = {
      origin: origin || 'bangkok',
      originName: originData.label,
      destination,
      destinationName: destinationData?.label || '',
      durationRange: { min, max },
      selectedAirlines: [], // Default: ไม่เลือกสายการบิน (แสดงทั้งหมด)
      startDate,
      endDate,
      tripType,
      passengerCount: totalPassengers,
      passengers: {
        adults: passengers.adults,
        children: passengers.children,
        infants: passengers.infants,
      },
      travelClass: travelClass as 'economy' | 'business' | 'first',
    }

    console.log('===== Flight Search Debug =====')
    console.log('Origin:', origin, originData)
    console.log('Destination:', destination, destinationData)
    console.log('Trip Type:', tripType)
    console.log('Passengers:', passengers)
    console.log('Total Passengers:', totalPassengers)
    console.log('Travel Class:', travelClass)
    console.log('Departure Date:', departureDate)
    console.log('Date Range:', dateRange)
    console.log('Final searchParams:', searchParams)
    console.log('===============================')


    // Debug: Log travel class before sending to onSearch
    console.log('[FlightSearchForm] Sending searchParams with travelClass:', {
      travelClass: searchParams.travelClass,
      travelClassState: travelClass,
      searchParamsKeys: Object.keys(searchParams),
    });
    
    onSearch?.(searchParams)
    
    // Save to statistics (backend database) - non-blocking, don't wait for response
    if (typeof window !== 'undefined') {
      // Fire and forget - don't block the UI
      statisticsApi.saveSearch({
        origin: origin,
        originName: originData.label,
        destination: destination,
        destinationName: destinationData?.label || '',
        durationRange: `${min}-${max}`,
        tripType: tripType || null,
      }).then(() => {
        // Dispatch custom event to notify stats component to refresh immediately
        window.dispatchEvent(new CustomEvent('flightSearchCompleted'))
      }).catch((error) => {
        // Silently fail - don't show error to user
        console.error('Failed to save search statistics to backend:', error);
        // Fallback to localStorage if API fails
        try {
          const stats = JSON.parse(localStorage.getItem('flightStats') || '{"searches": [], "prices": []}');
          stats.searches.push({
            origin: origin,
            originName: originData.label,
            destination: destination,
            destinationName: destinationData?.label || '',
            durationRange: `${min}-${max}`,
            tripType: tripType || null,
            timestamp: new Date().toISOString(),
          });
          // Keep only last 1000 search records to avoid localStorage overflow
          if (stats.searches.length > 1000) {
            stats.searches = stats.searches.slice(-1000);
          }
          // Ensure prices array exists
          if (!stats.prices) {
            stats.prices = [];
          }
          localStorage.setItem('flightStats', JSON.stringify(stats));
        } catch (localStorageError) {
          console.error('Failed to save to localStorage:', localStorageError);
        }
      });
    }
  }

  return (
    <Card className="p-8 bg-background/80 shadow-xl max-w-7xl mx-auto overflow-hidden">
      {/* Trip Type Selection Tags */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={tripType === 'one-way' ? 'default' : 'outline'}
          onClick={() => handleTripTypeChange('one-way')}
          className="px-6 py-2"
        >
          เที่ยวเดียว
        </Button>
        <Button
          variant={tripType === 'round-trip' ? 'default' : 'outline'}
          onClick={() => handleTripTypeChange('round-trip')}
          className="px-6 py-2"
        >
          ไป-กลับ
        </Button>
      </div>

      <div className="flex items-end gap-3 mb-4 min-w-0">
        {/* Origin, Swap, Destination Group */}
        <div className="flex items-end gap-3 flex-[2] min-w-0">
          <div className="space-y-1.5 flex-1 min-w-0">
            <Label htmlFor="origin" className="text-sm font-medium text-gray-700">{'จังหวัดต้นทาง'}</Label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger id="origin" className="bg-white border-gray-300 w-full !h-14 !min-h-[56px] min-w-0">
                <SelectValue placeholder="เลือกจังหวัด" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.map((province) => (
                  <SelectItem key={province.value} value={province.value}>
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Swap Button */}
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSwapOriginDestination}
            className="rounded-full bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400 transition-colors flex-shrink-0 h-14 w-14 mb-0"
            title="สลับจังหวัดต้นทางและปลายทาง"
          >
            <ArrowLeftRight className="h-4 w-4 text-gray-600" />
          </Button>

          <div className="relative flex-1 min-w-0">
            <Label htmlFor="destination" className="text-sm font-medium text-gray-700 mb-1.5 block">
              {'จังหวัดปลายทาง'}
            </Label>
            <Select value={destination} onValueChange={handleDestinationChange}>
              <SelectTrigger 
                id="destination" 
                aria-invalid={!!errors.destination}
                className={`bg-white w-full !h-14 !min-h-[56px] min-w-0 ${
                  errors.destination 
                    ? 'border-[#ff6b35] focus-visible:border-[#ff6b35] focus-visible:ring-[#ff6b35]/50' 
                    : 'border-gray-300'
                }`}
              >
                <SelectValue placeholder="เลือกจังหวัด" />
              </SelectTrigger>
              <SelectContent>
                {PROVINCES.filter(c => c.value !== origin).map((province) => (
                  <SelectItem key={province.value} value={province.value}>
                    {province.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.destination && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <div className="absolute -top-1 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#ff6b35]" />
                <div className="bg-[#ff6b35] text-white px-4 py-2 rounded text-sm font-medium">
                  {errors.destination}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* One-way Date Picker */}
        {tripType === 'one-way' && (
          <div className="relative flex-1 min-w-0">
            <Label htmlFor="departure-date" className="text-sm font-medium text-gray-700 mb-1.5 block">{'เลือกวันที่ไป'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="departure-date"
                  variant="outline"
                  aria-invalid={!!errors.departureDate}
                  className={`bg-white justify-start text-left font-normal text-sm overflow-hidden w-full h-14 ${
                    errors.departureDate 
                      ? 'border-[#ff6b35] focus-visible:border-[#ff6b35] focus-visible:ring-[#ff6b35]/50' 
                      : 'border-gray-300'
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {departureDate ? (
                      format(departureDate, 'dd/MM/yyyy')
                    ) : (
                      <span className="text-muted-foreground">{'เลือกวันที่'}</span>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={departureDate}
                  onSelect={handleDepartureDateSelect}
                  disabled={(date) => isPastDate(date)}
                />
              </PopoverContent>
            </Popover>
            {errors.departureDate && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <div className="absolute -top-1 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#ff6b35]" />
                <div className="bg-[#ff6b35] text-white px-4 py-2 rounded text-sm font-medium">
                  {errors.departureDate}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Round-trip Date Range Picker */}
        {tripType === 'round-trip' && (
          <div className="relative flex-1 min-w-0">
            <Label htmlFor="date-range" className="text-sm font-medium text-gray-700 mb-1.5 block">{'เลือกวันที่ไป-กลับ'}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date-range"
                  variant="outline"
                  aria-invalid={!!(errors.dateRangeFrom || errors.dateRangeTo)}
                  className={`bg-white justify-start text-left font-normal text-sm overflow-hidden w-full h-14 ${
                    errors.dateRangeFrom || errors.dateRangeTo
                      ? 'border-[#ff6b35] focus-visible:border-[#ff6b35] focus-visible:ring-[#ff6b35]/50' 
                      : 'border-gray-300'
                  }`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'dd/MM/yyyy')} -{' '}
                          {format(dateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      <span className="text-muted-foreground">{'เลือกวันที่'}</span>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  numberOfMonths={2}
                  disabled={(date) => isPastDate(date)}
                />
              </PopoverContent>
            </Popover>
            {(errors.dateRangeFrom || errors.dateRangeTo) && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1">
                <div className="absolute -top-1 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#ff6b35]" />
                <div className="bg-[#ff6b35] text-white px-4 py-2 rounded text-sm font-medium">
                  {errors.dateRangeFrom || errors.dateRangeTo}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="relative flex-1 min-w-0">
          <Label htmlFor="passengers" className="text-sm font-medium text-gray-700 mb-1.5 block">{'จำนวนผู้โดยสาร'}</Label>
          <Dialog open={isPassengerDialogOpen} onOpenChange={setIsPassengerDialogOpen}>
            <DialogTrigger asChild>
              <Button
                id="passengers"
                variant="outline"
                aria-invalid={!!errors.passengerCount}
                className={`bg-white justify-between text-left font-normal text-sm w-full h-14 ${
                  errors.passengerCount 
                    ? 'border-[#ff6b35] focus-visible:border-[#ff6b35] focus-visible:ring-[#ff6b35]/50' 
                    : 'border-gray-300'
                }`}
              >
                <span className="truncate">{getPassengerSummary()}</span>
                <ChevronUp className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>จำนวนผู้โดยสาร</DialogTitle>
              </DialogHeader>
              
              {totalPassengers >= 7 && (
                <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-2 rounded text-sm">
                  ถึงขีดจำกัดสูงสุด 7 คนแล้ว
                </div>
              )}
              {totalPassengers < 7 && (
                <div className="text-sm text-gray-500 px-1">
                  เหลืออีก {7 - totalPassengers} ที่ (สูงสุด 7 คน)
                </div>
              )}
              
              <div className="space-y-6 py-4">
                {/* Adults */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <User className="h-6 w-6 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">ผู้ใหญ่</div>
                      <div className="text-sm text-gray-500">อายุ 12 ปีขึ้นไป</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => handlePassengerChange('adults', -1)}
                      disabled={passengers.adults <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium text-gray-900 underline">
                      {passengers.adults}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handlePassengerChange('adults', 1)}
                      disabled={!canAddPassenger('adults')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Users className="h-6 w-6 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">เด็ก</div>
                      <div className="text-sm text-gray-500">อายุ 2 - 11 ปี</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => handlePassengerChange('children', -1)}
                      disabled={passengers.children === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium text-gray-900 underline">
                      {passengers.children}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handlePassengerChange('children', 1)}
                      disabled={!canAddPassenger('children')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Baby className="h-6 w-6 text-gray-600" />
                    <div>
                      <div className="font-medium text-gray-900">ทารก (บนตัก)</div>
                      <div className="text-sm text-gray-500">อายุต่ำกว่า 2 ปี</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => handlePassengerChange('infants', -1)}
                      disabled={passengers.infants === 0}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-8 text-center font-medium text-gray-900 underline">
                      {passengers.infants}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-blue-500 text-blue-500 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handlePassengerChange('infants', 1)}
                      disabled={!canAddPassenger('infants')}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Travel Class */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 mb-2">ชั้นโดยสาร</div>
                  </div>
                  <Select value={travelClass} onValueChange={setTravelClass}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="เลือกชั้นโดยสาร" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="economy">ชั้นประหยัด</SelectItem>
                      <SelectItem value="business">ชั้นธุรกิจ</SelectItem>
                      <SelectItem value="first">ชั้นหนึ่ง</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => setIsPassengerDialogOpen(false)}
                  className="w-full text-white hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: '#0055a4' }}
                >
                  เสร็จสิ้น
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {errors.passengerCount && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1">
              <div className="absolute -top-1 left-4 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-l-transparent border-r-transparent border-b-[#ff6b35]" />
              <div className="bg-[#ff6b35] text-white px-4 py-2 rounded text-sm font-medium">
                {errors.passengerCount}
              </div>
            </div>
          )}
        </div>

        {/* Search Button */}
        <div className="flex items-end flex-1 min-w-0">
          <Button 
            onClick={handleSearch} 
            className="!h-14 !min-h-[56px] px-10 w-full text-base font-semibold min-w-0"
          >
            <Search className="w-5 h-5 mr-2" />
            {'ค้นหา'}
          </Button>
        </div>
        </div>

    </Card>
  )
}


