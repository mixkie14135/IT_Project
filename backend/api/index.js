const app = require('../src/app'); // path ตามโครงสร้างของคุณ
const serverless = require('serverless-http');

module.exports = serverless(app);
