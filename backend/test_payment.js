const paymentService = require('./services/payment');
require('dotenv').config();

async function run() {
    const receiptId = `rec_test_${Date.now()}`;
    const result = await paymentService.createOrder(100, 'INR', receiptId);
    console.log("Result:", result);
}
run();
