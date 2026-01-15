# Tests Directory

โฟลเดอร์นี้เก็บไฟล์ทดสอบทั้งหมดสำหรับระบบ Flight Search

## โครงสร้าง

```
tests/
├── unit/                          # Unit tests
│   └── flightAnalysisService.priceConsistency.test.ts
├── integration/                    # Integration tests
│   └── flightController.priceConsistency.test.ts
├── setup.ts                       # Test setup file
├── PRICE_CONSISTENCY_CHECKLIST.md  # Manual test checklist
└── README.md                      # This file
```

## การรัน Tests

### รัน Unit Tests
```bash
npm run test:price-consistency
```

### รัน Integration Tests
```bash
npm run test:integration:price-consistency
```

### รัน Validation Script
```bash
npm run validate:prices
```

### รัน Tests ทั้งหมด
```bash
npm test
```

## Price Consistency Tests

### Unit Tests
ทดสอบความสอดคล้องของราคาในระดับ service:
- Recommended Period vs Best Deal
- Price Comparison calculations
- One-way vs Round-trip conversions
- Travel class multipliers
- Passenger count multipliers
- Season price range consistency
- Savings calculations

### Integration Tests
ทดสอบความสอดคล้องของราคาผ่าน API endpoints:
- `/api/flights/analyze`
- `/api/flights/prices`
- Cross-endpoint consistency

### Validation Script
Script สำหรับตรวจสอบความสอดคล้องของราคาแบบอัตโนมัติ:
- รัน test cases หลายแบบ
- รายงาน errors และ warnings
- ใช้สำหรับ CI/CD pipeline

## Manual Test Checklist

ดู `PRICE_CONSISTENCY_CHECKLIST.md` สำหรับรายการตรวจสอบแบบ manual

## การ Setup

1. ติดตั้ง dependencies:
```bash
npm install
```

2. ตั้งค่า environment variables:
```bash
cp .env.example .env
# แก้ไข .env ตามต้องการ
```

3. รัน database migrations:
```bash
npm run migrate
```

4. รัน tests:
```bash
npm test
```

## Notes

- Unit tests ใช้ mocks สำหรับ dependencies
- Integration tests ต้องมี database connection
- Validation script ใช้ข้อมูลจริงจาก database
- ทุก tests ควรรันผ่านก่อน commit code

