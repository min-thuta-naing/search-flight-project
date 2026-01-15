import type { Metadata } from 'next'
import { Kanit } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const kanit = Kanit({
  subsets: ['latin', 'thai'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-kanit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Search flight project ค้นหาตั๋วเครื่องบินราคาถูกที่สุด',
  description: 'วิเคราะห์ราคาตั๋วเครื่องบินตามฤดูกาล แนะนำช่วงที่ถูกที่สุดให้คุณ ค้นหาเที่ยวบินที่เหมาะสมกับงบประมาณของคุณ',
  // generator: 'v0.app',
  // icons: {
  //   icon: [
  //     {
  //       url: '/icon-light-32x32.png',
  //       media: '(prefers-color-scheme: light)',
  //     },
  //     {
  //       url: '/icon-dark-32x32.png',
  //       media: '(prefers-color-scheme: dark)',
  //     },
  //     {
  //       url: '/icon.svg',
  //       type: 'image/svg+xml',
  //     },
  //   ],
  //   apple: '/apple-icon.png',
  // },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th">
      <body className={`${kanit.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  )
}
