'use client'

import { Plus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface FaqDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Configuration สำหรับเส้นใต้หัวข้อ - สามารถปรับสีได้ที่นี่
const underlineConfig = {
  // สี gradient ของเส้นใต้หัวข้อ - ใช้ CSS color values
  // ตัวอย่าง:
  // - Blue to Purple: { from: '#93c5fd', via: '#60a5fa', to: '#a855f7' } (blue-300 via blue-400 to purple-500)
  // - Green to Blue: { from: '#86efac', via: '#4ade80', to: '#3b82f6' } (green-300 via green-400 to blue-500)
  // - Orange to Red: { from: '#fdba74', via: '#fb923c', to: '#ef4444' } (orange-300 via orange-400 to red-500)
  // - Pink to Purple: { from: '#f9a8d4', via: '#f472b6', to: '#a855f7' } (pink-300 via pink-400 to purple-500)
  gradient: {
    from: '#93c5fd',  // blue-300
    via: '#93c5fd',   // blue-400
    to: '#93c5fd',    // purple-500
  },
  // ความสูงของเส้น
  height: 'h-0.5',
  // ความกว้างของเส้น (ใช้ Tailwind classes หรือ custom width)
  width: 'w-64',
}

const faqItems = [
  {
    question: 'ระบบนี้ทำงานยังไง?',
    answer: 'ระบบทำการวิเคราะห์ราคาตั๋วเครื่องบินจากข้อมูลเที่ยวบินจริง และแนะนำช่วงเวลาที่มีแนวโน้มราคาถูกที่สุด ตามปลายทางและระยะเวลาการเดินทางที่ผู้ใช้กำหนด โดยอ้างอิงจากสถิติราคาตั๋วในแต่ละฤดูกาล',
  },
  {
    question: 'ใช้ข้อมูลอะไรประกอบการคำนวณราคา?',
    answer: 'ระบบใช้ข้อมูลเที่ยวบินจริงจากสายการบินต่าง ๆ ร่วมกับสถิติราคาเฉลี่ยในแต่ละฤดูกาล (High / Low / Normal Season) เพื่อนำมาวิเคราะห์และแนะนำช่วงเวลาที่เหมาะสมที่สุด',
  },
  {
    question: 'ระบบแบ่ง High / Low / Normal Season ตามอะไร?',
    answer: 'การแบ่งฤดูกาลพิจารณาจากสถิติราคาตั๋วเครื่องบินในแต่ละเดือน โดยอ้างอิงจากราคาเฉลี่ย ปริมาณการเดินทาง และปัจจัยอื่น ๆ ที่มีผลต่อการเปลี่ยนแปลงของราคาตั๋ว',
  },
  {
    question: 'ถ้าฉันอยากไปจังหวัดหนึ่ง แต่ยังไม่รู้ช่วงวันที่ชัดเจน จะใช้ได้ไหม?',
    answer: 'สามารถใช้งานได้ โดยผู้ใช้สามารถเลือกปลายทางและระบุระยะเวลาการเดินทาง (เช่น 5–7 วัน) ระบบจะทำการวิเคราะห์และแนะนำช่วงเวลาที่เหมาะสมที่สุดให้โดยอัตโนมัติ',
  },
  {
    question: 'ระบบมีตัวเลือกให้คัดสายการบินที่ไม่ต้องการออกไหม?',
    answer: 'ผู้ใช้สามารถเลือกเฉพาะสายการบินที่ต้องการ หรือยกเว้นสายการบินที่ไม่ต้องการได้ โดยระบบจะแสดงผลการค้นหาตามเงื่อนไขที่กำหนด',
  },
  {
    question: 'มีการเก็บข้อมูลอะไรจากผู้ใช้บ้าง?',
    answer: 'ระบบจัดเก็บเฉพาะข้อมูลการค้นหาเพื่อนำไปใช้ในการวิเคราะห์และปรับปรุงคุณภาพการแนะนำราคาเท่านั้น โดยไม่มีการเก็บข้อมูลส่วนบุคคลที่สามารถระบุตัวตนของผู้ใช้ได้',
  },
  {
    question: 'ระบบคิดราคาตั๋วไป-กลับยังไง?',
    answer: 'ระบบคำนวณราคารวมจากเที่ยวบินขาไปและขากลับ และแสดงราคาไป-กลับในรูปแบบราคารวม พร้อมเปรียบเทียบกับช่วงเวลาอื่น ๆ เพื่อช่วยให้ผู้ใช้เห็นภาพรวมของราคาได้ชัดเจน',
  },
  {
    question: 'ระบบสามารถบอกได้ไหมว่าควรไปก่อนหรือหลังช่วงนี้?',
    answer: 'ระบบจะแสดงการเปรียบเทียบราคาหากเดินทางก่อนหรือหลังช่วงเวลาที่เลือก พร้อมแสดงราคาและเปอร์เซ็นต์ความแตกต่าง เพื่อช่วยในการตัดสินใจ',
  },
  {
    question: 'ข้อมูลราคาอัปเดตบ่อยแค่ไหน?',
    answer: 'ข้อมูลราคามีการอัปเดตอย่างสม่ำเสมอจากแหล่งข้อมูลจริง เพื่อให้ผู้ใช้ได้รับข้อมูลที่ทันสมัยและมีความแม่นยำสูงที่สุด',
  },
  {
    question: 'มีค่าใช้จ่ายไหม?',
    answer: 'ไม่มีค่าใช้จ่าย ระบบให้บริการฟรีสำหรับผู้ใช้ทุกคน เพื่อช่วยในการวางแผนการเดินทางอย่างคุ้มค่า',
  },
]

export function FaqDialog({ open, onOpenChange }: FaqDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[50vw] w-[90vw] max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>คำถามที่พบบ่อย (FAQ)</DialogTitle>
        </DialogHeader>
        {/* Main Content Section */}
        <div className="px-6 py-8 bg-white">
          {/* Main Title */}
          <div className="text-left mb-8">
            <h1 className="text-3xl font-bold text-primary mb-2 drop-shadow-sm">
              คำถามที่พบบ่อย (FAQ)
            </h1>
            <div 
              className={`${underlineConfig.height} ${underlineConfig.width} rounded-full`}
              style={{
                background: `linear-gradient(to right, ${underlineConfig.gradient.from}, ${underlineConfig.gradient.via}, ${underlineConfig.gradient.to})`
              }}
            ></div>
          </div>

          {/* FAQ Accordion */}
          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqItems.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-none"
              >
                <AccordionTrigger className="bg-primary text-white hover:bg-primary/90 rounded-lg px-4 py-4 hover:no-underline [&>svg:nth-child(2)]:hidden [&[data-state=open]>svg:last-child]:rotate-45">
                  <span className="flex-1 text-left pr-4">{item.question}</span>
                  <Plus className="w-5 h-5 text-white shrink-0 transition-transform duration-200" />
                </AccordionTrigger>
                <AccordionContent className="px-4 py-4 bg-white text-foreground rounded-b-lg border-l border-r border-b border-primary/20">
                  <p className="leading-relaxed">{item.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </DialogContent>
    </Dialog>
  )
}
