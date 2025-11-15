// api/[...slug].js
const serverless = require('serverless-http');
const app = require('../src/app'); // ปรับ path ถ้า src/app.js อยู่ที่อื่น

module.exports = serverless(app);
