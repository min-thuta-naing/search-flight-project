# Search Flight Project - โปรเจกต์ค้นหาตั๋วเครื่องบิน

โปรเจกต์เว็บแอปพลิเคชันสำหรับค้นหาและวิเคราะห์ราคาตั๋วเครื่องบินภายในประเทศไทย ช่วยให้ผู้ใช้สามารถค้นหาช่วงเวลาที่ดีที่สุดในการเดินทางและเปรียบเทียบราคาตามฤดูกาล

## ✨ ฟีเจอร์หลัก

- 🔍 **ค้นหาเที่ยวบิน**: ค้นหาเที่ยวบินระหว่างจังหวัดต่างๆ ในประเทศไทย
- 📊 **วิเคราะห์ราคา**: วิเคราะห์ราคาตั๋วเครื่องบินตามฤดูกาลและช่วงเวลา
- 📈 **กราฟราคา**: แสดงกราฟราคาตั๋วเครื่องบินแบบ Interactive
- 🏢 **เลือกสายการบิน**: เลือกสายการบินที่ต้องการให้แสดงในผลการค้นหา
- 📅 **เลือกช่วงเวลา**: เลือกวันที่เดินทางและวันที่กลับ
- 📍 **ปลายทางยอดนิยม**: ดูข้อมูลจังหวัดปลายทางยอดนิยม
- 📊 **สถิติการค้นหา**: ดูสถิติการค้นหาที่ผ่านมา

## 🛠️ เทคโนโลยีที่ใช้

### Frontend Framework
- **Next.js 16.0.3** - React Framework สำหรับ Production
- **React 19.2.0** - UI Library
- **TypeScript 5** - Type Safety

### UI Components
- **Radix UI** - Headless UI Components
- **Tailwind CSS 4.1.9** - Utility-first CSS Framework
- **Lucide React** - Icon Library
- **Recharts** - Chart Library สำหรับแสดงกราฟ

### Form & Validation
- **React Hook Form** - Form Management
- **Zod** - Schema Validation
- **@hookform/resolvers** - Form Validation Resolvers

### Date Handling
- **date-fns 4.1.0** - Date Utility Library
- **react-day-picker 9.8.0** - Date Picker Component

### Other Libraries
- **next-themes** - Theme Management
- **sonner** - Toast Notifications
- **@vercel/analytics** - Analytics

## 📋 ความต้องการของระบบ

- **Node.js** เวอร์ชัน 18.0.0 หรือสูงกว่า
- **npm**, **yarn**, หรือ **pnpm** สำหรับจัดการแพ็กเกจ

## 🚀 การติดตั้ง

### 1. Clone โปรเจกต์

```bash
git clone <repository-url>
cd "search flight project1"
```

### 2. ติดตั้ง Dependencies

ใช้ npm:
```bash
npm install
```

หรือใช้ pnpm:
```bash
pnpm install
```

หรือใช้ yarn:
```bash
yarn install
```

### 3. รันโปรเจกต์ในโหมด Development

```bash
npm run dev
```

หรือ

```bash
pnpm dev
```

หรือ

```bash
yarn dev
```

แอปพลิเคชันจะรันที่ [http://localhost:3000](http://localhost:3000)

## 📖 วิธีใช้งาน

### 1. เปิดเว็บไซต์
เปิดเบราว์เซอร์และไปที่ `http://localhost:3000`

### 2. ค้นหาเที่ยวบิน

#### ขั้นตอนที่ 1: เลือกจังหวัดต้นทาง
- คลิกที่ dropdown "จังหวัดต้นทาง"
- เลือกจังหวัดที่ต้องการ (ค่าเริ่มต้นคือ กรุงเทพมหานคร)

#### ขั้นตอนที่ 2: เลือกจังหวัดปลายทาง
- คลิกที่ dropdown "จังหวัดปลายทาง"
- เลือกจังหวัดปลายทางที่ต้องการเดินทาง

#### ขั้นตอนที่ 3: เลือกวันที่เดินทาง
- คลิกที่ปุ่ม "เลือกวันที่"
- เลือกวันที่ไปและวันที่กลับในปฏิทิน
- สามารถเลือกช่วงเวลาได้สูงสุด 2 เดือนล่วงหน้า

#### ขั้นตอนที่ 4: เลือกสายการบิน (Optional)
- คลิกที่ Badge ของสายการบินที่ต้องการให้แสดงในผลการค้นหา
- สายการบินที่เลือกจะมีพื้นหลังสีเข้ม
- คลิกที่ Badge อีกครั้งเพื่อยกเลิกการเลือก
- คลิก "เลือกทั้งหมด" เพื่อเลือกทุกสายการบิน
- คลิก "ยกเลิกทั้งหมด" เพื่อยกเลิกการเลือกทั้งหมด
- **หมายเหตุ**: ต้องเลือกอย่างน้อย 1 สายการบิน

#### ขั้นตอนที่ 5: คลิกปุ่ม "ค้นหา"
- หลังจากกรอกข้อมูลครบถ้วนแล้ว คลิกปุ่ม "ค้นหา"
- ระบบจะแสดงผลการวิเคราะห์ราคาในส่วนด้านล่าง

### 3. ดูผลการวิเคราะห์

หลังจากค้นหาแล้ว คุณจะเห็น:

- **กราฟราคา**: แสดงราคาตั๋วเครื่องบินตามช่วงเวลา
- **การวิเคราะห์ราคา**: ข้อมูลราคาเฉลี่ย, ราคาสูงสุด, ราคาต่ำสุด
- **การแยกตามฤดูกาล**: ราคาตามฤดูกาลต่างๆ
- **รายการเที่ยวบิน**: รายการเที่ยวบินที่ตรงตามเงื่อนไข

### 4. ดูสถิติการค้นหา

- ระบบจะบันทึกสถิติการค้นหาของคุณไว้ใน Local Storage
- สามารถดูสถิติการค้นหาที่ผ่านมาได้ในส่วน "สถิติการค้นหา"

### 5. ดูปลายทางยอดนิยม

- เลื่อนลงไปดูส่วน "ปลายทางยอดนิยม"
- จะแสดงจังหวัดปลายทางที่ได้รับความนิยมพร้อมรูปภาพ

## 📁 โครงสร้างโปรเจกต์

```
search flight project1/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global Styles
│   ├── layout.tsx         # Root Layout
│   └── page.tsx           # Home Page
├── components/            # React Components
│   ├── ui/               # UI Components (shadcn/ui)
│   ├── airline-flights.tsx
│   ├── flight-search-form.tsx
│   ├── flight-stats.tsx
│   ├── header.tsx
│   ├── popular-destinations.tsx
│   ├── price-analysis.tsx
│   ├── price-chart.tsx
│   └── seasonal-breakdown.tsx
├── lib/                  # Utility Functions
│   ├── flight-analysis.ts
│   ├── stats.ts
│   └── utils.ts
├── hooks/                # Custom Hooks
│   ├── use-mobile.ts
│   └── use-toast.ts
├── public/               # Static Assets
│   ├── *.jpg            # Destination Images
│   └── *.png            # Icons
├── styles/               # Additional Styles
│   └── globals.css
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript Config
├── next.config.mjs       # Next.js Config
└── README.md            # Documentation
```

## 🎯 Scripts ที่ใช้ได้

### Development
```bash
npm run dev
```
รันโปรเจกต์ในโหมด development ที่ `http://localhost:3000`

### Build
```bash
npm run build
```
สร้าง production build ของโปรเจกต์

### Start
```bash
npm start
```
รัน production server (ต้อง build ก่อน)

### Lint
```bash
npm run lint
```
ตรวจสอบโค้ดด้วย ESLint

## 🌐 จังหวัดที่รองรับ

โปรเจกต์รองรับการค้นหาเที่ยวบินระหว่างจังหวัดต่างๆ ในประเทศไทย รวม 20 จังหวัด:

- กรุงเทพมหานคร
- เชียงใหม่
- ภูเก็ต
- กระบี่
- เกาะสมุย
- พัทยา (ชลบุรี)
- หาดใหญ่ (สงขลา)
- อุดรธานี
- ขอนแก่น
- นครราชสีมา
- สุราษฎร์ธานี
- ตรัง
- สุรินทร์
- อุบลราชธานี
- นครสวรรค์
- ลำปาง
- แม่ฮ่องสอน
- น่าน
- พิษณุโลก
- สุโขทัย

## ✈️ สายการบินที่รองรับ

- Thai Airways
- Thai AirAsia
- Thai AirAsia X
- Thai Lion Air
- Thai Vietjet Air
- Bangkok Airways
- Nok Air

## 📝 หมายเหตุ

- ข้อมูลราคาในโปรเจกต์นี้เป็นข้อมูลตัวอย่าง (Mock Data) สำหรับการทดสอบ
- การค้นหาจะบันทึกสถิติไว้ใน Local Storage ของเบราว์เซอร์
- โปรเจกต์ใช้ TypeScript เพื่อความปลอดภัยของโค้ด
- UI Components ใช้ shadcn/ui ที่สร้างจาก Radix UI

## 🔧 การปรับแต่ง

### เปลี่ยน Port
แก้ไขไฟล์ `package.json`:
```json
"scripts": {
  "dev": "next dev -p 3001"
}
```

### ปรับแต่ง Theme
แก้ไขไฟล์ `app/globals.css` หรือใช้ Theme Provider

## 📄 License

โปรเจกต์นี้เป็นโปรเจกต์ส่วนตัวสำหรับการศึกษาและทดสอบ

## 👨‍💻 ผู้พัฒนา

สร้างด้วย Next.js และ React

---

**Happy Searching! 🛫**

