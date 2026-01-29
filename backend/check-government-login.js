require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function checkGovernmentLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find government user
    const user = await User.findOne({ email: 'government@tenamed.com' });
    if (!user) {
      console.log('❌ Government user not found in database');
      return;
    }
    
    console.log('📧 Government user found:');
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - Username: ${user.username}`);
    console.log(`  - Active: ${user.isActive}`);
    console.log(`  - Approved: ${user.isApproved}`);
    console.log(`  - Status: ${user.status || 'N/A'}`);
    
    // Test password
    const isMatch = await user.comparePassword('TenaMed2024!');
    console.log(`🔍 Password test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);
    
    if (!isMatch) {
      console.log('❌ Password mismatch - government user cannot login');
    } else {
      console.log('✅ Government user credentials are valid');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkGovernmentLogin();
