-- SQL script สำหรับ reset database
-- ใช้เมื่อต้องการลบ tables ทั้งหมดและเริ่มใหม่

-- Drop schema และสร้างใหม่
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Grant permissions
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Note: หลังจากรัน script นี้ ให้รัน migrations ใหม่
-- npm run migrate

