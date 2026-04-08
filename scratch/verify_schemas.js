const mongoose = require('mongoose');
const path = require('path');

// Resolve paths relative to this script in scratch/
const Booking = require(path.resolve(__dirname, '../backend/models/Booking'));
const User = require(path.resolve(__dirname, '../backend/models/User'));

console.log('Testing Booking Schema...');
const bookingFields = Object.keys(Booking.schema.paths);
const requiredFields = ['userId', 'mobileNumber', 'name', 'turfId', 'date', 'timeSlot', 'status', 'createdAt'];

requiredFields.forEach(field => {
  if (bookingFields.includes(field)) {
    console.log(`✅ Field '${field}' exists in Booking schema.`);
  } else {
    console.error(`❌ Field '${field}' is MISSING in Booking schema.`);
  }
});

console.log('\nTesting User Schema...');
const userFields = Object.keys(User.schema.paths);
if (userFields.includes('mobileNumber')) {
  console.log(`✅ Field 'mobileNumber' exists in User schema.`);
} else {
  console.error(`❌ Field 'mobileNumber' is MISSING in User schema.`);
}

console.log('\nAll tests completed.');
process.exit(0);
