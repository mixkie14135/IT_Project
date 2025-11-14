const path = require('path');
const fs = require('fs');

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads'); // <root project>/uploads
const SLIP_DIR    = path.join(UPLOAD_ROOT, 'slips');
const ROOM_DIR    = path.join(UPLOAD_ROOT, 'rooms'); 

// สร้าง folder แค่ตอน local development
if (process.env.NODE_ENV !== 'production') {
  fs.mkdirSync(UPLOAD_ROOT, { recursive: true });
  fs.mkdirSync(SLIP_DIR, { recursive: true });
  fs.mkdirSync(ROOM_DIR, { recursive: true });
}

module.exports = { UPLOAD_ROOT, SLIP_DIR, ROOM_DIR };
