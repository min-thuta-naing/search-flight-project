/**
 * Mock popular destinations data
 */

export interface PopularDestination {
  province: string
  city: string
  searches: string
  avgPrice: string
  trend: string
  popular: boolean
  image: string
}

export const popularDestinations: PopularDestination[] = [
  {
    province: 'เชียงใหม่',
    city: 'เชียงใหม่',
    searches: '12,450',
    avgPrice: '฿3,500',
    trend: '+15%',
    popular: true,
    image: '/chiang-mai.jpg',
  },
  {
    province: 'ภูเก็ต',
    city: 'ภูเก็ต',
    searches: '9,820',
    avgPrice: '฿3,200',
    trend: '+22%',
    popular: true,
    image: '/phuket.jpg',
  },
  {
    province: 'กระบี่',
    city: 'กระบี่',
    searches: '7,340',
    avgPrice: '฿3,000',
    trend: '+8%',
    popular: false,
    image: '/krabi.jpg',
  },
  {
    province: 'หาดใหญ่',
    city: 'หาดใหญ่ (สงขลา)',
    searches: '6,120',
    avgPrice: '฿2,500',
    trend: '+18%',
    popular: false,
    image: '/hat-yai.jpg',
  },
]

