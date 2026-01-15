'use client'

import { Plane } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
    e.preventDefault()
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      })
    }
  }

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Plane className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Flight Search</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
          <a 
            href="#search" 
            onClick={(e) => handleNavClick(e, 'search')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'ค้นหา'}
          </a>
          <a 
            href="#analysis" 
            onClick={(e) => handleNavClick(e, 'analysis')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'วิเคราะห์ราคา'}
          </a>
          <a 
            href="#destinations" 
            onClick={(e) => handleNavClick(e, 'destinations')}
            className="text-sm font-medium hover:text-primary transition-all duration-300 hover:translate-y-0.5 active:translate-y-1"
          >
            {'ปลายทางยอดนิยม'}
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            {'เข้าสู่ระบบ'}
          </Button>
          <Button size="sm">
            {'สมัครสมาชิก'}
          </Button>
        </div>
      </div>
    </header>
  )
}
