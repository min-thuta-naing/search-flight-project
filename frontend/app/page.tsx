'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { FlightSearchForm, FlightSearchParams } from '@/components/flight-search-form'
import { PriceAnalysis } from '@/components/price-analysis'
import { PopularDestinations } from '@/components/popular-destinations'
import { FlightStats } from '@/components/flight-stats'
import { ScrollToTopButton } from '@/components/scroll-to-top-button'

export default function HomePage() {
  const [searchParams, setSearchParams] = useState<FlightSearchParams | null>(null)
  const [flightPrices, setFlightPrices] = useState<Array<{
    id: number
    airline_id: number
    airline_code: string
    airline_name: string
    airline_name_th: string
    departure_date: Date | string
    return_date: Date | string | null
    price: number
    base_price: number
    departure_time: string
    arrival_time: string
    duration: number
    flight_number: string
    trip_type: 'one-way' | 'round-trip'
    season: 'high' | 'normal' | 'low'
    origin?: string
    destination?: string
  }> | null>(null)

  const handleSearch = (params: FlightSearchParams) => {
    setSearchParams(params)
    // Scroll to analysis section
    setTimeout(() => {
      const analysisSection = document.getElementById('analysis')
      if (analysisSection) {
        analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section with Search Form */}
      <section id="search" className="relative py-16 overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `url('/planeimg.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        ></div>
        
        {/* Overlay for better text readability - ลด opacity เพื่อให้เห็นรูปภาพมากขึ้น */}
        <div className="absolute inset-0 bg-primary/30 backdrop-blur-[2px]"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4 text-balance drop-shadow-lg">
              {'ค้นหาช่วงเวลาที่ดีที่สุดในการเดินทาง'}
            </h1>
            <p className="text-lg text-primary-foreground/90 text-pretty drop-shadow-md">
              {'วิเคราะห์ราคาตั๋วเครื่องบินตามฤดูกาล แนะนำช่วงที่ถูกที่สุดให้คุณ'}
            </p>
          </div>
          
          <FlightSearchForm onSearch={handleSearch} />
        </div>
      </section>

      {/* Price Analysis Section */}
      <section id="analysis" className="py-12">
        <PriceAnalysis 
          searchParams={searchParams} 
          onFlightPricesChange={setFlightPrices}
        />
      </section>

      {/* Flight Statistics Section */}
      <section className="pt-0 pb-12">
        <div className="container mx-auto px-4 -mt-6">
          <FlightStats />
        </div>
      </section>

      {/* Popular Destinations Section */}
      <section id="destinations" className="py-12 bg-secondary/30">
        <PopularDestinations 
          flightPrices={flightPrices}
          currentSearchParams={searchParams}
          onSearch={handleSearch}
        />
      </section>

      {/* Scroll to Top Button */}
      <ScrollToTopButton />

      {/* Footer */}
      <Footer />
    </main>
  )
}
