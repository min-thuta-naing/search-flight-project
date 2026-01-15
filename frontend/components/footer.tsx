'use client'

import { useState } from 'react'
import { Plane } from 'lucide-react'
import Link from 'next/link'
import { AboutUsDialog } from '@/components/about-us-dialog'
import { FaqDialog } from '@/components/faq-dialog'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const [aboutUsOpen, setAboutUsOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(false)

  return (
    <footer className="mt-auto">
      {/* Main Footer Section - Dark Blue Background */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
            {/* Left Section - Branding */}
            <div className="flex items-center gap-4 md:pl-30">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Plane className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold text-white">
                Flight Search
              </span>
            </div>

            {/* Center Section - Social Media Icons - ซ่อนไว้ชั่วคราว */}
            {/* Empty div เพื่อรักษา layout */}
            <div className="hidden md:block"></div>

            {/* Right Section - Navigation Links */}
            <div className="flex flex-col gap-2 md:pl-30">
              <h3 className="text-lg font-semibold text-white mb-2">
                ข้อมูล และ ความช่วยเหลือ
              </h3>
              <button
                onClick={() => setAboutUsOpen(true)}
                className="text-left text-white/90 hover:text-white transition-colors"
              >
                เกี่ยวกับเรา
              </button>
              <button
                onClick={() => setFaqOpen(true)}
                className="text-left text-white/90 hover:text-white transition-colors"
              >
                คำถามที่พบบ่อย
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Section */}
      <div className="bg-background py-4">
        <div className="container mx-auto px-4">
          <p className="text-center text-muted-foreground text-sm">
            © {currentYear} Search Flight Project. All rights reserved.
          </p>
        </div>
      </div>

      {/* About Us Dialog */}
      <AboutUsDialog open={aboutUsOpen} onOpenChange={setAboutUsOpen} />

      {/* FAQ Dialog */}
      <FaqDialog open={faqOpen} onOpenChange={setFaqOpen} />
    </footer>
  )
}
