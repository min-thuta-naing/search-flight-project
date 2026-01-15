'use client'

import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const destinationsSection = document.getElementById('destinations')
      if (destinationsSection) {
        const rect = destinationsSection.getBoundingClientRect()
        // ตรวจสอบว่า destinations section อยู่ใน viewport หรือผ่านไปแล้ว
        const isInView = rect.top <= window.innerHeight && rect.bottom >= 0
        setIsVisible(isInView)
      }
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // ตรวจสอบทันทีเมื่อ component mount

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button
        onClick={scrollToTop}
        size="lg"
        className="rounded-full w-14 h-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
        style={{ backgroundColor: '#60a5fa' }}
        aria-label="เลื่อนขึ้นข้างบน"
      >
        <ArrowUp className="w-6 h-6" />
      </Button>
    </div>
  )
}

